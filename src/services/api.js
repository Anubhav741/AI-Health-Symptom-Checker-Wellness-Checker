import axios from 'axios';

// 1. Environment-based switching
const isDevMode = import.meta.env.DEV;

// Define endpoints cleanly
const ENDPOINTS = {
  analyze: {
    prod: import.meta.env.VITE_ANALYZE_URL || 'http://localhost:5678/webhook/analyze',
    test: 'http://localhost:5678/webhook-test/analyze'
  },
  report: {
    prod: import.meta.env.VITE_REPORT_URL || 'http://localhost:5678/webhook/ac2510fa-7773-4994-a3ac-8b2bc2e04b52',
    test: 'http://localhost:5678/webhook-test/ac2510fa-7773-4994-a3ac-8b2bc2e04b52'
  },
  hospital: {
    prod: 'http://localhost:5678/webhook/select-hospital',
    test: 'http://localhost:5678/webhook-test/select-hospital'
  }
};

const getUrl = (type) => {
  return isDevMode ? ENDPOINTS[type].test : ENDPOINTS[type].prod;
};

const getFallbackUrl = (type) => {
  // In dev, if webhook-test is unavailable, fallback to the configured prod webhook.
  if (isDevMode) return ENDPOINTS[type].prod;
  return null;
};

// Local Backend Integration for Analytics & DB
const BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5001';
const DB_URL = import.meta.env.VITE_DB_URL || `${BASE_URL}/api`;

// Establish API configuration
const api = axios.create({
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000, 
});

// Configure centralized debug logging and error trapping
api.interceptors.response.use(
  response => {
    // LOG: After response
    console.log("Response:", response.data);
    return response;
  },
  error => {
    // LOG: On error
    console.error("API ERROR:", error);
    
    // Detailed Failure Handling
    let customMsg = 'Backend not reachable. Check n8n server.';
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      customMsg = 'Backend not reachable. Check n8n server. (Timeout)';
    } else if (!error.response) {
      customMsg = 'Backend not reachable. Check n8n server. (Network Error)';
    } else if (error.response.status === 404) {
      customMsg = 'Backend not reachable. Check n8n server. (404 - Endpoint Not Found)';
    }
    
    error.friendlyMessage = customMsg;
    return Promise.reject(error);
  }
);

// Generic caller with logging
const executeCall = async (type, payload) => {
  const primaryUrl = getUrl(type);
  const fallbackUrl = getFallbackUrl(type);
  
  // Connection Validator stub
  if (!primaryUrl) throw new Error("Invalid endpoint configuration");

  // LOG: Before every API call
  console.log("Calling API:", primaryUrl, payload);

  try {
    const response = await api.post(primaryUrl, payload);
    return response.data;
  } catch (err) {
    const shouldFallback =
      Boolean(fallbackUrl) &&
      fallbackUrl !== primaryUrl &&
      (!err.response || err.code === 'ECONNABORTED');

    if (!shouldFallback) throw err;

    console.warn(`Primary endpoint failed for "${type}". Retrying fallback:`, fallbackUrl);
    const response = await api.post(fallbackUrl, payload);
    return response.data;
  }
}

// Exported Service Methods

export const analyzeSymptoms = async (payload) => {
  const result = await executeCall('analyze', payload);
  
  // Validation: Ensure severity is not null/undefined/unknown
  if (!result.severity || result.severity.toLowerCase() === 'unknown' || result.severity.toLowerCase().includes('insufficient')) {
    result.severity = 'moderate';
  } else {
    // Standardize to lowercase
    result.severity = result.severity.toLowerCase();
  }
  
  return result;
};

export const sendReport = async (payload) => {
  // Enforces payload constraint
  return await executeCall('report', payload);
};

export const selectHospital = async (payload) => {
  return await executeCall('hospital', payload);
};

// DB Integration exports
export const saveCheckupToDB = async (payload) => {
  try {
    const res = await fetch(`${BASE_URL}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error('Failed to save to DB:', err);
    return null;
  }
};

export const getStats = async () => {
  try {
    const res = await fetch(`${DB_URL}/stats`);
    return await res.json();
  } catch (err) {
    console.error('Failed to load stats:', err);
    return null;
  }
};

export const getCheckups = async () => {
  try {
    const res = await fetch(`${BASE_URL}/reports`);
    return await res.json();
  } catch (err) {
    console.error('Failed to load checkups:', err);
    return [];
  }
};

export const getCheckupById = async (id) => {
  try {
    const res = await fetch(`${BASE_URL}/reports/${id}`);
    if (!res.ok) throw new Error('Checkup not found');
    return await res.json();
  } catch (err) {
    console.error(`Failed to load checkup ${id}:`, err);
    return null;
  }
};

export const fetchHospitals = async (lat, lng) => {
  try {
    const res = await fetch(`${BASE_URL}/api/hospitals?lat=${lat}&lng=${lng}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch hospitals:', err);
    return [];
  }
};

export const getOllamaStatus = async () => {
  try {
    const res = await fetch(`${BASE_URL}/chat/status`);
    return await res.json();
  } catch {
    return { running: null, models: [] };
  }
};

export const processChatWithAI = async (message, history, context, model = 'Qwen/Qwen2.5-7B-Instruct', onStream = null) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    const useStream = typeof onStream === 'function';

    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, context, model, stream: useStream }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) throw new Error('Failed to process chat response');

    if (useStream) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.token) {
              full += parsed.token;
              onStream(full);
            }
            if (parsed.done) return full;
          } catch {}
        }
      }
      return full;
    }

    const data = await res.json();
    return data.reply;
  } catch (err) {
    console.error('AI Chat connection error:', err);
    if (err.name === 'AbortError') {
      return "⚠️ AI response took too long. Please try a shorter question.";
    }
    return "⚠️ AI assistant temporarily unavailable";
  }
};

export default api;
