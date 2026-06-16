import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  Shield, 
  Users, 
  Building, 
  UserCheck, 
  DollarSign, 
  Target, 
  Database, 
  RefreshCw, 
  Search, 
  Mail, 
  Phone, 
  Calendar 
} from 'lucide-react';

export default function AdminPanelView() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [leads, setLeads] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAdminData();
  }, [activeTab]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (activeTab === 'overview') {
        const res = await api.getAdminStats();
        if (res.success) setStats(res.data);
      } else if (activeTab === 'users') {
        const res = await api.getAdminUsers();
        if (res.success) setUsers(res.data);
      } else if (activeTab === 'orgs') {
        const res = await api.getAdminOrganizations();
        if (res.success) setOrgs(res.data);
      } else if (activeTab === 'contacts') {
        const res = await api.getAdminContacts();
        if (res.success) setContacts(res.data);
      } else if (activeTab === 'leads') {
        const res = await api.getAdminLeads();
        if (res.success) setLeads(res.data);
      }
    } catch (err) {
      console.error('Admin API error:', err);
      setError(err.data?.message || 'Failed to retrieve admin data. Make sure you are logged in as a Superuser.');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = () => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      if (activeTab === 'users') return users;
      if (activeTab === 'orgs') return orgs;
      if (activeTab === 'contacts') return contacts;
      if (activeTab === 'leads') return leads;
      return [];
    }

    if (activeTab === 'users') {
      return users.filter(u => 
        u.username?.toLowerCase().includes(query) || 
        u.email?.toLowerCase().includes(query) ||
        u.phone?.toLowerCase().includes(query)
      );
    }
    if (activeTab === 'orgs') {
      return orgs.filter(o => 
        o.name?.toLowerCase().includes(query) || 
        o.owner_email?.toLowerCase().includes(query) ||
        o.owner_username?.toLowerCase().includes(query)
      );
    }
    if (activeTab === 'contacts') {
      return contacts.filter(c => 
        c.first_name?.toLowerCase().includes(query) || 
        c.last_name?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.company?.toLowerCase().includes(query) ||
        c.job_title?.toLowerCase().includes(query) ||
        c.organization_name?.toLowerCase().includes(query)
      );
    }
    if (activeTab === 'leads') {
      return leads.filter(l => 
        l.title?.toLowerCase().includes(query) || 
        l.status?.toLowerCase().includes(query) ||
        l.contact_email?.toLowerCase().includes(query) ||
        l.contact_name?.toLowerCase().includes(query) ||
        l.organization_name?.toLowerCase().includes(query)
      );
    }
    return [];
  };

  const renderOverview = () => {
    if (!stats) return <p style={{ color: 'hsl(var(--text-secondary))' }}>No stats loaded.</p>;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Metric grid */}
        <div className="metric-grid">
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'hsl(var(--color-primary) / 0.15)', color: 'hsl(var(--color-primary-hover))' }}>
              <Users size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', fontWeight: '500' }}>Total Accounts</p>
              <h3 style={{ fontSize: '1.5rem', marginTop: '4px' }}>{stats.total_users}</h3>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'hsl(var(--color-info) / 0.15)', color: 'hsl(var(--color-info))' }}>
              <Building size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', fontWeight: '500' }}>Workspaces</p>
              <h3 style={{ fontSize: '1.5rem', marginTop: '4px' }}>{stats.total_organizations}</h3>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'hsl(var(--color-warning) / 0.15)', color: 'hsl(var(--color-warning))' }}>
              <UserCheck size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', fontWeight: '500' }}>All Contacts</p>
              <h3 style={{ fontSize: '1.5rem', marginTop: '4px' }}>{stats.total_contacts}</h3>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'hsl(var(--color-success) / 0.15)', color: 'hsl(var(--color-success))' }}>
              <Target size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', fontWeight: '500' }}>All CRM Leads</p>
              <h3 style={{ fontSize: '1.5rem', marginTop: '4px' }}>{stats.total_leads}</h3>
            </div>
          </div>
        </div>

        {/* Deals stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flexWrap: 'wrap' }}>
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', color: 'hsl(var(--text-primary))', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={18} style={{ color: 'hsl(var(--color-success))' }} /> Closed Revenue (System-Wide)
            </h3>
            <div style={{ padding: '1.5rem 0' }}>
              <h2 style={{ fontSize: '2.5rem', color: '#FFF' }}>${stats.closed_won_revenue.toLocaleString()}</h2>
              <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', marginTop: '4px' }}>Cumulative closed-won pipeline revenue across all workspaces.</p>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', color: 'hsl(var(--text-primary))', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} style={{ color: 'hsl(var(--color-primary-hover))' }} /> Pipeline Conversion Stats
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                  <span style={{ color: 'hsl(var(--text-secondary))' }}>Total Deals Logged</span>
                  <span style={{ fontWeight: '600' }}>{stats.total_deals}</span>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                  <span style={{ color: 'hsl(var(--text-secondary))' }}>Closed Won Deals</span>
                  <span style={{ fontWeight: '600' }}>{stats.won_deals}</span>
                </div>
                <div style={{ height: '8px', background: 'hsl(var(--border-color))', borderRadius: '4px', overflow: 'hidden', marginTop: '6px' }}>
                  <div 
                    style={{ height: '100%', background: 'hsl(var(--color-success))', width: `${stats.total_deals > 0 ? (stats.won_deals / stats.total_deals) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    const filtered = getFilteredData();
    
    if (activeTab === 'users') {
      return (
        <div className="table-container" style={{ marginTop: 0 }}>
          <table className="crm-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role Flags</th>
                <th>Date Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: '600' }}>{u.username}</td>
                  <td>{u.email}</td>
                  <td>{u.phone || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {u.is_superuser && <span className="badge badge-primary">Superuser</span>}
                      {u.is_staff && <span className="badge badge-warning">Staff</span>}
                      {!u.is_superuser && !u.is_staff && <span className="badge badge-secondary">User</span>}
                    </div>
                  </td>
                  <td style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem' }}>
                    {new Date(u.date_joined).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (activeTab === 'orgs') {
      return (
        <div className="table-container" style={{ marginTop: 0 }}>
          <table className="crm-table">
            <thead>
              <tr>
                <th>Workspace Name</th>
                <th>Owner Email</th>
                <th>Contacts</th>
                <th>Members</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id}>
                  <td style={{ fontWeight: '600' }}>{o.name}</td>
                  <td>{o.owner_email}</td>
                  <td>{o.contacts_count}</td>
                  <td>{o.members_count}</td>
                  <td style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem' }}>
                    {new Date(o.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (activeTab === 'contacts') {
      return (
        <div className="table-container" style={{ marginTop: 0 }}>
          <table className="crm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>Job Title</th>
                <th>Workspace</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: '600' }}>{c.first_name} {c.last_name}</td>
                  <td>{c.email}</td>
                  <td>{c.company || '-'}</td>
                  <td>
                    {c.job_title ? (
                      <span className="badge badge-secondary">{c.job_title}</span>
                    ) : '-'}
                  </td>
                  <td style={{ color: 'hsl(var(--color-primary-hover))', fontWeight: '500' }}>{c.organization_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (activeTab === 'leads') {
      return (
        <div className="table-container" style={{ marginTop: 0 }}>
          <table className="crm-table">
            <thead>
              <tr>
                <th>Lead Title</th>
                <th>Score</th>
                <th>Status</th>
                <th>Contact Name</th>
                <th>Workspace</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: '600' }}>{l.title}</td>
                  <td style={{ fontWeight: '700' }}>{l.score || 0}</td>
                  <td>
                    <span className={`badge ${l.status?.toLowerCase() === 'won' ? 'badge-success' : l.status?.toLowerCase() === 'lost' ? 'badge-danger' : 'badge-warning'}`}>
                      {l.status}
                    </span>
                  </td>
                  <td>{l.contact_name || '-'}</td>
                  <td style={{ color: 'hsl(var(--color-primary-hover))', fontWeight: '500' }}>{l.organization_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return null;
  };

  return (
    <div>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={28} style={{ color: 'hsl(var(--color-warning))' }} /> CRM System Admin Panel
          </h1>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>Global system-wide directory containing all user databases and workspace setups.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchAdminData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={14} className={loading ? 'spin-animation' : ''} /> Refresh Data
        </button>
      </div>

      {/* Navigation tabs */}
      <div className="glass-panel" style={{ padding: '0.5rem', display: 'flex', gap: '8px', marginBottom: '2.0rem', overflowX: 'auto', background: 'hsl(var(--bg-glass))' }}>
        <button 
          onClick={() => { setActiveTab('overview'); setSearchQuery(''); }}
          className="btn" 
          style={{ 
            background: activeTab === 'overview' ? 'hsl(var(--color-primary) / 0.15)' : 'transparent',
            color: activeTab === 'overview' ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
            padding: '0.6rem 1.2rem',
            fontSize: '0.9rem'
          }}
        >
          Overview
        </button>
        <button 
          onClick={() => { setActiveTab('users'); setSearchQuery(''); }}
          className="btn" 
          style={{ 
            background: activeTab === 'users' ? 'hsl(var(--color-primary) / 0.15)' : 'transparent',
            color: activeTab === 'users' ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
            padding: '0.6rem 1.2rem',
            fontSize: '0.9rem'
          }}
        >
          All Users ({users.length})
        </button>
        <button 
          onClick={() => { setActiveTab('orgs'); setSearchQuery(''); }}
          className="btn" 
          style={{ 
            background: activeTab === 'orgs' ? 'hsl(var(--color-primary) / 0.15)' : 'transparent',
            color: activeTab === 'orgs' ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
            padding: '0.6rem 1.2rem',
            fontSize: '0.9rem'
          }}
        >
          Workspaces ({orgs.length})
        </button>
        <button 
          onClick={() => { setActiveTab('contacts'); setSearchQuery(''); }}
          className="btn" 
          style={{ 
            background: activeTab === 'contacts' ? 'hsl(var(--color-primary) / 0.15)' : 'transparent',
            color: activeTab === 'contacts' ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
            padding: '0.6rem 1.2rem',
            fontSize: '0.9rem'
          }}
        >
          All Contacts ({contacts.length})
        </button>
        <button 
          onClick={() => { setActiveTab('leads'); setSearchQuery(''); }}
          className="btn" 
          style={{ 
            background: activeTab === 'leads' ? 'hsl(var(--color-primary) / 0.15)' : 'transparent',
            color: activeTab === 'leads' ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
            padding: '0.6rem 1.2rem',
            fontSize: '0.9rem'
          }}
        >
          All CRM Leads ({leads.length})
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="glass-panel" style={{ padding: '1.5rem', background: 'hsl(var(--color-danger) / 0.1)', borderColor: 'hsl(var(--color-danger) / 0.3)', color: 'hsl(var(--color-danger))', marginBottom: '1.5rem' }}>
          <p>{error}</p>
        </div>
      )}

      {/* Search Bar for tabular lists */}
      {activeTab !== 'overview' && !loading && !error && (
        <div className="glass-panel" style={{ padding: '0.8rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', flexGrow: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
            <input 
              type="text" 
              className="form-input" 
              style={{ paddingLeft: '36px', paddingTop: '0.5rem', paddingBottom: '0.5rem', fontSize: '0.88rem' }}
              placeholder={`Search ${activeTab === 'users' ? 'users by name or email...' : activeTab === 'orgs' ? 'workspaces...' : activeTab === 'contacts' ? 'contacts by name, company, or workspace...' : 'leads by title, status, or workspace...'}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: '3rem 0', color: 'hsl(var(--text-secondary))' }}>Loading admin logs and entries...</p>
        ) : error ? (
          <p style={{ textAlign: 'center', padding: '3rem 0', color: 'hsl(var(--text-muted))' }}>No data available. Authenticate as superuser to access this section.</p>
        ) : activeTab === 'overview' ? (
          renderOverview()
        ) : getFilteredData().length === 0 ? (
          <p style={{ textAlign: 'center', padding: '3rem 0', color: 'hsl(var(--text-muted))' }}>No results match your search filter.</p>
        ) : (
          renderTable()
        )}
      </div>
    </div>
  );
}
