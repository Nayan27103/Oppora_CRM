import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Plus, Trash2, Calendar, DollarSign, X } from 'lucide-react';

const STAGES = [
  { key: 'DISCOVERY', label: 'Discovery' },
  { key: 'DEMO', label: 'Demo / Pitch' },
  { key: 'NEGOTIATION', label: 'Negotiation' },
  { key: 'CLOSED_WON', label: 'Closed Won' },
  { key: 'CLOSED_LOST', label: 'Closed Lost' }
];

export default function DealsView({ activeOrg, userRole }) {
  const [deals, setDeals] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form State
  const [editingDeal, setEditingDeal] = useState(null);
  const [formData, setFormData] = useState({
    lead: '',
    title: '',
    value: '',
    stage: 'DISCOVERY',
    expected_close_date: ''
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (activeOrg) {
      fetchDeals();
      fetchLeads();
    }
  }, [activeOrg]);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const res = await api.getDeals();
      if (res.success) {
        setDeals(res.data);
      }
    } catch (err) {
      console.error('Error fetching deals:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await api.getLeads();
      if (res.success) {
        setLeads(res.data);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    }
  };

  const handleDragStart = (e, dealId) => {
    if (userRole === 'MEMBER') {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', dealId);
  };

  const handleDragOver = (e) => {
    if (userRole === 'MEMBER') return;
    e.preventDefault();
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    if (userRole === 'MEMBER') return;
    const dealId = parseInt(e.dataTransfer.getData('text/plain'));
    if (!dealId) return;

    try {
      // Optimistic Update
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: targetStage } : d));
      
      const res = await api.updateDeal(dealId, { stage: targetStage });
      if (res.success) {
        fetchDeals();
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `Deal stage updated to ${targetStage}` } }));
      }
    } catch (err) {
      alert(err.data?.message || 'Failed to update deal stage');
      fetchDeals(); // Revert
    }
  };

  const openCreateModal = () => {
    setEditingDeal(null);
    setFormData({
      lead: '',
      title: '',
      value: '',
      stage: 'DISCOVERY',
      expected_close_date: ''
    });
    setFormError('');
    setShowCreateModal(true);
  };

  const openEditModal = (deal) => {
    setEditingDeal(deal);
    setFormData({
      lead: deal.lead,
      title: deal.title,
      value: deal.value,
      stage: deal.stage,
      expected_close_date: deal.expected_close_date || ''
    });
    setFormError('');
    setShowEditModal(true);
  };

  const handleFormSubmit = async (e, isEdit) => {
    e.preventDefault();
    setFormError('');

    const payload = {
      lead: parseInt(formData.lead),
      title: formData.title,
      value: parseFloat(formData.value),
      stage: formData.stage,
      expected_close_date: formData.expected_close_date || null
    };

    try {
      if (isEdit) {
        const res = await api.updateDeal(editingDeal.id, payload);
        if (res.success) {
          setShowEditModal(false);
          fetchDeals();
          window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Deal updated successfully!' } }));
        }
      } else {
        const res = await api.createDeal(payload);
        if (res.success) {
          setShowCreateModal(false);
          fetchDeals();
          window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Deal created successfully!' } }));
        }
      }
    } catch (err) {
      setFormError(err.data?.message || JSON.stringify(err.data) || 'Failed to save deal');
    }
  };

  const handleDeleteDeal = async (id) => {
    if (!confirm('Are you sure you want to delete this deal?')) return;
    try {
      const res = await api.deleteDeal(id);
      if (res.success) {
        fetchDeals();
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Deal deleted successfully!' } }));
      }
    } catch (err) {
      alert(err.data?.message || 'Failed to delete deal');
    }
  };

  const getDealsForStage = (stageKey) => {
    return deals.filter(d => d.stage === stageKey);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)' }}>Deals Pipeline</h1>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>Drag and drop deals between sales lifecycle stages</p>
        </div>
        {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Add Deal
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--text-secondary))' }}>Loading pipeline deals...</p>
      ) : (
        <div className="kanban-board">
          {STAGES.map((stage) => {
            const stageDeals = getDealsForStage(stage.key);
            const totalStageValue = stageDeals.reduce((sum, d) => sum + parseFloat(d.value || 0), 0);

            return (
              <div
                key={stage.key}
                className="kanban-column"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.key)}
              >
                <div className="kanban-column-header">
                  <span className="kanban-column-title">{stage.label}</span>
                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: '600' }}>
                    ({stageDeals.length})
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--color-primary-hover))', fontWeight: '700', paddingBottom: '0.5rem' }}>
                  ${totalStageValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '400px' }}>
                  {stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="kanban-card"
                      draggable={userRole !== 'MEMBER'}
                      onDragStart={(e) => handleDragStart(e, deal.id)}
                      onClick={() => openEditModal(deal)}
                    >
                      <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', fontWeight: '600' }}>{deal.title}</h4>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', color: 'hsl(var(--color-success))', fontWeight: '700' }}>
                          <DollarSign size={12} /> {parseFloat(deal.value).toLocaleString()}
                        </span>
                        {deal.expected_close_date && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'hsl(var(--text-secondary))' }}>
                            <Calendar size={12} /> {new Date(deal.expected_close_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Deal Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create Deal</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-secondary))' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={(e) => handleFormSubmit(e, false)}>
              <div className="modal-body">
                {formError && (
                  <div style={{ background: 'hsl(var(--color-danger) / 0.1)', padding: '10px', borderRadius: 'var(--radius-sm)', color: 'hsl(var(--color-danger))', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    {formError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Associated Lead</label>
                  {leads.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'hsl(var(--color-danger))' }}>
                      No leads available. Please create a lead in the Leads tab first.
                    </p>
                  ) : (
                    <select
                      className="form-select"
                      value={formData.lead}
                      onChange={e => setFormData({ ...formData, lead: e.target.value })}
                      required
                    >
                      <option value="">-- Select Lead --</option>
                      {leads.map(l => (
                        <option key={l.id} value={l.id}>{l.contact_name || `Lead #${l.id}`} ({l.status})</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Deal Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Value ($)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.value}
                    onChange={e => setFormData({ ...formData, value: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Stage</label>
                  <select
                    className="form-select"
                    value={formData.stage}
                    onChange={e => setFormData({ ...formData, stage: e.target.value })}
                  >
                    {STAGES.map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Expected Close Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.expected_close_date}
                    onChange={e => setFormData({ ...formData, expected_close_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={leads.length === 0}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit/Detail Deal Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Deal Information</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-secondary))' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={(e) => handleFormSubmit(e, true)}>
              <div className="modal-body">
                {formError && (
                  <div style={{ background: 'hsl(var(--color-danger) / 0.1)', padding: '10px', borderRadius: 'var(--radius-sm)', color: 'hsl(var(--color-danger))', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    {formError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Deal Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    required
                    disabled={userRole === 'MEMBER'}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Value ($)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.value}
                    onChange={e => setFormData({ ...formData, value: e.target.value })}
                    required
                    disabled={userRole === 'MEMBER'}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Stage</label>
                  <select
                    className="form-select"
                    value={formData.stage}
                    onChange={e => setFormData({ ...formData, stage: e.target.value })}
                    disabled={userRole === 'MEMBER'}
                  >
                    {STAGES.map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Expected Close Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.expected_close_date}
                    onChange={e => setFormData({ ...formData, expected_close_date: e.target.value })}
                    disabled={userRole === 'MEMBER'}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                {userRole === 'ADMIN' ? (
                  <button type="button" className="btn btn-danger" onClick={() => handleDeleteDeal(editingDeal.id)}>Delete</button>
                ) : <div />}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                  {userRole !== 'MEMBER' && <button type="submit" className="btn btn-primary">Save Changes</button>}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
