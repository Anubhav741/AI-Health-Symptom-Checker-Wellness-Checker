const HF_API_URL = 'https://router.huggingface.co/v1/chat/completions';
const DEFAULT_MAX_TOKENS = Number(process.env.HF_MAX_NEW_TOKENS || 600);
const DEFAULT_TEMPERATURE = Number(process.env.HF_TEMPERATURE || 0.4);

// Primary model from the user's latest request + fallbacks
const FALLBACK_MODELS = [
  'Qwen/Qwen2.5-1.5B-Instruct:featherless-ai',
  'Qwen/Qwen2.5-7B-Instruct',
  'mistralai/Mistral-7B-Instruct-v0.2',
  'google/gemma-2b-it'
];

export const getOllamaStatus = async (req, res) => {
  const hasToken = Boolean(process.env.HF_API_TOKEN);
  return res.status(200).json({
    running: hasToken,
    models: FALLBACK_MODELS
  });
};

const buildMessagesArray = (message, history, context) => {
  let contextStr = 'No recent patient data submitted.';
  if (context) {
    contextStr = `Recent Patient Data:
Symptoms: ${context.patientInfo?.symptoms || 'Unknown'}
Conditions: ${context.analysis?.condition || 'Unknown'}
Severity: ${context.analysis?.severity || 'Unknown'}`;
  }

  // Proper native chat formatting to prevent repetition loops:
  const messages = [
    {
      role: 'system',
      content: `You are an AI Medical Assistant. Use the following context strictly for educational triage, not diagnosis.
      
${contextStr}

Rules:
1) Answer concisely and politely.
2) Do not claim medical certainty.
3) Answer only health-related queries.`
    }
  ];

  // Map true conversational history rather than formatting into one giant string
  // Note: The frontend explicitly appends the latest user intent inside the `history` array!
  if (history && Array.isArray(history) && history.length > 0) {
    const recent = history.slice(-7); // Keep context window small
    recent.forEach(m => {
      messages.push({ role: m.role, content: String(m.content) });
    });
  } else if (message) {
    // Fallback if history array empty
    messages.push({ role: 'user', content: message });
  }

  return messages;
};

const createHfPayload = (model, messages, stream) => ({
  model: model,
  messages: messages,
  max_tokens: DEFAULT_MAX_TOKENS,
  temperature: DEFAULT_TEMPERATURE,
  stream
});

const delay = ms => new Promise(res => setTimeout(res, ms));

export const chatWithAI = async (req, res) => {
  try {
    const { message, history, context, stream = false } = req.body;
    let requestedModel = req.body.model || FALLBACK_MODELS[0];
    const hfToken = process.env.HF_API_TOKEN;

    if (!hfToken) {
      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.write(`data: ${JSON.stringify({ error: true, token: '⚠️ Hugging Face API token missing.' })}\n\n`);
        return res.end();
      }
      return res.status(200).json({ reply: '⚠️ Hugging Face API token missing.' });
    }

    // Build properly structured history payload 
    const mappedMessages = buildMessagesArray(message, history, context);
    
    // Create precedence list, moving the requested model to front
    const modelsToTry = [requestedModel, ...FALLBACK_MODELS.filter(m => m !== requestedModel)];

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
    }

    // Try models and retries
    for (const currentModel of modelsToTry) {
      // Use the universal router endpoint
      const endpoint = HF_API_URL;
      let retries = 2; // 2 retries per model

      while (retries >= 0) {
        let controller = new AbortController();
        let timeout = setTimeout(() => controller.abort(), 15000); // 15 sec timeout

        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.HF_API_TOKEN}`
            },
            body: JSON.stringify(createHfPayload(currentModel, mappedMessages, stream)),
            signal: controller.signal
          });

          clearTimeout(timeout);

          if (response.ok) {
            if (stream) {
              const reader = response.body.getReader();
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
                    // Ignore malformed
                  }
                }
              }
              res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
              return res.end();
            } else {
              const data = await response.json();
              const reply = data?.choices?.[0]?.message?.content || '⚠️ Empty response from AI model.';
              return res.status(200).json({ reply });
            }
          }
        } catch (err) {
          clearTimeout(timeout);
          // If network error or timeout
        }

        retries--;
        if (retries >= 0) await delay(1000); // 1s wait before retry
      }
    }

    // If we've exhausted all models and all retries
    const fallbackMsg = "AI is currently busy. Please try again in a moment.";
    if (stream) {
      res.write(`data: ${JSON.stringify({ token: fallbackMsg, done: true })}\n\n`);
      return res.end();
    }
    return res.status(200).json({ reply: fallbackMsg });

  } catch (error) {
    console.error('AI Chat Error:', error);
    const fallbackMsg = "AI is currently busy. Please try again in a moment.";
    if (req.body.stream) {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
      }
      res.write(`data: ${JSON.stringify({ token: fallbackMsg, done: true })}\n\n`);
      return res.end();
    }
    res.status(200).json({ reply: fallbackMsg });
  }
};
