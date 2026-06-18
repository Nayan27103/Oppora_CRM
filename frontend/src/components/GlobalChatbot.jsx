import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api';
import { MessageSquare, Send, X, Sparkles, Bot, User, Loader2 } from 'lucide-react';

// Safe, lightweight Markdown parser for chat messages
const parseMarkdown = (text) => {
  if (!text) return "";
  
  // Escape HTML characters to prevent XSS
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Italic: *text* or _text_
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.*?)_/g, "<em>$1</em>");

  // Inline Code: `code`
  html = html.replace(/`(.*?)`/g, "<code style='background: rgba(124, 58, 237, 0.15); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.88em; color: #D0BCFF;'>$1</code>");

  // Split into lines for list/header parsing
  const lines = html.split('\n');
  let inList = false;
  const processedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Headers: ### text, ## text, # text
    if (line.startsWith('### ')) {
      if (inList) { processedLines.push('</ul>'); inList = false; }
      processedLines.push(`<h4 style='font-size: 0.92rem; font-weight: 700; margin-top: 10px; margin-bottom: 5px; color: hsl(var(--color-primary-hover));'>${line.substring(4)}</h4>`);
    } else if (line.startsWith('## ')) {
      if (inList) { processedLines.push('</ul>'); inList = false; }
      processedLines.push(`<h3 style='font-size: 0.98rem; font-weight: 700; margin-top: 12px; margin-bottom: 6px; color: hsl(var(--color-primary-hover));'>${line.substring(3)}</h3>`);
    } else if (line.startsWith('# ')) {
      if (inList) { processedLines.push('</ul>'); inList = false; }
      processedLines.push(`<h2 style='font-size: 1.05rem; font-weight: 700; margin-top: 14px; margin-bottom: 8px; color: hsl(var(--color-primary-hover));'>${line.substring(2)}</h2>`);
    }
    // Bullet list items: - item or * item
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        processedLines.push("<ul style='margin-left: 1.25rem; margin-top: 6px; margin-bottom: 6px; list-style-type: disc; display: flex; flex-direction: column; gap: 4px;'>");
        inList = true;
      }
      processedLines.push(`<li>${line.substring(2)}</li>`);
    } 
    // Normal paragraph lines
    else {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      if (line === '') {
        processedLines.push('<div style="height: 6px;"></div>');
      } else {
        processedLines.push(`<p style='margin-bottom: 6px;'>${line}</p>`);
      }
    }
  }

  if (inList) {
    processedLines.push('</ul>');
  }

  return processedLines.join('');
};

export default function GlobalChatbot({ activeOrg, userRole }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! I am your Oppora CRM AI Assistant. Ask me anything about contacts, leads, deals, or workflows in your active workspace!'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestions = [
    "Who are the team members?",
    "What is my role in this organization?",
    "List all contacts",
    "Show me a summary of active leads"
  ];

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Reset chat when active workspace changes
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Hi! I am your Oppora CRM AI Assistant. Ask me anything about contacts, leads, deals, or workflows inside the **${activeOrg?.name || 'selected'}** workspace!`
      }
    ]);
  }, [activeOrg]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;
    if (!activeOrg) {
      alert("Please select an active workspace organization first.");
      return;
    }

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.aiChat(userMsg.content);
      if (res.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: res.response
          }
        ]);
      } else {
        throw new Error(res.message || 'Failed to generate response');
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please make sure your server is running and try again.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = async (suggestionText) => {
    if (loading || !activeOrg) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: suggestionText
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.aiChat(userMsg.content);
      if (res.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: res.response
          }
        ]);
      } else {
        throw new Error(res.message || 'Failed to generate response');
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please make sure your server is running and try again.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, hsl(var(--color-primary)) 0%, hsl(var(--color-primary-hover)) 100%)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.35), var(--shadow-glow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          className="glass-panel-hover"
          title="Oppora AI Assistant"
        >
          <MessageSquare size={26} />
        </button>
      )}

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '380px',
            height: '560px',
            background: 'hsl(var(--bg-glass))',
            backdropFilter: 'blur(16px)',
            border: '1px solid hsl(var(--border-color))',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg), var(--shadow-glow)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9999,
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '1.25rem',
              background: 'linear-gradient(135deg, hsl(var(--color-primary) / 0.15) 0%, transparent 100%)',
              borderBottom: '1px solid hsl(var(--border-color))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'hsl(var(--color-primary) / 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'hsl(var(--color-primary-hover))',
                }}
              >
                <Sparkles size={16} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '700', margin: 0 }}>Oppora AI Assistant</h3>
                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: '500' }}>
                  Workspace: {activeOrg ? activeOrg.name : 'None Selected'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'hsl(var(--text-secondary))',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages List */}
          <div
            style={{
              flexGrow: 1,
              padding: '1.25rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {messages.map((msg) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    gap: '10px',
                    alignSelf: isAssistant ? 'flex-start' : 'flex-end',
                    flexDirection: isAssistant ? 'row' : 'row-reverse',
                    maxWidth: '85%',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isAssistant ? 'hsl(var(--color-primary) / 0.1)' : 'hsl(var(--color-primary))',
                      color: isAssistant ? 'hsl(var(--color-primary-hover))' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {isAssistant ? <Bot size={14} /> : <User size={14} />}
                  </div>
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: isAssistant ? '0px 12px 12px 12px' : '12px 0px 12px 12px',
                      background: isAssistant ? 'hsl(var(--bg-surface))' : 'linear-gradient(135deg, hsl(var(--color-primary)) 0%, hsl(var(--color-primary-hover)) 100%)',
                      color: isAssistant ? 'hsl(var(--text-primary))' : 'white',
                      fontSize: '0.88rem',
                      lineHeight: '1.4',
                      border: isAssistant ? '1px solid hsl(var(--border-color))' : 'none',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    {isAssistant ? (
                      <div dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }} />
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              );
            })}
            {loading && (
              <div style={{ display: 'flex', gap: '10px', alignSelf: 'flex-start' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'hsl(var(--color-primary) / 0.1)',
                    color: 'hsl(var(--color-primary-hover))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Bot size={14} />
                </div>
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '0px 12px 12px 12px',
                    background: 'hsl(var(--bg-surface))',
                    border: '1px solid hsl(var(--border-color))',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'hsl(var(--text-secondary))',
                    fontSize: '0.85rem',
                  }}
                >
                  <Loader2 size={14} className="animate-spin" /> Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions (renders above input if conversation is active/ready) */}
          {activeOrg && !loading && (
            <div style={{ padding: '0.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid hsl(var(--border-color))', background: 'hsl(var(--bg-base) / 0.2)' }}>
              <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Suggested Actions</span>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    style={{
                      background: 'hsl(var(--bg-surface))',
                      border: '1px solid hsl(var(--border-color))',
                      borderRadius: '16px',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      color: 'hsl(var(--color-primary-hover))',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      flexShrink: 0
                    }}
                    className="glass-panel-hover"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={handleSend}
            style={{
              padding: '1rem',
              borderTop: '1px solid hsl(var(--border-color))',
              background: 'hsl(var(--bg-surface))',
              display: 'flex',
              gap: '8px',
            }}
          >
            <input
              type="text"
              className="form-input"
              style={{
                borderRadius: 'var(--radius-md)',
                fontSize: '0.88rem',
                padding: '0.6rem 0.85rem',
                flexGrow: 1,
              }}
              placeholder={!activeOrg ? "Select workspace first..." : "Ask about your data..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || !activeOrg}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                padding: '0 0.85rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              disabled={loading || !input.trim() || !activeOrg}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
