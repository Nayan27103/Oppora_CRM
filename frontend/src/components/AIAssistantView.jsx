import React, { useState } from 'react';
import { api } from '../api';
import { Send, Sparkles, MessageSquare, ListTodo, Copy, Check } from 'lucide-react';

export default function AIAssistantView() {
  // Chat State
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hello! I am your Oppora CRM Assistant. I can answer questions about your Qualified Leads, Deals, and overall Pipeline. Ask me anything!' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  // Notes State
  const [notesInput, setNotesInput] = useState('');
  const [actionItems, setActionItems] = useState('');
  const [convertingNotes, setConvertingNotes] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || sendingChat) return;

    const userText = inputMessage;
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setSendingChat(true);

    try {
      const res = await api.aiChat(userText);
      if (res.success) {
        setMessages(prev => [...prev, { role: 'ai', text: res.response }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Error: Failed to fetch response from AI. Make sure your OPENAI_API_KEY is configured in the backend `.env`.' }]);
    } finally {
      setSendingChat(false);
    }
  };

  const handleConvertNotes = async (e) => {
    e.preventDefault();
    if (!notesInput.trim() || convertingNotes) return;

    setConvertingNotes(true);
    setActionItems('');
    try {
      const res = await api.convertMeetingNotes(notesInput);
      if (res.success) {
        setActionItems(res.notes);
      }
    } catch (err) {
      alert(err.data?.message || 'Failed to convert meeting notes');
    } finally {
      setConvertingNotes(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(actionItems);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)' }}>AI Assistant Hub</h1>
        <p style={{ color: 'hsl(var(--text-secondary))' }}>Access CRM database insights and conversion utilities powered by OpenAI</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Left Side: CRM Chat Assistant */}
        <div className="glass-panel chat-container" style={{ padding: '1.25rem', height: 'calc(100vh - 200px)' }}>
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '0.75rem' }}>
            <MessageSquare size={18} style={{ color: 'hsl(var(--color-primary-hover))' }} /> CRM Data Copilot
          </h3>

          <div className="chat-messages" style={{ overflowY: 'auto' }}>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`chat-message ${msg.role === 'user' ? 'chat-message-user' : 'chat-message-ai'}`}
              >
                <span style={{ fontSize: '0.75rem', color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : 'hsl(var(--text-muted))', marginBottom: '4px', fontWeight: '700' }}>
                  {msg.role === 'user' ? 'YOU' : 'OPPORA CO-PILOT'}
                </span>
                <span style={{ whiteSpace: 'pre-line' }}>{msg.text}</span>
              </div>
            ))}
            {sendingChat && (
              <div className="chat-message chat-message-ai" style={{ alignSelf: 'flex-start' }}>
                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginBottom: '4px', fontWeight: '700' }}>OPPORA CO-PILOT</span>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <div className="pulse-indicator" style={{ width: '6px', height: '6px' }}></div>
                  <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>Assistant is thinking...</span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSendChat} className="chat-input-area" style={{ background: 'none' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Ask about qualified leads, active deals, pipeline value..."
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              disabled={sendingChat}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem' }} disabled={sendingChat || !inputMessage.trim()}>
              <Send size={18} />
            </button>
          </form>
        </div>

        {/* Right Side: Meeting Transcript to Todo Utility */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ListTodo size={18} style={{ color: 'hsl(var(--color-warning))' }} /> Meeting Action Items Extractor
            </h3>
            
            <form onSubmit={handleConvertNotes}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Paste Transcript / Notes</label>
                <textarea
                  className="form-input"
                  rows={6}
                  placeholder="Paste raw conversation notes here (e.g. 'John agreed to follow up by Friday, Jane will check with the development team and send the invoice...')"
                  value={notesInput}
                  onChange={e => setNotesInput(e.target.value)}
                  required
                ></textarea>
              </div>
              <button type="submit" className="btn btn-secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }} disabled={convertingNotes || !notesInput.trim()}>
                <Sparkles size={16} /> {convertingNotes ? 'Extracting...' : 'Convert to Action Items'}
              </button>
            </form>

            {actionItems && (
              <div style={{ marginTop: '1.5rem', background: 'hsl(var(--bg-base))', border: '1px solid hsl(var(--border-color))', padding: '1.25rem', borderRadius: 'var(--radius-md)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'hsl(var(--color-success))' }}>Action Items Extracted</span>
                  <button onClick={copyToClipboard} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-secondary))', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                    {copied ? <Check size={14} style={{ color: 'hsl(var(--color-success))' }} /> : <Copy size={14} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', whiteSpace: 'pre-line', lineHeight: '1.4' }}>
                  {actionItems}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
