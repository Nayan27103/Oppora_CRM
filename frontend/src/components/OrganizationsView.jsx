import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Building, Plus, UserPlus, Shield, Users, Crown, Trash2, Edit2, X, AlertTriangle } from 'lucide-react';

export default function OrganizationsView({ user, activeOrg, setActiveOrg, refreshAllData }) {
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

  // CRUD specific states
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [submittingOrgAction, setSubmittingOrgAction] = useState(false);

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
      setIsEditingName(false);
    } else {
      setMembers([]);
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
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Organization created successfully!' } }));
      }
    } catch (err) {
      setOrgError(err.data?.errors?.name?.[0] || err.data?.message || 'Failed to create organization');
    }
  };

  const handleRenameOrg = async (e) => {
    e.preventDefault();
    if (!editName.trim() || !activeOrg) return;

    try {
      setSubmittingOrgAction(true);
      setOrgError(null);
      const res = await api.updateOrganization(activeOrg.id, editName.trim());
      if (res.success) {
        setIsEditingName(false);
        await fetchOrgs();
        setActiveOrg(res.data || { ...activeOrg, name: editName.trim() });
        refreshAllData();
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Organization renamed successfully!' } }));
      }
    } catch (err) {
      setOrgError(err.data?.message || 'Failed to rename organization');
    } finally {
      setSubmittingOrgAction(false);
    }
  };

  const handleDeleteOrg = async () => {
    if (!activeOrg) return;

    try {
      setSubmittingOrgAction(true);
      setOrgError(null);
      const res = await api.deleteOrganization(activeOrg.id);
      if (res.success) {
        setShowDeleteConfirm(false);
        setDeleteConfirmText('');
        const resOrgs = await api.getOrganizations();
        if (resOrgs.success) {
          setOrgs(resOrgs.data);
          if (resOrgs.data.length > 0) {
            selectOrg(resOrgs.data[0]);
          } else {
            setActiveOrg(null);
            localStorage.removeItem('active_org_id');
            refreshAllData();
          }
        }
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Organization deleted successfully!' } }));
      }
    } catch (err) {
      setOrgError(err.data?.message || 'Failed to delete organization');
    } finally {
      setSubmittingOrgAction(false);
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
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Team member added successfully!' } }));
      }
    } catch (err) {
      setMemberError(err.data?.errors?.user_email?.[0] || err.data?.message || 'Failed to add member');
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      setMemberError(null);
      const res = await api.updateTeamMember(memberId, newRole);
      if (res.success) {
        fetchMembers(activeOrg.id);
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Member role updated successfully!' } }));
      }
    } catch (err) {
      setMemberError(err.data?.message || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (memberId, email) => {
    if (!window.confirm(`Are you sure you want to remove ${email} from this workspace?`)) return;

    try {
      setMemberError(null);
      const res = await api.deleteTeamMember(memberId);
      if (res.success) {
        fetchMembers(activeOrg.id);
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Member removed successfully!' } }));
      }
    } catch (err) {
      setMemberError(err.data?.message || 'Failed to remove member');
    }
  };

  const handleLeaveWorkspace = async (memberId) => {
    if (!window.confirm('Are you sure you want to leave this workspace? You will lose access to all CRM information.')) return;

    try {
      setMemberError(null);
      const res = await api.deleteTeamMember(memberId);
      if (res.success) {
        const resOrgs = await api.getOrganizations();
        if (resOrgs.success) {
          setOrgs(resOrgs.data);
          if (resOrgs.data.length > 0) {
            selectOrg(resOrgs.data[0]);
          } else {
            setActiveOrg(null);
            localStorage.removeItem('active_org_id');
            refreshAllData();
          }
        }
      }
    } catch (err) {
      setMemberError(err.data?.message || 'Failed to leave workspace');
    }
  };

  const selectOrg = (org) => {
    setActiveOrg(org);
    localStorage.setItem('active_org_id', org.id);
    refreshAllData();
  };

  // Determine current user's membership and permission details
  const currentUserMember = members.find(m => m.user_email === user?.email);
  const isAdmin = currentUserMember?.role === 'ADMIN';
  const isOwner = activeOrg && activeOrg.owner === user?.id;

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
                  const isUserOwner = org.owner === user?.id;
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: isActive ? '700' : '500' }}>{org.name}</span>
                        {isUserOwner && (
                          <Crown size={14} style={{ color: '#F39C12' }} title="Workspace Owner" />
                        )}
                      </div>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {activeOrg.name} Team
                  </h3>
                  <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem' }}>Manage workspace settings and member access</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {isOwner && (
                    <button
                      onClick={() => {
                        setIsEditingName(!isEditingName);
                        setEditName(activeOrg.name);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Edit2 size={12} /> Rename
                    </button>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(true);
                        setDeleteConfirmText('');
                      }}
                      className="btn btn-danger btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'hsl(var(--text-secondary))', paddingLeft: '8px', borderLeft: '1px solid hsl(var(--border-color))' }}>
                    <Users size={16} />
                    <span style={{ fontSize: '0.85rem' }}>{members.length}</span>
                  </div>
                </div>
              </div>

              {/* Workspace renaming block */}
              {isEditingName && (
                <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', background: 'hsl(var(--bg-surface-hover) / 0.5)' }}>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Rename Workspace</h4>
                  <form onSubmit={handleRenameOrg} style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ flexGrow: 1, padding: '0.5rem 0.75rem' }}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                    <button type="submit" className="btn btn-primary btn-sm" disabled={submittingOrgAction}>
                      Save
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsEditingName(false)}>
                      Cancel
                    </button>
                  </form>
                </div>
              )}

              {/* Add Team Member Section (Only visible to Admins) */}
              {isAdmin && (
                <div style={{ background: 'hsl(var(--bg-surface) / 0.5)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px dashed hsl(var(--border-color))', marginBottom: '1.5rem' }}>
                  <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
                    <UserPlus size={16} style={{ color: 'hsl(var(--color-primary-hover))' }} /> Add Member
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
              )}

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
                        <th style={{ width: '140px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => {
                        const isMemberOwner = m.user === activeOrg.owner;
                        const isSelf = m.user_email === user?.email;
                        const canEditRole = isAdmin && !isMemberOwner && !isSelf;

                        return (
                          <tr key={m.id}>
                            <td style={{ fontWeight: '500' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {m.user_email}
                                {isSelf && (
                                  <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: 'hsl(var(--text-muted))' }}>You</span>
                                )}
                              </div>
                            </td>
                            <td>
                              {canEditRole ? (
                                <select
                                  value={m.role}
                                  onChange={(e) => handleRoleChange(m.id, e.target.value)}
                                  className="form-select"
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    fontSize: '0.8rem',
                                    width: '120px',
                                    background: 'hsl(var(--bg-surface-hover))',
                                    border: '1px solid hsl(var(--border-color))'
                                  }}
                                >
                                  <option value="ADMIN">ADMIN</option>
                                  <option value="MANAGER">MANAGER</option>
                                  <option value="MEMBER">MEMBER</option>
                                </select>
                              ) : (
                                <span className={`badge ${m.role === 'ADMIN' ? 'badge-primary' : m.role === 'MANAGER' ? 'badge-warning' : 'badge-secondary'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  {m.role === 'ADMIN' && <Shield size={12} />}
                                  {m.role}
                                </span>
                              )}
                            </td>
                            <td style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem' }}>
                              {new Date(m.created_at).toLocaleDateString()}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {isMemberOwner ? (
                                <span style={{ fontSize: '0.75rem', color: '#F39C12', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                                  <Crown size={12} /> Owner
                                </span>
                              ) : isSelf ? (
                                <button
                                  onClick={() => handleLeaveWorkspace(m.id)}
                                  className="btn btn-danger btn-sm"
                                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                >
                                  Leave
                                </button>
                              ) : isAdmin ? (
                                <button
                                  onClick={() => handleRemoveMember(m.id, m.user_email)}
                                  className="btn btn-danger btn-sm"
                                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                >
                                  Remove
                                </button>
                              ) : (
                                <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>None</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
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

      {/* Delete Workspace Confirmation Modal */}
      {showDeleteConfirm && activeOrg && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'hsl(var(--color-danger))' }}>
                <AlertTriangle size={20} /> Delete Workspace
              </h3>
              <button 
                onClick={() => setShowDeleteConfirm(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-secondary))' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.88rem', marginBottom: '1rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.4' }}>
                Warning: This action is permanent. Deleting the workspace <strong>{activeOrg.name}</strong> will delete all contacts, leads, deals, and activities associated with it forever.
              </p>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>
                  Type the workspace name <strong>{activeOrg.name}</strong> to confirm:
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={activeOrg.name}
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={submittingOrgAction}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={handleDeleteOrg}
                disabled={submittingOrgAction || deleteConfirmText !== activeOrg.name}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
