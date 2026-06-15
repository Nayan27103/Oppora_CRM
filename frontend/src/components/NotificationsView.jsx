import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Bell, Trash2, CheckCircle2, CheckCircle, MailOpen, Mail } from 'lucide-react';

export default function NotificationsView() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications();
      if (res.success) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      // Optimistic
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      
      const res = await api.readNotification(id);
      if (res.success) {
        fetchNotifications();
      }
    } catch (err) {
      alert(err.data?.message || 'Failed to read notification');
      fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      const res = await api.readAllNotifications();
      if (res.success) {
        fetchNotifications();
      }
    } catch (err) {
      alert(err.data?.message || 'Failed to read notifications');
      fetchNotifications();
    }
  };

  const handleDelete = async (id) => {
    try {
      setNotifications(prev => prev.filter(n => n.id !== id));
      const res = await api.deleteNotification(id);
      if (res.success) {
        fetchNotifications();
      }
    } catch (err) {
      alert(err.data?.message || 'Failed to delete notification');
      fetchNotifications();
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)' }}>Notification Center</h1>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>Check system notifications, assignments, and invitations</p>
        </div>
        {notifications.some(n => !n.is_read) && (
          <button className="btn btn-secondary btn-sm" onClick={handleMarkAllRead}>
            <CheckCircle2 size={16} /> Mark All as Read
          </button>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--text-secondary))' }}>Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'hsl(var(--text-muted))' }}>
            <Bell size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>You have no notifications yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: n.is_read ? 'hsl(var(--bg-surface) / 0.5)' : 'hsl(var(--bg-surface))',
                  borderLeft: `4px solid ${n.is_read ? 'hsl(var(--border-color))' : 'hsl(var(--color-primary))'}`,
                  borderTop: '1px solid hsl(var(--border-color))',
                  borderRight: '1px solid hsl(var(--border-color))',
                  borderBottom: '1px solid hsl(var(--border-color))',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ marginTop: '3px', color: n.is_read ? 'hsl(var(--text-muted))' : 'hsl(var(--color-primary-hover))' }}>
                    {n.is_read ? <MailOpen size={18} /> : <Mail size={18} />}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: n.is_read ? '600' : '700', color: n.is_read ? 'hsl(var(--text-secondary))' : 'hsl(var(--text-primary))' }}>
                      {n.title}
                    </h4>
                    <p style={{ fontSize: '0.88rem', color: 'hsl(var(--text-secondary))', marginTop: '4px', lineHeight: '1.4' }}>
                      {n.message}
                    </p>
                    <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', display: 'block', marginTop: '6px' }}>
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(n.id)}
                      title="Mark as read"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--color-success))', padding: '4px' }}
                    >
                      <CheckCircle size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(n.id)}
                    title="Delete notification"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--color-danger))', padding: '4px' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
