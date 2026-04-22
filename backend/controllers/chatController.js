const HF_API_URL = process.env.HF_API_URL || 'https://router.huggingface.co/v1/chat/completions';
const DEFAULT_MODEL = process.env.HF_MODEL_ID || 'Qwen/Qwen2.5-7B-Instruct';
const DEFAULT_MAX_TOKENS = Number(process.env.HF_MAX_NEW_TOKENS || 600);
const DEFAULT_TEMPERATURE = Number(process.env.HF_TEMPERATURE || 0.4);

// Keep API shape unchanged for frontend compatibility.
export const getOllamaStatus = async (req, res) => {
  const hasToken = Boolean(process.env.HF_API_TOKEN);
  return res.status(200).json({
    running: hasToken,
    models: [DEFAULT_MODEL]
  });
};

const buildPrompt = (message, history, context) => {
  let contextStr = 'No recent patient data submitted.';
  if (context) {
    contextStr = `
User Medical Context:
- Symptoms: ${context.patientInfo?.symptoms || 'Unknown'}
- Conditions: ${context.analysis?.condition || 'Unknown'}
- Severity: ${context.analysis?.severity || 'Unknown'}
`;
  }

  let historyStr = '';
  if (history && Array.isArray(history) && history.length > 1) {
    const recent = history.slice(-6);
    historyStr = '\nConversation History:\n' + recent.map(m =>
      `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
    ).join('\n') + '\n';
  }

  return `Use RCIO framework to answer as a careful medical information assistant.

R - Role:
You are a medical guidance assistant for educational support. Do not provide definitive diagnosis.

C - Context:
${contextStr}
${historyStr}

I - Intent:
User asks: ${message}
Goal is to provide accurate, practical next steps and triage guidance.

O - Output constraints:
Return clear markdown with exactly these sections:
1) Understanding
2) Possible Causes (ranked, with uncertainty words like "possible")
3) What To Do Now (short actionable bullets)
4) When To See A Doctor (red flags + urgency)
5) Safety Note (1 line: informational, not a substitute for a doctor)

Extra Rules:
- Answer ONLY health-related questions.
- Keep language simple and concise.
- If details are missing, ask up to 2 targeted follow-up questions at the end.
- Never claim certainty without tests.
`;
};

const createHfPayload = (model, fullPrompt, stream) => ({
  model: model || DEFAULT_MODEL,
  messages: [
    {
      role: 'system',
      content:
        'You are a careful medical information assistant. You provide educational guidance only, avoid diagnosis certainty, and encourage professional care when needed.'
    },
    { role: 'user', content: fullPrompt }
  ],
  max_tokens: DEFAULT_MAX_TOKENS,
  temperature: DEFAULT_TEMPERATURE,
  stream
});

export const chatWithAI = async (req, res) => {
  try {
    const { message, history, context, model = DEFAULT_MODEL, stream = false } = req.body;
    const hfToken = process.env.HF_API_TOKEN;

    if (!hfToken) {
      return res.status(200).json({
        reply: '⚠️ Hugging Face API token missing. Set HF_API_TOKEN in .env and restart backend.'
      });
    }

    const fullPrompt = buildPrompt(message, history, context);

    // --- Streaming Mode (SSE) ---
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

      const hfRes = await fetch(HF_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${hfToken}`
        },
        body: JSON.stringify(createHfPayload(model, fullPrompt, true)),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!hfRes.ok) {
        res.write(`data: ${JSON.stringify({ error: true, token: '⚠️ AI model unavailable right now. Please try again.' })}\n\n`);
        return res.end();
      }

      const reader = hfRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payload);
            const token = parsed?.choices?.[0]?.delta?.content || '';
            if (token) res.write(`data: ${JSON.stringify({ token, done: false })}\n\n`);
          } catch {
            // Ignore malformed stream chunks and continue.
          }
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return res.end();
    }

    // --- Non-Streaming Mode ---
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hfToken}`
      },
      body: JSON.stringify(createHfPayload(model, fullPrompt, false)),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(200).json({
        reply: `⚠️ Model "${model}" error (${response.status}). Verify HF_API_TOKEN and HF_MODEL_ID.`
      });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || '⚠️ Empty response from AI model.';
    res.status(200).json({ reply });

  } catch (error) {
    console.error('AI Chat Error:', error);
    if (error.name === 'AbortError') {
      return res.status(200).json({ reply: '⏳ AI took too long to respond. Try a shorter question or a faster model.' });
    }
    res.status(200).json({ reply: '⚠️ AI assistant temporarily unavailable (Backend proxy error)' });
  }
};
