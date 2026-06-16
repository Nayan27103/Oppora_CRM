import React, { useState, useEffect } from 'react';
import { api } from './api';
import { 
  LayoutDashboard, 
  Building2, 
  UserSquare2, 
  Network, 
  Briefcase, 
  CalendarClock, 
  Sparkles, 
  Bell, 
  LogOut, 
  User, 
  Lock, 
  Mail, 
  Phone,
  Building,
  Menu,
  X,
  Search,
  Shield,
  Cpu
} from 'lucide-react';

// View Imports
import DashboardView from './components/DashboardView';
import OrganizationsView from './components/OrganizationsView';
import ContactsView from './components/ContactsView';
import LeadsView from './components/LeadsView';
import DealsView from './components/DealsView';
import ActivitiesView from './components/ActivitiesView';
import AIAssistantView from './components/AIAssistantView';
import NotificationsView from './components/NotificationsView';
import FinderPage from './components/FinderPage';
import AdminPanelView from './components/AdminPanelView';
import WorkflowsView from './components/WorkflowsView';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeOrg, setActiveOrg] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // Authentication State
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetUid, setResetUid] = useState('');
  const [resetToken, setResetToken] = useState('');

  // Change Password Modal State
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');

  // Notifications State
  const [unreadCount, setUnreadCount] = useState(0);

  // Responsive Sidebar Toggle
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/reset-password\/([^/]+)\/([^/]+)\/?/);
    if (match) {
      setResetUid(match[1]);
      setResetToken(match[2]);
      setAuthMode('reset');
      setLoading(false);
    } else {
      checkAuth();
    }

    const handleNavigate = (e) => {
      if (e.detail) {
        setActiveView(e.detail);
      }
    };
    window.addEventListener('navigate', handleNavigate);
    return () => {
      window.removeEventListener('navigate', handleNavigate);
    };
  }, []);

  useEffect(() => {
    let interval;
    if (user) {
      fetchUnreadNotificationsCount();
      // Poll notifications every 10 seconds for real-time updates
      interval = setInterval(fetchUnreadNotificationsCount, 10000);
    }
    return () => clearInterval(interval);
  }, [user]);

  const checkAuth = async () => {
    if (localStorage.getItem('access_token')) {
      try {
        const res = await api.getProfile();
        if (res.success) {
          setUser(res.data);
          // Load stored organization
          const orgRes = await api.getOrganizations();
          if (orgRes.success && orgRes.data.length > 0) {
            const savedOrgId = localStorage.getItem('active_org_id');
            const foundOrg = orgRes.data.find(o => o.id === parseInt(savedOrgId));
            const selected = foundOrg || orgRes.data[0];
            setActiveOrg(selected);
            localStorage.setItem('active_org_id', selected.id);
          }
        }
      } catch (err) {
        // Token might be invalid or expired
        api.clearTokens();
        setUser(null);
      }
    }
    setLoading(false);
  };

  const fetchUnreadNotificationsCount = async () => {
    try {
      const res = await api.getNotifications();
      if (res.success) {
        const unread = res.data.filter(n => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('Error fetching notifications count:', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      setLoading(true);
      const res = await api.login(email, password);
      const data = res.data || res;
      if (data.access) {
        // Load User Profile
        const profileRes = await api.getProfile();
        if (profileRes.success) {
          setUser(profileRes.data);
          
          // Load User Organizations
          const orgRes = await api.getOrganizations();
          if (orgRes.success && orgRes.data.length > 0) {
            setActiveOrg(orgRes.data[0]);
            localStorage.setItem('active_org_id', orgRes.data[0].id);
          }
        }
      }
    } catch (err) {
      setAuthError(err.data?.detail || err.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    try {
      setLoading(true);
      const res = await api.register(username, email, password, phone);
      if (res.success) {
        setAuthSuccess('Registration successful! Please login.');
        setAuthMode('login');
        setPassword('');
      }
    } catch (err) {
      const errors = err.data?.errors;
      let errMsg = 'Registration failed.';
      if (errors) {
        errMsg = Object.keys(errors).map(key => `${key}: ${errors[key][0]}`).join(' | ');
      } else {
        errMsg = err.data?.message || errMsg;
      }
      setAuthError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.clearTokens();
    setUser(null);
    setActiveOrg(null);
    localStorage.removeItem('active_org_id');
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    try {
      setLoading(true);
      const res = await api.forgotPassword(email);
      if (res.success) {
        setAuthSuccess(res.message || 'If that email exists, we have sent a password reset link.');
      }
    } catch (err) {
      setAuthError(err.data?.message || 'Failed to send password reset request.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setAuthError('Password must be at least 8 characters long.');
      return;
    }
    try {
      setLoading(true);
      const res = await api.resetPassword(resetUid, resetToken, password);
      if (res.success) {
        setAuthSuccess(res.message || 'Password reset successful! Redirecting to login...');
        setTimeout(() => {
          setAuthMode('login');
          setAuthSuccess('');
          setPassword('');
          setConfirmPassword('');
          window.history.pushState({}, document.title, "/");
        }, 3000);
      }
    } catch (err) {
      setAuthError(err.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangePasswordError('');
    setChangePasswordSuccess('');
    if (newPassword.length < 8) {
      setChangePasswordError('New password must be at least 8 characters long.');
      return;
    }
    try {
      const res = await api.changePassword(oldPassword, newPassword);
      if (res.success) {
        setChangePasswordSuccess(res.message || 'Password changed successfully!');
        setTimeout(() => {
          setChangePasswordModalOpen(false);
          setOldPassword('');
          setNewPassword('');
          setChangePasswordSuccess('');
        }, 2000);
      }
    } catch (err) {
      setChangePasswordError(err.data?.message || 'Failed to change password.');
    }
  };

  const refreshAllData = async () => {
    // When workspace switches, refetch profile & notifications
    fetchUnreadNotificationsCount();
  };

  if (loading && !user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <div className="pulse-indicator"></div>
        <p style={{ marginTop: '1rem', color: 'hsl(var(--text-secondary))' }}>Loading Oppora CRM...</p>
      </div>
    );
  }

  // Render Auth Pages (Login / Register / Forgot / Reset)
  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 10% 10%, hsl(262 50% 15% / 0.35), transparent 50%), radial-gradient(circle at 90% 90%, hsl(200 50% 15% / 0.35), transparent 50%), hsl(var(--bg-base))',
        padding: '1.5rem'
      }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, #fff 40%, hsl(var(--color-primary)) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Oppora CRM
            </h2>
            <p style={{ color: 'hsl(var(--text-secondary))', marginTop: '6px', fontSize: '0.9rem' }}>
              {authMode === 'login' && 'Welcome back! Log in to manage your sales pipeline'}
              {authMode === 'register' && 'Create an account to get started'}
              {authMode === 'forgot' && 'Reset your password via email link'}
              {authMode === 'reset' && 'Enter your new password below'}
            </p>
          </div>

          {authError && (
            <div style={{ background: 'hsl(var(--color-danger) / 0.1)', border: '1px solid hsl(var(--color-danger) / 0.2)', padding: '10px 12px', borderRadius: 'var(--radius-md)', color: 'hsl(var(--color-danger))', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              {authError}
            </div>
          )}

          {authSuccess && (
            <div style={{ background: 'hsl(var(--color-success) / 0.1)', border: '1px solid hsl(var(--color-success) / 0.2)', padding: '10px 12px', borderRadius: 'var(--radius-md)', color: 'hsl(var(--color-success))', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              {authSuccess}
            </div>
          )}

          {authMode === 'forgot' ? (
            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                  <input
                    type="email"
                    className="form-input"
                    id="forgot-email"
                    style={{ paddingLeft: '40px' }}
                    placeholder="your-email@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                Send Reset Link
              </button>
            </form>
          ) : authMode === 'reset' ? (
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                  <input
                    type="password"
                    className="form-input"
                    id="reset-password"
                    style={{ paddingLeft: '40px' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                  <input
                    type="password"
                    className="form-input"
                    id="reset-confirm-password"
                    style={{ paddingLeft: '40px' }}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                Reset Password
              </button>
            </form>
          ) : (
            <form onSubmit={authMode === 'login' ? handleLogin : handleRegister}>
              {authMode === 'register' && (
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '40px' }}
                      placeholder="john_doe"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                  <input
                    type="email"
                    className="form-input"
                    style={{ paddingLeft: '40px' }}
                    placeholder="admin@gmail.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                  {authMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot');
                        setAuthError('');
                        setAuthSuccess('');
                      }}
                      style={{ background: 'none', border: 'none', color: 'hsl(var(--color-primary-hover))', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '500' }}
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                  <input
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: '40px' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {authMode === 'register' && (
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '40px' }}
                      placeholder="+1 (555) 019-2834"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                {authMode === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            </form>
          )}

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.88rem' }}>
            {authMode === 'login' && (
              <>
                <span style={{ color: 'hsl(var(--text-secondary))' }}>Don't have an account? </span>
                <button
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError('');
                    setAuthSuccess('');
                  }}
                  style={{ background: 'none', border: 'none', color: 'hsl(var(--color-primary-hover))', fontWeight: '700', cursor: 'pointer' }}
                >
                  Create one
                </button>
              </>
            )}
            {authMode === 'register' && (
              <>
                <span style={{ color: 'hsl(var(--text-secondary))' }}>Already have an account? </span>
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                    setAuthSuccess('');
                  }}
                  style={{ background: 'none', border: 'none', color: 'hsl(var(--color-primary-hover))', fontWeight: '700', cursor: 'pointer' }}
                >
                  Log in
                </button>
              </>
            )}
            {(authMode === 'forgot' || authMode === 'reset') && (
              <button
                onClick={() => {
                  setAuthMode('login');
                  setAuthError('');
                  setAuthSuccess('');
                  if (authMode === 'reset') {
                    window.history.pushState({}, document.title, "/");
                  }
                }}
                style={{ background: 'none', border: 'none', color: 'hsl(var(--color-primary-hover))', fontWeight: '700', cursor: 'pointer' }}
              >
                Back to Login
              </button>
            )}
          </div>
          
          <div style={{ marginTop: '2rem', padding: '10px', background: 'hsl(var(--bg-base))', borderRadius: 'var(--radius-sm)', border: '1px solid hsl(var(--border-color))', fontSize: '0.75rem', color: 'hsl(var(--text-muted))', textAlign: 'center' }}>
            <strong>Default DB Accounts:</strong><br />
            <code>admin@gmail.com</code> | <code>nayan@gmail.com</code> | <code>aman@gmail.com</code>
          </div>
        </div>
      </div>
    );
  }

  // Render Main Layout when Logged In
  const menuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { key: 'organizations', label: 'Organizations', icon: <Building2 size={20} /> },
    { key: 'contacts', label: 'Contacts', icon: <UserSquare2 size={20} /> },
    { key: 'leads', label: 'Leads', icon: <Network size={20} /> },
    { key: 'finder', label: 'Lead Finder', icon: <Search size={20} /> },
    { key: 'deals', label: 'Deals Board', icon: <Briefcase size={20} /> },
    { key: 'activities', label: 'Activities', icon: <CalendarClock size={20} /> },
    { key: 'workflows', label: 'Automations', icon: <Cpu size={20} /> },
    { key: 'ai-assistant', label: 'AI Copilot', icon: <Sparkles size={20} /> },
    { key: 'notifications', label: 'Notifications', icon: <Bell size={20} />, badge: unreadCount > 0 ? unreadCount : null }
  ];

  if (user && (user.is_superuser || user.is_staff)) {
    menuItems.push({ key: 'admin-panel', label: 'Admin Panel', icon: <Shield size={20} style={{ color: 'hsl(var(--color-warning))' }} /> });
  }

  const renderActiveView = () => {
    // If no workspace is selected and they aren't on organizations view or admin panel, nudge them
    if (!activeOrg && activeView !== 'organizations' && activeView !== 'admin-panel') {
      return (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', maxWidth: '600px', margin: '4rem auto' }}>
          <Building size={48} style={{ color: 'hsl(var(--color-primary))', marginBottom: '1.25rem', opacity: 0.8 }} />
          <h2 style={{ marginBottom: '0.5rem' }}>No Active Workspace</h2>
          <p style={{ color: 'hsl(var(--text-secondary))', marginBottom: '1.5rem' }}>
            You need to select an existing workspace organization or create a new one to access CRM features.
          </p>
          <button className="btn btn-primary" onClick={() => setActiveView('organizations')}>
            Select Workspace
          </button>
        </div>
      );
    }

    switch (activeView) {
      case 'dashboard':
        return <DashboardView activeOrg={activeOrg} onNavigate={(view) => setActiveView(view)} />;
      case 'organizations':
        return <OrganizationsView user={user} activeOrg={activeOrg} setActiveOrg={setActiveOrg} refreshAllData={refreshAllData} />;
      case 'contacts':
        return <ContactsView activeOrg={activeOrg} />;
      case 'leads':
        return <LeadsView activeOrg={activeOrg} />;
      case 'finder':
        return <FinderPage activeOrg={activeOrg} onNavigate={(view) => setActiveView(view)} />;
      case 'deals':
        return <DealsView activeOrg={activeOrg} />;
      case 'activities':
        return <ActivitiesView activeOrg={activeOrg} />;
      case 'workflows':
        return <WorkflowsView activeOrg={activeOrg} />;
      case 'ai-assistant':
        return <AIAssistantView />;
      case 'notifications':
        return <NotificationsView />;
      case 'admin-panel':
        return (user.is_superuser || user.is_staff) ? <AdminPanelView /> : <DashboardView activeOrg={activeOrg} onNavigate={(view) => setActiveView(view)} />;
      default:
        return <DashboardView activeOrg={activeOrg} onNavigate={(view) => setActiveView(view)} />;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside 
        style={{
          width: sidebarOpen ? '260px' : '0px',
          overflow: 'hidden',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          borderRight: sidebarOpen ? '1px solid hsl(var(--border-color))' : 'none',
          background: 'hsl(var(--bg-surface))',
          zIndex: 100
        }}
      >
        {/* Brand Head */}
        <div style={{ padding: '1.5rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid hsl(var(--border-color))' }}>
          <span style={{ fontSize: '1.3rem', fontWeight: '800', fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, #fff 40%, hsl(var(--color-primary)) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Oppora CRM
          </span>
          <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-secondary))', display: 'none' /* toggleable on responsive */ }}>
            <X size={18} />
          </button>
        </div>

        {/* Selected Workspace Status */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid hsl(var(--border-color))', background: 'hsl(var(--bg-base) / 0.3)' }}>
          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Workspace</span>
          <div 
            onClick={() => setActiveView('organizations')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', cursor: 'pointer', color: 'hsl(var(--text-primary))' }}
          >
            <Building size={16} style={{ color: 'hsl(var(--color-primary-hover))' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {activeOrg ? activeOrg.name : 'Select Org'}
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav style={{ flexGrow: 1, padding: '1.25rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {menuItems.map((item) => {
            const isActive = activeView === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveView(item.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: isActive ? 'hsl(var(--color-primary) / 0.15)' : 'transparent',
                  color: isActive ? 'hsl(var(--text-primary))' : 'hsl(var(--text-secondary))',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: isActive ? '700' : '500',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
                className={!isActive ? 'glass-panel-hover' : ''}
              >
                {item.icon}
                <span style={{ fontSize: '0.95rem' }}>{item.label}</span>
                {item.badge !== null && (
                  <span className="badge badge-danger" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', padding: '2px 6px', fontSize: '0.7rem' }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User profile / Logout */}
        <div style={{ padding: '1rem', borderTop: '1px solid hsl(var(--border-color))', display: 'flex', alignItems: 'center', justifySelf: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'hsl(var(--color-primary) / 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--color-primary-hover))', fontWeight: '700' }}>
              {user.username ? user.username[0].toUpperCase() : 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '0.88rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.username || 'User'}</p>
              <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => {
                setChangePasswordModalOpen(true);
                setChangePasswordError('');
                setChangePasswordSuccess('');
              }} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-secondary))' }} 
              title="Change Password"
            >
              <Lock size={18} />
            </button>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-secondary))' }} title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Header */}
        <header style={{ height: '64px', borderBottom: '1px solid hsl(var(--border-color))', display: 'flex', alignItems: 'center', padding: '0 2rem', justifyContent: 'space-between', flexShrink: 0, background: 'hsl(var(--bg-glass))', backdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-secondary))' }}>
              <Menu size={20} />
            </button>
            <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Status: <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(var(--color-success))', display: 'inline-block' }}></span> Connected
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {/* Quick Notify Bell */}
            <div style={{ position: 'relative', cursor: 'pointer', color: 'hsl(var(--text-secondary))' }} onClick={() => setActiveView('notifications')}>
              <Bell size={20} />
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', background: 'hsl(var(--color-danger))', borderRadius: '50%' }}></span>
              )}
            </div>

            <div style={{ width: '1px', height: '20px', background: 'hsl(var(--border-color))' }}></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', fontWeight: '500' }}>{user.email}</span>
            </div>
          </div>
        </header>

        {/* View Page content */}
        <main className="page-container">
          {renderActiveView()}
        </main>
      </div>

      {/* Change Password Modal */}
      {changePasswordModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} style={{ color: 'hsl(var(--color-primary-hover))' }} />
                Change Password
              </h3>
              <button 
                onClick={() => setChangePasswordModalOpen(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-secondary))' }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleChangePassword}>
              <div className="modal-body">
                {changePasswordError && (
                  <div style={{ background: 'hsl(var(--color-danger) / 0.1)', border: '1px solid hsl(var(--color-danger) / 0.2)', padding: '10px 12px', borderRadius: 'var(--radius-md)', color: 'hsl(var(--color-danger))', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                    {changePasswordError}
                  </div>
                )}
                {changePasswordSuccess && (
                  <div style={{ background: 'hsl(var(--color-success) / 0.1)', border: '1px solid hsl(var(--color-success) / 0.2)', padding: '10px 12px', borderRadius: 'var(--radius-md)', color: 'hsl(var(--color-success))', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                    {changePasswordSuccess}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Old Password</label>
                  <input
                    type="password"
                    className="form-input"
                    id="change-old-password"
                    placeholder="••••••••"
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    id="change-new-password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setChangePasswordModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
