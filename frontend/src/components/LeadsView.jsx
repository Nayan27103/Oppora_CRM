import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Sparkles, Star, FileText, Mail, Activity, ArrowRight, Trash2, Check, X, ChevronRight, HelpCircle, Plus, Copy } from 'lucide-react';

export default function LeadsView({ activeOrg, userRole }) {
  const [leads, setLeads] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  
  // Selected Lead Details
  const [selectedLead, setSelectedLead] = useState(null);

  // AI results
  const [aiScore, setAiScore] = useState(null);
  const [scoringLeadId, setScoringLeadId] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [summarizingLeadId, setSummarizingLeadId] = useState(null);
  const [emailGoal, setEmailGoal] = useState('');
  const [aiEmail, setAiEmail] = useState('');
  const [generatingEmailLeadId, setGeneratingEmailLeadId] = useState(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Attachments State
  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToastMessage = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Form State
  const [newLead, setNewLead] = useState({
    contact: '',
    status: 'NEW',
    category: 'SALES',
    notes: ''
  });
  const [convertData, setConvertData] = useState({
    title: '',
    value: ''
  });
  const [formError, setFormError] = useState('');

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await api.getLeads(statusFilter);
      if (res.success) {
        setLeads(res.data);
        // Retain selection if still in data
        if (selectedLead) {
          const updated = res.data.find(l => l.id === selectedLead.id);
          setSelectedLead(updated || null);
        }
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      // Pull contacts (no search to load list for dropdown)
      const res = await api.getContacts('', 1);
      if (res.success) {
        // Since contacts are paginated, load up to page 1. For a dropdown, let's load what's there
        setContacts(res.data);
      }
    } catch (err) {
      console.error('Error fetching contacts for dropdown:', err);
    }
  };

  const fetchAttachments = async (leadId) => {
    try {
      setAttachmentsLoading(true);
      const res = await api.getAttachments(leadId);
      if (res.success) {
        setAttachments(res.data);
      }
    } catch (err) {
      console.error('Error fetching attachments:', err);
    } finally {
      setAttachmentsLoading(false);
    }
  };

  const handleUploadAttachment = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedLead) return;

    try {
      setUploadingFile(true);
      const res = await api.uploadAttachment(selectedLead.id, file);
      if (res.success) {
        fetchAttachments(selectedLead.id);
        showToastMessage('File uploaded successfully!');
      } else {
        alert(res.message || 'Failed to upload attachment');
      }
    } catch (err) {
      alert(err.data?.message || 'Failed to upload attachment');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;
    try {
      const res = await api.deleteAttachment(attachmentId);
      if (res.success && selectedLead) {
        fetchAttachments(selectedLead.id);
        showToastMessage('Attachment deleted successfully!');
      } else {
        alert(res.message || 'Failed to delete attachment');
      }
    } catch (err) {
      alert(err.data?.message || 'Failed to delete attachment');
    }
  };

  const handleCopyEmail = () => {
    if (!aiEmail) return;
    navigator.clipboard.writeText(aiEmail);
    setCopiedEmail(true);
    showToastMessage('Email copied to clipboard!');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  useEffect(() => {
    if (activeOrg) {
      fetchLeads();
      fetchContacts();
    }
  }, [activeOrg, statusFilter]);

  useEffect(() => {
    if (selectedLead) {
      fetchAttachments(selectedLead.id);
    } else {
      setAttachments([]);
    }
  }, [selectedLead]);

  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!newLead.contact) {
      setFormError('Please select a contact');
      return;
    }

    try {
      setFormError('');
      const res = await api.createLead({
        contact: parseInt(newLead.contact),
        status: newLead.status,
        category: newLead.category,
        notes: newLead.notes,
        score: 0
      });
      if (res.success) {
        setShowCreateModal(false);
        setNewLead({ contact: '', status: 'NEW', category: 'SALES', notes: '' });
        fetchLeads();
        showToastMessage('Lead created successfully!');
      }
    } catch (err) {
      setFormError(err.data?.message || 'Failed to create lead');
    }
  };

  const handleUpdateStatus = async (lead, newStatus) => {
    try {
      const res = await api.updateLead(lead.id, { status: newStatus });
      if (res.success) {
        fetchLeads();
        showToastMessage(`Lead status updated to ${newStatus}`);
      }
    } catch (err) {
      alert(err.data?.message || 'Failed to update lead status');
    }
  };

  const handleUpdateCategory = async (lead, newCategory) => {
    try {
      const res = await api.updateLead(lead.id, { category: newCategory });
      if (res.success) {
        fetchLeads();
        showToastMessage(`Lead category updated to ${newCategory}`);
      }
    } catch (err) {
      alert(err.data?.message || 'Failed to update lead category');
    }
  };

  const handleDeleteLead = async (id) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      const res = await api.deleteLead(id);
      if (res.success) {
        setSelectedLead(null);
        fetchLeads();
        showToastMessage('Lead deleted successfully!');
      }
    } catch (err) {
      alert(err.data?.message || 'Failed to delete lead');
    }
  };

  // AI ACTIONS
  const handleScoreLead = async (leadId) => {
    try {
      setScoringLeadId(leadId);
      setAiScore(null);
      const res = await api.getLeadScore(leadId);
      if (res.success) {
        setAiScore(res.score);
        // Save score back to lead
        const scoreVal = parseInt(res.score) || 0;
        await api.updateLead(leadId, { score: scoreVal });
        fetchLeads();
        showToastMessage('AI Lead Score calculated successfully!');
      }
    } catch (err) {
      alert(err.data?.message || 'Failed to generate AI score');
    } finally {
      setScoringLeadId(null);
    }
  };

  const handleSummarizeLead = async (leadId) => {
    try {
      setSummarizingLeadId(leadId);
      setAiSummary('');
      const res = await api.getLeadSummary(leadId);
      if (res.success) {
        setAiSummary(res.summary);
        showToastMessage('AI Lead Summary generated successfully!');
      }
    } catch (err) {
      alert(err.data?.message || 'Failed to generate AI summary');
    } finally {
      setSummarizingLeadId(null);
    }
  };

  const handleGenerateEmail = async (e) => {
    e.preventDefault();
    if (!selectedLead || !emailGoal) return;

    try {
      setGeneratingEmailLeadId(selectedLead.id);
      setAiEmail('');
      const res = await api.generateSalesEmail(selectedLead.id, emailGoal);
      if (res.success) {
        setAiEmail(res.email);
        showToastMessage('AI Sales Email drafted successfully!');
      }
    } catch (err) {
      alert(err.data?.message || 'Failed to generate AI email');
    } finally {
      setGeneratingEmailLeadId(null);
    }
  };

  // CONVERT LEAD TO DEAL
  const handleConvertLead = async (e) => {
    e.preventDefault();
    if (!selectedLead || !convertData.title || !convertData.value) return;

    try {
      const res = await api.convertLeadToDeal(
        selectedLead.id,
        convertData.title,
        parseFloat(convertData.value)
      );

      if (res.success) {
        setShowConvertModal(false);
        setConvertData({ title: '', value: '' });
        fetchLeads();
        showToastMessage('Lead converted to Deal successfully!');
      }
    } catch (err) {
      alert(err.data?.message || 'Failed to convert lead to deal');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)' }}>Lead Management</h1>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>Track opportunities, calculate AI lead scores, and draft emails</p>
        </div>
        {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
          <button className="btn btn-primary" onClick={() => {
            setFormError('');
            setShowCreateModal(true);
          }}>
            <Plus size={16} /> New Lead
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { label: 'All Statuses', value: '' },
          { label: 'New', value: 'NEW' },
          { label: 'Contacted', value: 'CONTACTED' },
          { label: 'Qualified', value: 'QUALIFIED' },
          { label: 'Proposal', value: 'PROPOSAL' },
          { label: 'Won', value: 'WON' },
          { label: 'Lost', value: 'LOST' }
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className="btn btn-secondary btn-sm"
            style={{
              background: statusFilter === tab.value ? 'hsl(var(--color-primary))' : 'hsl(var(--bg-surface))',
              color: statusFilter === tab.value ? 'white' : 'hsl(var(--text-primary))',
              borderColor: statusFilter === tab.value ? 'hsl(var(--color-primary))' : 'hsl(var(--border-color))',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '2rem', alignItems: 'start' }}>
        {/* Left Side: Leads List */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Active Leads ({leads.length})</h3>

          {loading ? (
            <p style={{ color: 'hsl(var(--text-secondary))' }}>Loading leads...</p>
          ) : leads.length === 0 ? (
            <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>No leads match this filter.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {leads.map((lead) => {
                const isSelected = selectedLead && selectedLead.id === lead.id;
                return (
                  <div
                    key={lead.id}
                    onClick={() => {
                      setSelectedLead(lead);
                      setAiScore(null);
                      setAiSummary('');
                      setAiEmail('');
                      setEmailGoal('');
                    }}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'hsl(var(--bg-surface-hover))' : 'hsl(var(--bg-surface))',
                      border: `1px solid ${isSelected ? 'hsl(var(--color-primary))' : 'hsl(var(--border-color))'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    className={!isSelected ? 'glass-panel-hover' : ''}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{lead.contact_name || `Contact #${lead.contact}`}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span className={`badge ${
                          lead.status === 'WON' ? 'badge-success' : lead.status === 'LOST' ? 'badge-danger' : 'badge-primary'
                        }`}>
                          {lead.status}
                        </span>
                        {lead.category && (
                          <span className="badge" style={{ background: 'hsl(var(--color-primary) / 0.15)', color: 'hsl(var(--color-primary-hover))', fontSize: '0.7rem' }}>
                            {lead.category}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>
                        Created: {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'N/A'}
                      </span>
                      {lead.score > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'hsl(var(--color-warning) / 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                          <Star size={12} style={{ fill: 'hsl(var(--color-warning))', color: 'hsl(var(--color-warning))' }} />
                          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'hsl(var(--color-warning))' }}>Score: {lead.score}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Lead details & AI panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {selectedLead ? (
            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem' }}>{selectedLead.contact_name}</h2>
                  <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem' }}>Lead Details</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectedLead.status !== 'WON' && selectedLead.status !== 'LOST' && (userRole === 'ADMIN' || userRole === 'MANAGER') && (
                    <button className="btn btn-primary btn-sm" onClick={() => {
                      setConvertData({ title: `${selectedLead.contact_name} - Deal`, value: '5000' });
                      setShowConvertModal(true);
                    }}>
                      Convert to Deal <ArrowRight size={14} />
                    </button>
                  )}
                  {userRole === 'ADMIN' && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteLead(selectedLead.id)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Status Picker, Category & Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label className="form-label">Update Status</label>
                  {userRole !== 'MEMBER' ? (
                    <select
                      className="form-select"
                      value={selectedLead.status}
                      onChange={e => handleUpdateStatus(selectedLead, e.target.value)}
                    >
                      <option value="NEW">New</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="QUALIFIED">Qualified</option>
                      <option value="PROPOSAL">Proposal</option>
                      <option value="WON">Won</option>
                      <option value="LOST">Lost</option>
                    </select>
                  ) : (
                    <div style={{ padding: '0.5rem 0.75rem', background: 'hsl(var(--bg-base) / 0.5)', borderRadius: 'var(--radius-md)', border: '1px solid hsl(var(--border-color))', fontSize: '0.9rem', fontWeight: '500' }}>
                      {selectedLead.status}
                    </div>
                  )}
                </div>
                <div>
                  <label className="form-label">Category</label>
                  {userRole !== 'MEMBER' ? (
                    <select
                      className="form-select"
                      value={selectedLead.category || 'SALES'}
                      onChange={e => handleUpdateCategory(selectedLead, e.target.value)}
                    >
                      <option value="IT">IT</option>
                      <option value="SALES">Sales</option>
                      <option value="HOSPITAL">Hospital</option>
                      <option value="RESTAURANTS">Restaurants</option>
                      <option value="OTHER">Other</option>
                    </select>
                  ) : (
                    <div style={{ padding: '0.5rem 0.75rem', background: 'hsl(var(--bg-base) / 0.5)', borderRadius: 'var(--radius-md)', border: '1px solid hsl(var(--border-color))', fontSize: '0.9rem', fontWeight: '500' }}>
                      {selectedLead.category || 'SALES'}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <span className="form-label">Lead Score</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: selectedLead.score > 70 ? 'hsl(var(--color-success))' : selectedLead.score > 40 ? 'hsl(var(--color-warning))' : 'hsl(var(--text-primary))' }}>
                    {selectedLead.score > 0 ? `${selectedLead.score} / 100` : 'Not Scored'}
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Notes & Details</label>
                <div style={{ background: 'hsl(var(--bg-surface))', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid hsl(var(--border-color))', minHeight: '60px', color: 'hsl(var(--text-secondary))' }}>
                  {selectedLead.notes || 'No notes added to this lead.'}
                </div>
              </div>

              {/* Attachments Section */}
              <div className="form-group" style={{ marginBottom: '2rem', borderTop: '1px solid hsl(var(--border-color))', paddingTop: '1.5rem' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span>Attachments</span>
                  {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
                    <label 
                      htmlFor="attachment-file-input" 
                      className="btn btn-secondary btn-sm" 
                      style={{ margin: 0, padding: '0.25rem 0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      {uploadingFile ? 'Uploading...' : <><Plus size={14} /> Add File</>}
                    </label>
                  )}
                  {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
                    <input 
                      type="file" 
                      id="attachment-file-input" 
                      onChange={handleUploadAttachment} 
                      disabled={uploadingFile} 
                      style={{ display: 'none' }} 
                    />
                  )}
                </label>

                {attachmentsLoading ? (
                  <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>Loading files...</p>
                ) : attachments.length === 0 ? (
                  <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem', fontStyle: 'italic' }}>No files attached to this lead.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'hsl(var(--bg-surface))', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid hsl(var(--border-color))' }}>
                    {attachments.map((att) => {
                      const fileName = att.file ? att.file.split('/').pop() : 'Attachment';
                      const fileUrl = att.file ? (att.file.startsWith('http') ? att.file : `http://localhost:8000${att.file}`) : '#';
                      return (
                        <div key={att.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: 'var(--radius-sm)', background: 'hsl(var(--bg-base) / 0.4)' }}>
                          <a 
                            href={fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            download={fileName}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'hsl(var(--color-primary-hover))', fontSize: '0.88rem', textDecoration: 'none', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}
                            title="Click to view file"
                          >
                            <FileText size={16} style={{ flexShrink: 0 }} />
                            <span>{fileName}</span>
                          </a>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>
                              {att.uploaded_at ? new Date(att.uploaded_at).toLocaleDateString() : ''}
                            </span>
                            {userRole === 'ADMIN' && (
                              <button 
                                onClick={() => handleDeleteAttachment(att.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--color-danger))', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px', borderRadius: '4px', transition: 'all 0.2s ease' }}
                                className="glass-panel-hover"
                                title="Delete Attachment"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* AI Assistant Toolkit Section */}
              {userRole !== 'MEMBER' && (
                <div style={{ borderTop: '1px solid hsl(var(--border-color))', paddingTop: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'hsl(var(--color-primary-hover))' }}>
                    <Sparkles size={18} /> AI Sales Copilot
                  </h3>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleScoreLead(selectedLead.id)}
                      disabled={scoringLeadId === selectedLead.id}
                    >
                      {scoringLeadId === selectedLead.id ? 'Scoring...' : 'Calculate Lead Score'}
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleSummarizeLead(selectedLead.id)}
                      disabled={summarizingLeadId === selectedLead.id}
                    >
                      {summarizingLeadId === selectedLead.id ? 'Summarizing...' : 'Summarize Lead'}
                    </button>
                  </div>

                  {/* Score / Summary AI Response */}
                  {aiScore && (
                    <div style={{ background: 'hsl(var(--color-primary) / 0.1)', border: '1px solid hsl(var(--color-primary) / 0.3)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '0.9rem', marginBottom: '4px' }}>AI Lead Score Result:</h4>
                      <p style={{ fontSize: '1.1rem', fontWeight: '700', color: 'hsl(var(--color-primary-hover))' }}>Score: {aiScore}</p>
                    </div>
                  )}

                  {aiSummary && (
                    <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-color))', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                      <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FileText size={14} /> AI Executive Summary
                      </h4>
                      <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.4', whiteSpace: 'pre-line' }}>{aiSummary}</p>
                    </div>
                  )}

                  {/* Sales Email Generator UI */}
                  <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-color))', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Mail size={14} /> Draft Custom Sales Email
                    </h4>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                        placeholder="e.g. Follow up on demo / offer summer discount"
                        value={emailGoal}
                        onChange={e => setEmailGoal(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ height: '36px' }}
                        disabled={generatingEmailLeadId === selectedLead.id || !emailGoal.trim()}
                        onClick={() => handleGenerateEmail(selectedLead.id)}
                      >
                        Draft
                      </button>
                    </div>

                    {aiEmail && (
                      <div style={{ marginTop: '1rem', border: '1px solid hsl(var(--border-color))', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                        <div style={{ padding: '0.5rem 1rem', background: 'hsl(var(--bg-surface-hover))', borderBottom: '1px solid hsl(var(--border-color))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'hsl(var(--text-secondary))' }}>Drafted Email</span>
                          <button 
                            onClick={handleCopyEmail}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-secondary))', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: '600', padding: '4px 8px', borderRadius: '4px', transition: 'all 0.2s ease' }}
                            className="glass-panel-hover"
                            title="Copy to Clipboard"
                          >
                            {copiedEmail ? <><Check size={14} style={{ color: 'hsl(var(--color-success))' }} /> Copied</> : <><Copy size={14} /> Copy</>}
                          </button>
                        </div>
                        <div style={{ padding: '1rem', background: 'hsl(var(--bg-base))' }}>
                          <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', whiteSpace: 'pre-line', fontFamily: 'monospace' }}>
                            {aiEmail}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '3rem 0', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
              <ChevronRight size={36} style={{ transform: 'rotate(90deg)', opacity: 0.4, marginBottom: '8px' }} />
              <p>Select a lead from the list to view copilot details</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Lead Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create Lead</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-secondary))' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateLead}>
              <div className="modal-body">
                {formError && (
                  <div style={{ background: 'hsl(var(--color-danger) / 0.1)', padding: '10px', borderRadius: 'var(--radius-sm)', color: 'hsl(var(--color-danger))', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    {formError}
                  </div>
                )}
                
                <div className="form-group">
                  <label className="form-label">Contact</label>
                  {contacts.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'hsl(var(--color-danger))' }}>
                      No contacts available. Please create a contact in the Contacts tab first.
                    </p>
                  ) : (
                    <select
                      className="form-select"
                      value={newLead.contact}
                      onChange={e => setNewLead({ ...newLead, contact: e.target.value })}
                      required
                    >
                      <option value="">-- Select Contact --</option>
                      {contacts.map(c => (
                        <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.email})</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Status</label>
                  <select
                    className="form-select"
                    value={newLead.status}
                    onChange={e => setNewLead({ ...newLead, status: e.target.value })}
                  >
                    <option value="NEW">New</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="QUALIFIED">Qualified</option>
                    <option value="PROPOSAL">Proposal</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Lead Category</label>
                  <select
                    className="form-select"
                    value={newLead.category}
                    onChange={e => setNewLead({ ...newLead, category: e.target.value })}
                  >
                    <option value="IT">IT</option>
                    <option value="SALES">Sales</option>
                    <option value="HOSPITAL">Hospital</option>
                    <option value="RESTAURANTS">Restaurants</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-input"
                    rows={4}
                    value={newLead.notes}
                    onChange={e => setNewLead({ ...newLead, notes: e.target.value })}
                    placeholder="Enter any initial details about this opportunity..."
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={contacts.length === 0}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert Lead to Deal Modal */}
      {showConvertModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Convert Lead to Deal</h3>
              <button onClick={() => setShowConvertModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-secondary))' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleConvertLead}>
              <div className="modal-body">
                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '1.25rem' }}>
                  This will mark the lead status as <strong>WON</strong> and create a corresponding commercial deal.
                </p>

                <div className="form-group">
                  <label className="form-label">Deal Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={convertData.title}
                    onChange={e => setConvertData({ ...convertData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Deal Value ($)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={convertData.value}
                    onChange={e => setConvertData({ ...convertData, value: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowConvertModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Convert & Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div 
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: toast.type === 'success' ? 'hsl(var(--color-success))' : 'hsl(var(--color-danger))',
            color: 'white',
            padding: '12px 24px',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '600',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            fontSize: '0.9rem'
          }}
        >
          {toast.type === 'success' ? <Check size={16} /> : <X size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
