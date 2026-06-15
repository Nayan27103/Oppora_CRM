import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { DollarSign, Users, Target, Activity, CheckCircle, Clock } from 'lucide-react';

export default function DashboardView({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboard();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      setError(err.data?.message || 'Failed to fetch dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <div className="pulse-indicator"></div>
        <span style={{ marginLeft: '10px', color: 'hsl(var(--text-secondary))' }}>Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--color-danger))' }}>
        <p>{error}</p>
        <button className="btn btn-secondary btn-sm" style={{ marginTop: '1rem' }} onClick={fetchStats}>Retry</button>
      </div>
    );
  }

  const completedRatio = stats ? (stats.completed_tasks + stats.pending_tasks > 0 
    ? (stats.completed_tasks / (stats.completed_tasks + stats.pending_tasks)) * 100 
    : 0) : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)' }}>Dashboard</h1>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>Real-time overview of your CRM metrics</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="pulse-indicator"></span>
          <span style={{ fontSize: '0.85rem', color: 'hsl(var(--color-success))', fontWeight: '600' }}>System Live</span>
        </div>
      </div>

      <div className="metric-grid">
        {/* Closed Won Revenue Card */}
        <div className="glass-panel glass-panel-hover" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'hsl(var(--color-success) / 0.15)', color: 'hsl(var(--color-success))' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', fontWeight: '500' }}>Closed Revenue</p>
            <h3 style={{ fontSize: '1.5rem', marginTop: '4px' }}>${stats.closed_won_revenue.toLocaleString()}</h3>
          </div>
        </div>

        {/* Pipeline Value Card */}
        <div className="glass-panel glass-panel-hover" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'hsl(var(--color-primary) / 0.15)', color: 'hsl(var(--color-primary-hover))' }}>
            <Target size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', fontWeight: '500' }}>Pipeline Value</p>
            <h3 style={{ fontSize: '1.5rem', marginTop: '4px' }}>${stats.pipeline_value.toLocaleString()}</h3>
          </div>
        </div>

        {/* Total Leads Card */}
        <div className="glass-panel glass-panel-hover" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'hsl(var(--color-info) / 0.15)', color: 'hsl(var(--color-info))' }}>
            <Users size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', fontWeight: '500' }}>Total Leads</p>
            <h3 style={{ fontSize: '1.5rem', marginTop: '4px' }}>{stats.leads}</h3>
          </div>
        </div>

        {/* Deals Count Card */}
        <div className="glass-panel glass-panel-hover" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'hsl(var(--color-warning) / 0.15)', color: 'hsl(var(--color-warning))' }}>
            <Activity size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', fontWeight: '500' }}>Active Deals</p>
            <h3 style={{ fontSize: '1.5rem', marginTop: '4px' }}>{stats.deals}</h3>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
        {/* Lead Funnel */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Lead Funnel Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                <span style={{ color: 'hsl(var(--text-secondary))' }}>New Leads</span>
                <span style={{ fontWeight: '600' }}>{stats.new_leads}</span>
              </div>
              <div style={{ height: '8px', background: 'hsl(var(--border-color))', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'hsl(var(--color-info))', width: `${stats.leads > 0 ? (stats.new_leads / stats.leads) * 100 : 0}%` }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                <span style={{ color: 'hsl(var(--text-secondary))' }}>Contacted</span>
                <span style={{ fontWeight: '600' }}>{stats.contacted_leads}</span>
              </div>
              <div style={{ height: '8px', background: 'hsl(var(--border-color))', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'hsl(var(--color-warning))', width: `${stats.leads > 0 ? (stats.contacted_leads / stats.leads) * 100 : 0}%` }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                <span style={{ color: 'hsl(var(--text-secondary))' }}>Qualified</span>
                <span style={{ fontWeight: '600' }}>{stats.qualified_leads}</span>
              </div>
              <div style={{ height: '8px', background: 'hsl(var(--border-color))', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'hsl(var(--color-primary-hover))', width: `${stats.leads > 0 ? (stats.qualified_leads / stats.leads) * 100 : 0}%` }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                <span style={{ color: 'hsl(var(--text-secondary))' }}>Won Leads</span>
                <span style={{ fontWeight: '600' }}>{stats.won_leads}</span>
              </div>
              <div style={{ height: '8px', background: 'hsl(var(--border-color))', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'hsl(var(--color-success))', width: `${stats.leads > 0 ? (stats.won_leads / stats.leads) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Task Completion Tracker */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Task & Activity Progress</h3>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', height: '100%' }}>
            <div style={{ flexShrink: 0, position: 'relative', width: '120px', height: '120px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {/* Simple CSS-based circular progress */}
              <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="60" cy="60" r="50" fill="transparent" stroke="hsl(var(--border-color))" strokeWidth="8"/>
                <circle cx="60" cy="60" r="50" fill="transparent" stroke="hsl(var(--color-primary))" strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - completedRatio / 100)}` }
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              </svg>
              <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: '700' }}>{Math.round(completedRatio)}%</span>
                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>Done</span>
              </div>
            </div>
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle size={18} style={{ color: 'hsl(var(--color-success))' }} />
                <div>
                  <span style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))' }}>Completed Activities</span>
                  <p style={{ fontSize: '1.1rem', fontWeight: '600', marginTop: '2px' }}>{stats.completed_tasks}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={18} style={{ color: 'hsl(var(--color-warning))' }} />
                <div>
                  <span style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))' }}>Pending Activities</span>
                  <p style={{ fontSize: '1.1rem', fontWeight: '600', marginTop: '2px' }}>{stats.pending_tasks}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="glass-panel" style={{ padding: '1.75rem', marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.2rem' }}>CRM Actions</h3>
          <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>Quick Links</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('leads')}>Manage Leads</button>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('deals')}>Pipeline Board</button>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('contacts')}>Contacts Directory</button>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('activities')}>Schedule Task</button>
        </div>
      </div>
    </div>
  );
}
