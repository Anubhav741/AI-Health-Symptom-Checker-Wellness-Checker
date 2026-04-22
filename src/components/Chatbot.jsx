import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Trash2, Bot, Cpu, ChevronDown, Wifi, WifiOff } from 'lucide-react';
import { processChatWithAI, getOllamaStatus } from '../services/api';
import './Chatbot.css';

const INITIAL_MESSAGES = [
  { role: 'assistant', content: 'Hello! I am your AI Medical Assistant.\n\nHow can I help you today?' }
];

const SUGGESTED_QUESTIONS = [
  "Explain my condition",
  "What are possible causes?",
  "What should I do next?",
  "When should I see a doctor?"
];

const MODEL_OPTIONS = [
  { value: 'Qwen/Qwen2.5-7B-Instruct', label: 'Qwen 2.5 (7B) Instruct' }
];

const Chatbot = ({ results, formData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('Qwen/Qwen2.5-7B-Instruct');
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState({ running: null, models: [] }); // null = checking
  const [streamingText, setStreamingText] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const statusIntervalRef = useRef(null);

  // Poll Ollama status
  const checkStatus = useCallback(async () => {
    const status = await getOllamaStatus();
    setOllamaStatus(status);
    // Auto-select best available model
    if (status.models && status.models.length > 0) {
      const preferred = status.models.find(m => m.includes('Qwen')) || status.models[0];
      setSelectedModel(preferred);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    statusIntervalRef.current = setInterval(checkStatus, 15000);
    return () => clearInterval(statusIntervalRef.current);
  }, [checkStatus]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading, streamingText]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async (text = inputValue) => {
    if (!text.trim() || loading) return;

    const newMessages = [
      ...messages,
      { role: 'user', content: text }
    ];

    setMessages(newMessages);
    setInputValue('');
    setLoading(true);
    setStreamingText('');

    try {
      const contextStr = results ? {
        patientInfo: formData,
        analysis: {
          condition: results.topCondition || (results.conditions && results.conditions[0]?.name) || (results.conditions && results.conditions[0]?.condition),
          severity: results.severity,
          recommendations: results.recommendations
        }
      } : null;

      let finalReply = '';

      finalReply = await processChatWithAI(
        text,
        newMessages,
        contextStr,
        selectedModel,
        (partialText) => {
          setStreamingText(partialText);
        }
      );

      setStreamingText('');
      setMessages([
        ...newMessages,
        { role: 'assistant', content: finalReply }
      ]);
    } catch (err) {
      setStreamingText('');
      setMessages([
        ...newMessages,
        { role: 'assistant', content: '⚠️ AI assistant temporarily unavailable. Check backend logs and Hugging Face API token settings.' }
      ]);
    }

    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages(INITIAL_MESSAGES);
    setStreamingText('');
  };

  const getStatusColor = () => {
    if (ollamaStatus.running === null) return '#94a3b8'; // checking
    return ollamaStatus.running ? '#22c55e' : '#f43f5e';
  };

  const getStatusLabel = () => {
    if (ollamaStatus.running === null) return 'Checking...';
    if (ollamaStatus.running) return 'AI Service Online';
    return 'AI Service Offline';
  };

  // Available models from backend or fallback
  const availableModels = ollamaStatus.models.length > 0
    ? ollamaStatus.models.map(m => ({ value: m, label: m }))
    : MODEL_OPTIONS;

  if (!isOpen) {
    return (
      <button className="chatbot-toggle-btn" onClick={() => setIsOpen(true)} title="Open Local AI Medical Assistant">
        <Bot size={28} />
        <span className="chatbot-indicator" style={{ backgroundColor: getStatusColor() }}></span>
      </button>
    );
  }

  return (
    <div className="chatbot-window glass-panel">
      {/* Header */}
      <div className="chatbot-header">
        <div className="chatbot-header-title">
          <Bot size={20} className="chatbot-icon-active" />
          <div className="chatbot-title-stack">
            <span className="chatbot-title-main">Local Medical AI</span>
            <span className="chatbot-title-sub" style={{ color: getStatusColor() }}>
              {ollamaStatus.running
                ? <><Wifi size={10} style={{ display: 'inline', marginRight: 3 }} />{getStatusLabel()}</>
                : <><WifiOff size={10} style={{ display: 'inline', marginRight: 3 }} />{getStatusLabel()}</>
              }
            </span>
          </div>
        </div>
        <div className="chatbot-header-actions">
          <button onClick={clearChat} title="Clear Chat" className="chatbot-icon-btn"><Trash2 size={15} /></button>
          <button onClick={() => setIsOpen(false)} title="Close" className="chatbot-icon-btn"><X size={18} /></button>
        </div>
      </div>

      {/* AI Service Offline Banner */}
      {ollamaStatus.running === false && (
        <div className="ollama-offline-banner">
          <WifiOff size={14} />
          <span>AI service is offline. Add <code>HF_API_TOKEN</code> in <code>.env</code> and restart backend.</span>
        </div>
      )}

      {/* Messages */}
      <div className="chatbot-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-bubble-container ${msg.role === 'user' ? 'user-container' : 'bot-container'}`}>
            {msg.role === 'assistant' && (
              <div className="bot-avatar"><Cpu size={12} /></div>
            )}
            <div className={`chat-bubble ${msg.role === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
              <span style={{ whiteSpace: 'pre-line' }}>{msg.content}</span>
            </div>
          </div>
        ))}

        {/* Streaming in-progress bubble */}
        {loading && streamingText && (
          <div className="chat-bubble-container bot-container">
            <div className="bot-avatar"><Cpu size={12} /></div>
            <div className="chat-bubble bot-bubble streaming-bubble">
              <span style={{ whiteSpace: 'pre-line' }}>{streamingText}</span>
              <span className="stream-cursor">▌</span>
            </div>
          </div>
        )}

        {/* Dots loader (before first token arrives) */}
        {loading && !streamingText && (
          <div className="chat-bubble-container bot-container">
            <div className="bot-avatar"><Cpu size={12} /></div>
            <div className="chat-bubble bot-bubble typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      <div className="chatbot-suggestions">
        {SUGGESTED_QUESTIONS.map((sq, i) => (
          <button key={i} className="suggestion-chip" onClick={() => handleSend(sq)} disabled={loading}>
            {sq}
          </button>
        ))}
      </div>

      {/* Model Selector + Input */}
      <div className="chatbot-toolbar">
        <div className="model-selector" onClick={() => setModelMenuOpen(o => !o)}>
          <Cpu size={12} />
          <span>{availableModels.find(m => m.value === selectedModel)?.label || selectedModel}</span>
          <ChevronDown size={12} className={modelMenuOpen ? 'chevron-open' : ''} />
          {modelMenuOpen && (
            <div className="model-dropdown">
              {availableModels.map(m => (
                <button
                  key={m.value}
                  className={`model-option ${selectedModel === m.value ? 'model-option-active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setSelectedModel(m.value); setModelMenuOpen(false); }}
                >
                  {m.label}
                  {selectedModel === m.value && <span className="model-check">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="toolbar-divider" />
        <span className="toolbar-hint">Hugging Face Inference</span>
      </div>

      <div className="chatbot-input-area">
        <input
          ref={inputRef}
          type="text"
          className="chatbot-input"
          placeholder={ollamaStatus.running === false ? 'Configure HF_API_TOKEN first...' : 'Ask a medical question...'}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={loading}
        />
        <button
          className="chatbot-send-btn"
          onClick={() => handleSend()}
          disabled={!inputValue.trim() || loading}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
