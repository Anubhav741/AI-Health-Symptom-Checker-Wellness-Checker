import { exec } from 'child_process';

// Helper to check if Ollama is running
const pingOllama = async () => {
  try {
    const res = await fetch('http://localhost:11434/api/tags');
    return res.ok;
  } catch (e) {
    return false;
  }
};

export const chatWithAI = async (req, res) => {
  try {
    const { message, history, context } = req.body;
    
    // Auto Ollama Detection
    const isRunning = await pingOllama();
    
    if (!isRunning) {
      console.log('Ollama is not running. Attempting to start...');
      exec('ollama serve', (error) => {
        if (error) console.error('Failed to auto-start Ollama:', error);
      });
      return res.status(200).json({ reply: "AI service is starting, please wait..." });
    }

    // Construct Context String
    let contextStr = 'No recent patient data submitted.';
    if (context) {
      contextStr = `
User Medical Context:
- Symptoms: ${context.patientInfo?.symptoms || 'Unknown'}
- Conditions: ${context.analysis?.condition || 'Unknown'}
- Severity: ${context.analysis?.severity || 'Unknown'}
`;
    }

    // Build conversation history string (last 6 messages for context window efficiency)
    let historyStr = '';
    if (history && Array.isArray(history) && history.length > 1) {
      const recent = history.slice(-6);
      historyStr = '\nConversation History:\n' + recent.map(m => 
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
      ).join('\n') + '\n';
    }

    const fullPrompt = `
You are a professional AI medical assistant.

- Answer ONLY medical queries
- Be structured and helpful
- Provide:
  1. Understanding
  2. Possible causes
  3. Recommendations
  4. When to see a doctor

${contextStr}
${historyStr}
User Question:
${message}

Answer accordingly as a medical assistant.
`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3',
        prompt: fullPrompt,
        stream: false
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(200).json({ reply: `⚠️ AI assistant temporarily unavailable (Local API error: ${response.status})` });
    }

    const data = await response.json();
    res.status(200).json({ reply: data.response });
    
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(200).json({ reply: '⚠️ AI assistant temporarily unavailable (Backend proxy error)' });
  }
};
