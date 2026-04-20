import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Trash2, Bot } from 'lucide-react';
import { processChatWithAI } from '../services/api';
import './Chatbot.css';

const INITIAL_MESSAGES = [
  { role: 'assistant', content: 'Hello! I am your local AI Medical Assistant. How can I help you today?' }
];

const SUGGESTED_QUESTIONS = [
  "Explain my condition",
  "Ask about your report",
  "What should I do next?",
  "When should I see a doctor?"
];

const Chatbot = ({ results, formData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  const handleSend = async (text = inputValue) => {
    if (!text.trim()) return;

    const newMessages = [
      ...messages,
      { role: "user", content: text }
    ];

    setMessages(newMessages);
    setInputValue('');
    setLoading(true);

    try {
      const contextStr = results ? {
        patientInfo: formData,
        analysis: {
          condition: results.topCondition || (results.conditions && results.conditions[0]?.name) || (results.conditions && results.conditions[0]?.condition),
          severity: results.severity,
          recommendations: results.recommendations
        }
      } : null;

      // Notice how we don't pass the whole array, only history if needed. But the prompt template uses plain string format.
      // So history formatting might not matter since the Controller only uses req.body.message. But we're sending it.
      const reply = await processChatWithAI(text, newMessages, contextStr);
      
      setMessages([
        ...newMessages,
        { role: "assistant", content: reply }
      ]);
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "⚠️ AI assistant temporarily unavailable" }
      ]);
    }

    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  const clearChat = () => {
    setMessages(INITIAL_MESSAGES);
  };

  if (!isOpen) {
    return (
      <button className="chatbot-toggle-btn" onClick={() => setIsOpen(true)} title="Open Medical Assistant">
        <Bot size={28} />
        <span className="chatbot-indicator"></span>
      </button>
    );
  }

  return (
    <div className="chatbot-window glass-panel">
      <div className="chatbot-header">
        <div className="chatbot-header-title">
          <Bot size={20} className="chatbot-icon-active" />
          <span>Local Medical AI</span>
        </div>
        <div className="chatbot-header-actions">
          <button onClick={clearChat} title="Clear Chat" className="chatbot-icon-btn"><Trash2 size={16} /></button>
          <button onClick={() => setIsOpen(false)} title="Close" className="chatbot-icon-btn"><X size={20} /></button>
        </div>
      </div>

      <div className="chatbot-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-bubble-container ${msg.role === 'user' ? 'user-container' : 'bot-container'}`}>
            <div className={`chat-bubble ${msg.role === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
              <span style={{whiteSpace: 'pre-line'}}>{msg.content}</span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-bubble-container bot-container">
            <div className="chat-bubble bot-bubble typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatbot-suggestions">
        {SUGGESTED_QUESTIONS.map((sq, i) => (
          <button key={i} className="suggestion-chip" onClick={() => handleSend(sq)} disabled={loading}>
            {sq}
          </button>
        ))}
      </div>

      <div className="chatbot-input-area">
        <input 
          type="text" 
          className="chatbot-input"
          placeholder="Ask a medical question..." 
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
