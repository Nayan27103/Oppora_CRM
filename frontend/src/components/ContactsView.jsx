import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Search, Plus, Trash2, Edit3, Grid, FileSpreadsheet, X } from 'lucide-react';

export default function ContactsView({ activeOrg }) {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  
  // Form State
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    job_title: ''
  });

  // Bulk State
  const [bulkText, setBulkText] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (activeOrg) {
      fetchContacts();
    }
  }, [activeOrg, page, search, pageSize]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const res = await api.getContacts(search, page, pageSize);
      if (res.success) {
        setContacts(res.data);
        setTotalPages(res.total_pages || 1);
        setTotalCount(res.count || 0);
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingContact(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      company: '',
      job_title: ''
    });
    setFormError('');
    setShowFormModal(true);
  };

  const openEditModal = (contact) => {
    setEditingContact(contact);
    setFormData({
      first_name: contact.first_name,
      last_name: contact.last_name || '',
      email: contact.email,
      phone: contact.phone || '',
      company: contact.company || '',
      job_title: contact.job_title || ''
    });
    setFormError('');
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!activeOrg) return;

    const payload = {
      ...formData,
      organization: activeOrg.id
    };

    try {
      setFormError('');
      if (editingContact) {
        const res = await api.updateContact(editingContact.id, payload);
        if (res.success) {
          setShowFormModal(false);
          fetchContacts();
        }
      } else {
        const res = await api.createContact(payload);
        if (res.success) {
          setShowFormModal(false);
          fetchContacts();
        }
      }
    } catch (err) {
      setFormError(err.data?.message || JSON.stringify(err.data) || 'Failed to save contact');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      const res = await api.deleteContact(id);
      if (res.success) {
        fetchContacts();
      }
    } catch (err) {
      alert(err.data?.message || 'Failed to delete contact');
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!activeOrg) return;
    setBulkError('');

    try {
      const parsed = JSON.parse(bulkText);
      if (!Array.isArray(parsed)) {
        throw new Error('JSON must be an array of contacts');
      }

      // Add active organization_id to each contact
      const formatted = parsed.map(c => ({
        ...c,
        organization_id: activeOrg.id
      }));

      const res = await api.bulkCreateContacts(formatted);
      if (res.success) {
        setBulkText('');
        setShowBulkModal(false);
        fetchContacts();
      }
    } catch (err) {
      setBulkError(err.message || err.data?.message || 'Invalid JSON format or bulk create failed');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)' }}>Contacts Directory</h1>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>Manage customers, leads, and organizations contacts</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => {
            setBulkText(JSON.stringify([
              { first_name: "Jane", last_name: "Doe", email: "jane@example.com", phone: "123456789", company: "Stark Corp", job_title: "Manager" },
              { first_name: "John", last_name: "Smith", email: "john@example.com", phone: "987654321", company: "Wayne Ent", job_title: "Director" }
            ], null, 2));
            setBulkError('');
            setShowBulkModal(true);
          }}>
            <FileSpreadsheet size={16} /> Bulk Import
          </button>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Add Contact
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flexGrow: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '40px' }}
            placeholder="Search contacts by name, email, company..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '150px' }}>
          <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', whiteSpace: 'nowrap' }}>Per Page:</span>
          <select
            className="form-select"
            style={{ padding: '0.5rem 0.75rem', width: '85px', borderRadius: 'var(--radius-md)' }}
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="glass-panel" style={{ padding: '1rem' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--text-secondary))' }}>Loading contacts...</p>
        ) : contacts.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--text-muted))' }}>No contacts found.</p>
        ) : (
          <div>
            <div className="table-container" style={{ marginTop: '0' }}>
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Company</th>
                    <th>Job Title</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr key={contact.id}>
                      <td style={{ fontWeight: '600' }}>{contact.first_name} {contact.last_name}</td>
                      <td>{contact.email}</td>
                      <td>{contact.phone || '-'}</td>
                      <td>{contact.company || '-'}</td>
                      <td>
                        {contact.job_title ? (
                          <span className="badge badge-secondary">{contact.job_title}</span>
                        ) : '-'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => openEditModal(contact)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-secondary))' }}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(contact.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--color-danger))' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '0.5rem 1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
                  Showing page {page} of {totalPages} ({totalCount} contacts total)
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                  >
                    Previous
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create / Edit Form Modal */}
      {showFormModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingContact ? 'Edit Contact' : 'Create Contact'}</h3>
              <button onClick={() => setShowFormModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-secondary))' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                {formError && (
                  <div style={{ background: 'hsl(var(--color-danger) / 0.1)', padding: '10px', borderRadius: 'var(--radius-sm)', color: 'hsl(var(--color-danger))', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    {formError}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.first_name}
                      onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.last_name}
                      onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Company</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.company}
                      onChange={e => setFormData({ ...formData, company: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Job Title</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.job_title}
                      onChange={e => setFormData({ ...formData, job_title: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowFormModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingContact ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3>Bulk Import Contacts (JSON)</h3>
              <button onClick={() => setShowBulkModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-secondary))' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleBulkSubmit}>
              <div className="modal-body">
                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '1rem' }}>
                  Paste a JSON array of contacts. Make sure each object contains at least a <code>first_name</code> and <code>email</code>.
                </p>
                {bulkError && (
                  <div style={{ background: 'hsl(var(--color-danger) / 0.1)', padding: '10px', borderRadius: 'var(--radius-sm)', color: 'hsl(var(--color-danger))', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    {bulkError}
                  </div>
                )}
                <div className="form-group">
                  <textarea
                    className="form-input"
                    rows={12}
                    style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    required
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBulkModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Import Array</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
