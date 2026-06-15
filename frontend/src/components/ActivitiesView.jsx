import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Plus, Trash2, Calendar, Phone, Users, CheckSquare, Square, FileText, X } from 'lucide-react';

export default function ActivitiesView({ activeOrg }) {
  const [activities, setActivities] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    lead: '',
    activity_type: 'TASK',
    title: '',
    description: '',
    due_date: '',
    completed: false
  });
  const [formError, setFormError] = useState('');

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await api.getActivities();
      if (res.success) {
        setActivities(res.data);
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
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

  useEffect(() => {
    if (activeOrg) {
      Promise.resolve().then(() => {
        fetchActivities();
        fetchLeads();
      });
    }
  }, [activeOrg]);

  const handleCreateActivity = async (e) => {
    e.preventDefault();
    if (!formData.lead) {
      setFormError('Please select an associated lead');
      return;
    }

    const payload = {
      lead: parseInt(formData.lead),
      activity_type: formData.activity_type,
      title: formData.title,
      description: formData.description,
      due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
      completed: formData.completed
    };

    try {
      setFormError('');
      const res = await api.createActivity(payload);
      if (res.success) {
        setShowCreateModal(false);
        setFormData({
          lead: '',
          activity_type: 'TASK',
          title: '',
          description: '',
          due_date: '',
          completed: false
        });
        fetchActivities();
      }
    } catch (err) {
      setFormError(err.data?.message || JSON.stringify(err.data) || 'Failed to create activity');
    }
  };

  const toggleComplete = async (activity) => {
    try {
      // Optimistic update
      setActivities(prev => prev.map(a => a.id === activity.id ? { ...a, completed: !a.completed } : a));

      const res = await api.updateActivity(activity.id, { completed: !activity.completed });
      if (res.success) {
        fetchActivities();
      }
    } catch (err) {
      alert(err.data?.message || 'Failed to update activity completion');
      fetchActivities(); // Revert
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this activity?')) return;
    try {
      const res = await api.deleteActivity(id);
      if (res.success) {
        fetchActivities();
      }
    } catch (err) {
      alert(err.data?.message || 'Failed to delete activity');
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'CALL': return <Phone size={16} style={{ color: 'hsl(var(--color-info))' }} />;
      case 'MEETING': return <Users size={16} style={{ color: 'hsl(var(--color-primary-hover))' }} />;
      case 'NOTE': return <FileText size={16} style={{ color: 'hsl(var(--text-secondary))' }} />;
      default: return <Calendar size={16} style={{ color: 'hsl(var(--color-warning))' }} />;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)' }}>Activities & Tasks</h1>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>Schedule calls, meetings, notes, and checklist items</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setFormError('');
          setShowCreateModal(true);
        }}>
          <Plus size={16} /> Add Activity
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '1rem' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--text-secondary))' }}>Loading activities...</p>
        ) : activities.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--text-muted))' }}>No activities logged.</p>
        ) : (
          <div className="table-container" style={{ marginTop: '0' }}>
            <table className="crm-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>Done</th>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Due Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <tr key={a.id} style={{ opacity: a.completed ? 0.6 : 1 }}>
                    <td>
                      <button
                        onClick={() => toggleComplete(a)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'hsl(var(--color-primary))' }}
                      >
                        {a.completed ? <CheckSquare size={20} /> : <Square size={20} />}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getActivityIcon(a.activity_type)}
                        <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>{a.activity_type}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: '600', textDecoration: a.completed ? 'line-through' : 'none' }}>
                      {a.title}
                    </td>
                    <td style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem' }}>
                      {a.description || '-'}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {a.due_date ? new Date(a.due_date).toLocaleString() : '-'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleDelete(a.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--color-danger))' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Activity Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add Activity</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-secondary))' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateActivity}>
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
                      No leads available. Please create a lead first.
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
                        <option key={l.id} value={l.id}>{l.contact_name || `Lead #${l.id}`}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Activity Type</label>
                  <select
                    className="form-select"
                    value={formData.activity_type}
                    onChange={e => setFormData({ ...formData, activity_type: e.target.value })}
                  >
                    <option value="CALL">Call Log</option>
                    <option value="MEETING">Meeting</option>
                    <option value="TASK">Task / To-do</option>
                    <option value="NOTE">Quick Note</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="e.g. Schedule demo review"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter details about what needs to happen..."
                  ></textarea>
                </div>

                <div className="form-group">
                  <label className="form-label">Due Date & Time</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={formData.due_date}
                    onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1rem' }}>
                  <input
                    type="checkbox"
                    id="completed-chk"
                    checked={formData.completed}
                    onChange={e => setFormData({ ...formData, completed: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="completed-chk" style={{ cursor: 'pointer', fontWeight: '500' }}>Mark as Completed immediately</label>
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
    </div>
  );
}
