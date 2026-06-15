import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Building, Plus, UserPlus, Shield, Users } from 'lucide-react';

export default function OrganizationsView({ activeOrg, setActiveOrg, refreshAllData }) {
  const [orgs, setOrgs] = useState([]);
  const [members, setMembers] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  
  const [orgError, setOrgError] = useState(null);
  const [memberError, setMemberError] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState('');

  const fetchOrgs = async () => {
    try {
      setLoadingOrgs(true);
      setOrgError(null);
      const res = await api.getOrganizations();
      if (res.success) {
        setOrgs(res.data);
        // Default to first organization if none is active
        if (res.data.length > 0 && !activeOrg) {
          const defaultOrg = res.data[0];
          setActiveOrg(defaultOrg);
          localStorage.setItem('active_org_id', defaultOrg.id);
        }
      }
    } catch (err) {
      setOrgError(err.data?.message || 'Failed to load organizations');
    } finally {
      setLoadingOrgs(false);
    }
  };

  const fetchMembers = async (orgId) => {
    try {
      setLoadingMembers(true);
      setMemberError(null);
      const res = await api.getTeamMembers(orgId);
      if (res.success) {
        setMembers(res.data);
      }
    } catch (err) {
      setMemberError(err.data?.message || 'Failed to load team members');
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  useEffect(() => {
    if (activeOrg) {
      fetchMembers(activeOrg.id);
    } else {
      Promise.resolve().then(() => {
        setMembers([]);
      });
    }
  }, [activeOrg]);

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    try {
      setOrgError(null);
      const res = await api.createOrganization(newOrgName);
      if (res.success) {
        setNewOrgName('');
        await fetchOrgs();
        if (res.data) {
          setActiveOrg(res.data);
          localStorage.setItem('active_org_id', res.data.id);
          refreshAllData();
        }
      }
    } catch (err) {
      setOrgError(err.data?.errors?.name?.[0] || err.data?.message || 'Failed to create organization');
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeOrg) return;

    try {
      setMemberError(null);
      setInviteSuccess('');
      const res = await api.addTeamMember(activeOrg.id, inviteEmail, inviteRole);
      if (res.success) {
        setInviteEmail('');
        setInviteRole('MEMBER');
        setInviteSuccess('Member added successfully!');
        fetchMembers(activeOrg.id);
      }
    } catch (err) {
      setMemberError(err.data?.errors?.user_email?.[0] || err.data?.message || 'Failed to add member');
    }
  };

  const selectOrg = (org) => {
    setActiveOrg(org);
    localStorage.setItem('active_org_id', org.id);
    refreshAllData();
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)' }}>Organizations & Teams</h1>
        <p style={{ color: 'hsl(var(--text-secondary))' }}>Manage workspaces, organization members, and access roles.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem', alignItems: 'start' }}>
        {/* Left Side: Organizations Switcher & Creation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={20} /> Workspaces
            </h3>
            
            {loadingOrgs ? (
              <p style={{ color: 'hsl(var(--text-secondary))' }}>Loading workspaces...</p>
            ) : orgs.length === 0 ? (
              <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>No workspaces found. Create one below to get started.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {orgs.map((org) => {
                  const isActive = activeOrg && activeOrg.id === org.id;
                  return (
                    <div
                      key={org.id}
                      onClick={() => selectOrg(org)}
                      style={{
                        padding: '0.9rem 1.25rem',
                        borderRadius: 'var(--radius-md)',
                        background: isActive ? 'hsl(var(--color-primary) / 0.15)' : 'hsl(var(--bg-surface))',
                        border: `1px solid ${isActive ? 'hsl(var(--color-primary))' : 'hsl(var(--border-color))'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      className={!isActive ? 'glass-panel-hover' : ''}
                    >
                      <span style={{ fontWeight: isActive ? '700' : '500' }}>{org.name}</span>
                      {isActive && <span className="badge badge-primary">Active</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {orgError && (
              <div style={{ color: 'hsl(var(--color-danger))', fontSize: '0.85rem', marginTop: '1rem' }}>
                {orgError}
              </div>
            )}
          </div>

          {/* Create Organization Form */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={20} /> Create Workspace
            </h3>
            <form onSubmit={handleCreateOrg}>
              <div className="form-group">
                <label className="form-label">Workspace Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Acme Sales Team"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Create Workspace
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Team Members management */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          {activeOrg ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.3rem' }}>{activeOrg.name} Team</h3>
                  <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem' }}>Manage who has access to this workspace</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'hsl(var(--text-secondary))' }}>
                  <Users size={16} />
                  <span>{members.length} member(s)</span>
                </div>
              </div>

              {/* Add Team Member Section */}
              <div style={{ background: 'hsl(var(--bg-surface) / 0.5)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px dashed hsl(var(--border-color))', marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
                  <UserPlus size={16} /> Add Member
                </h4>
                <form onSubmit={handleInviteMember} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flexGrow: 1, minWidth: '200px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>User Email</label>
                    <input
                      type="email"
                      className="form-input"
                      style={{ padding: '0.5rem 0.75rem' }}
                      placeholder="user@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ width: '130px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Role</label>
                    <select
                      className="form-select"
                      style={{ padding: '0.5rem 0.75rem' }}
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Manager</option>
                      <option value="MEMBER">Member</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ height: '38px' }}>
                    Add
                  </button>
                </form>

                {memberError && (
                  <p style={{ color: 'hsl(var(--color-danger))', fontSize: '0.85rem', marginTop: '8px' }}>{memberError}</p>
                )}
                {inviteSuccess && (
                  <p style={{ color: 'hsl(var(--color-success))', fontSize: '0.85rem', marginTop: '8px' }}>{inviteSuccess}</p>
                )}
              </div>

              {/* Members List Table */}
              {loadingMembers ? (
                <p style={{ color: 'hsl(var(--text-secondary))' }}>Loading team members...</p>
              ) : (
                <div className="table-container" style={{ marginTop: '0' }}>
                  <table className="crm-table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Joined At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => (
                        <tr key={m.id}>
                          <td style={{ fontWeight: '500' }}>{m.user_email}</td>
                          <td>
                            <span className={`badge ${m.role === 'ADMIN' ? 'badge-primary' : m.role === 'MANAGER' ? 'badge-warning' : 'badge-secondary'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              {m.role === 'ADMIN' && <Shield size={12} />}
                              {m.role}
                            </span>
                          </td>
                          <td style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem' }}>
                            {new Date(m.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'hsl(var(--text-muted))' }}>
              <Building size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p>No organization active. Select or create one on the left.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
