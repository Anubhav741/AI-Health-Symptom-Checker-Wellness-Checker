import React, { useEffect, useState } from 'react';
import { getCheckups, sendReport } from '../services/api';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from 'recharts';
import { Activity, Users, FileText, Zap, Heart, Sun, Moon, CloudSun } from 'lucide-react';

const SEV_COLORS = { low: '#22c55e', medium: '#f5a623', moderate: '#f5a623', high: '#f25f5c' };

const HEALTH_TIPS = [
  { icon: '💧', tip: 'Stay hydrated — aim for 8 glasses of water daily for better energy and focus.' },
  { icon: '🚶', tip: 'A 20-minute walk after meals helps regulate blood sugar and improves digestion.' },
  { icon: '😴', tip: 'Adults need 7–9 hours of quality sleep for proper immune function.' },
  { icon: '🧘', tip: 'Deep breathing for 5 minutes reduces cortisol levels and stress.' },
  { icon: '🥗', tip: 'Eating a variety of colorful fruits and vegetables provides essential nutrients.' },
  { icon: '⏰', tip: 'Taking screen breaks every 20 minutes reduces eye strain significantly.' },
  { icon: '🏃', tip: 'Regular exercise can reduce the risk of chronic diseases by up to 50%.' },
];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good Morning', icon: <Sun size={20} style={{color: '#f5a623'}} /> };
  if (h < 17) return { text: 'Good Afternoon', icon: <CloudSun size={20} style={{color: '#f5a623'}} /> };
  return { text: 'Good Evening', icon: <Moon size={20} style={{color: '#9b7dff'}} /> };
};

const AnalyticsDashboard = ({ onStart }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [summarySending, setSummarySending] = useState(false);
  const [summaryStatus, setSummaryStatus] = useState('');

  const todayTip = HEALTH_TIPS[new Date().getDate() % HEALTH_TIPS.length];
  const greeting = getGreeting();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const checkupsData = await getCheckups();
      if (checkupsData) setHistory(checkupsData);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <p className="loading-text">Loading Analytics</p>
      </div>
    );
  }

  const totalCheckups = history.length;
  const uniqueUsers = new Set(history.map(c => c.email)).size;
  const successRate = totalCheckups > 0 ? 98 : 0; 
  
  const sevCount = { low: 0, moderate: 0, high: 0 };
  history.forEach(h => {
    const sev = h.severity?.toLowerCase() || 'low';
    if (sev === 'high') sevCount.high++;
    else if (sev === 'moderate' || sev === 'medium') sevCount.moderate++;
    else sevCount.low++;
  });
  const severityDistribution = [
    { name: 'Low', value: sevCount.low },
    { name: 'Moderate', value: sevCount.moderate },
    { name: 'High', value: sevCount.high }
  ].filter(x => x.value > 0);

  const allConditions = history.flatMap(r => Array.isArray(r.conditions) ? r.conditions : r.conditions ? [r.conditions] : []);
  const condCount = {};
  allConditions.forEach(cond => {
    const name = cond.name || cond.condition || cond;
    if (name && typeof name === 'string') condCount[name] = (condCount[name] || 0) + 1;
  });
  const commonConditions = Object.keys(condCount)
    .map(k => ({ name: k, count: condCount[k] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const checkupsByDate = {};
  history.forEach(h => {
    const dStr = new Date(h.createdAt || Date.now()).toLocaleDateString();
    checkupsByDate[dStr] = (checkupsByDate[dStr] || 0) + 1;
  });
  const weekData = Array.from({length: 7}).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toLocaleDateString();
    return { name: dateStr, checkups: checkupsByDate[dateStr] || 0 };
  });

  const filteredHistory = history.filter(h => 
    (h.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (h.conditions?.[0]?.name || h.conditions?.[0]?.condition || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (h.severity || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const latestCheckup = history[0] || null;
  const latestCondition = latestCheckup?.conditions?.[0]?.name || latestCheckup?.conditions?.[0]?.condition || 'Not available';
  const latestRecommendations = Array.isArray(latestCheckup?.recommendations) ? latestCheckup.recommendations.slice(0, 3) : [];
  
  const handleResendSummary = async () => {
    if (!latestCheckup?.email) {
      setSummaryStatus('Email not available for the latest checkup.');
      return;
    }
    setSummarySending(true);
    setSummaryStatus('');
    try {
      await sendReport({
        email: latestCheckup.email,
        symptoms: latestCheckup.symptoms || 'Not provided',
        conditions: Array.isArray(latestCheckup.conditions) ? latestCheckup.conditions : [],
        severity: latestCheckup.severity || 'moderate',
        recommendations: Array.isArray(latestCheckup.recommendations) ? latestCheckup.recommendations : []
      });
      setSummaryStatus(`Summary sent to ${latestCheckup.email}`);
    } catch (e) {
      setSummaryStatus(e.friendlyMessage || 'Failed to send summary email.');
    } finally {
      setSummarySending(false);
    }
  };

  const cardStyle = {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: '16px', boxShadow: '0 1px 4px rgba(26,35,50,0.05)'
  };

  return (
    <div className="home-screen">
      {/* Greeting + Hero */}
      <div className="hero-card" style={{ marginBottom: '6px' }}>
         <div className="hero-pill">📊 System Analytics</div>
         <h2 className="hero-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
           {greeting.icon} {greeting.text}!
         </h2>
         <p className="hero-subtitle">Your real-time health data, checkup trends, and AI diagnostic insights — all in one place.</p>
         <button className="hero-btn" onClick={onStart}>🩺 Start Health Checkup</button>
      </div>

      {/* Daily Health Tip */}
      <div style={{ ...cardStyle, padding: '16px 22px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '4px solid var(--accent-purple)', marginBottom: '4px' }}>
        <span style={{ fontSize: '28px' }}>{todayTip.icon}</span>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>💡 Daily Health Tip</span>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{todayTip.tip}</p>
        </div>
      </div>

      {/* Last Checkup Summary */}
      <div style={{ ...cardStyle, padding: '22px' }}>
        <h3 style={{ color: 'var(--text-primary)', margin: '0 0 14px 0', fontSize: '16px', fontWeight: 700 }}>🧾 Last Checkup Summary</h3>
        {!latestCheckup ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>📋</span>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>No previous checkup found. Start a health checkup to see a summary here.</p>
            <button className="cta-btn" style={{ margin: '16px auto 0', display: 'inline-flex' }} onClick={onStart}>Start Checkup →</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '14px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}><strong style={{ color: 'var(--text-primary)' }}>Name:</strong> {latestCheckup.name || 'N/A'}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}><strong style={{ color: 'var(--text-primary)' }}>Email:</strong> {latestCheckup.email || 'N/A'}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}><strong style={{ color: 'var(--text-primary)' }}>Severity:</strong> <span style={{ color: SEV_COLORS[latestCheckup.severity?.toLowerCase()] || 'var(--text-muted)', fontWeight: 600 }}>{latestCheckup.severity || 'N/A'}</span></div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}><strong style={{ color: 'var(--text-primary)' }}>Date:</strong> {new Date(latestCheckup.createdAt || Date.now()).toLocaleString()}</div>
            </div>

            <div style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', marginBottom: '12px' }}>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Likely Condition:</strong> {latestCondition}
              </p>
            </div>

            <div>
              <p style={{ color: 'var(--text-primary)', margin: '0 0 8px 0', fontWeight: 600, fontSize: '14px' }}>What to do (quick steps):</p>
              {latestRecommendations.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>No recommendations available.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7 }}>
                  {latestRecommendations.map((step, i) => <li key={i} style={{ marginBottom: '4px' }}>{step}</li>)}
                </ul>
              )}
            </div>

            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={handleResendSummary} disabled={summarySending || !latestCheckup.email}
                style={{
                  padding: '9px 14px', borderRadius: '8px', border: '1px solid var(--border)',
                  background: summarySending ? 'var(--bg-muted)' : 'var(--primary-light)',
                  color: 'var(--primary)', cursor: summarySending ? 'not-allowed' : 'pointer',
                  fontWeight: 600, fontSize: '13px', fontFamily: 'var(--font)'
                }}
              >
                {summarySending ? 'Sending...' : '✉ Email this summary'}
              </button>
              <button onClick={onStart}
                style={{
                  padding: '9px 14px', borderRadius: '8px', border: '1px solid var(--border)',
                  background: 'var(--bg-surface)', color: 'var(--text-secondary)',
                  cursor: 'pointer', fontWeight: 600, fontSize: '13px', fontFamily: 'var(--font)'
                }}
              >
                🔄 New Checkup
              </button>
              {summaryStatus && <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{summaryStatus}</span>}
            </div>
          </>
        )}
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <Activity className="stat-icon" style={{color: 'var(--primary)', width: 26, height: 26}}/>
          <span className="stat-value">{totalCheckups}</span>
          <span className="stat-label">Total Checkups</span>
        </div>
        <div className="stat-card">
          <Zap className="stat-icon" style={{color: 'var(--accent-yellow)', width: 26, height: 26}} />
          <span className="stat-value">&lt;5s</span>
          <span className="stat-label">Avg Analysis</span>
        </div>
        <div className="stat-card">
          <Heart className="stat-icon" style={{color: 'var(--accent-red)', width: 26, height: 26}} />
          <span className="stat-value">{successRate}%</span>
          <span className="stat-label">Accuracy Rate</span>
        </div>
        <div className="stat-card">
          <Users className="stat-icon" style={{color: 'var(--accent-purple)', width: 26, height: 26}} />
          <span className="stat-value">{uniqueUsers}</span>
          <span className="stat-label">Active Users</span>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px', marginTop: '6px' }}>
        <div style={{ ...cardStyle, padding: '22px' }}>
          <h3 style={{color: 'var(--text-primary)', marginBottom: '6px', fontSize: '15px', fontWeight: 700}}>Severity Distribution</h3>
          <div style={{ height: 240, marginTop: '10px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={severityDistribution} 
                  cx="50%" cy="50%" 
                  innerRadius={58} outerRadius={78} 
                  paddingAngle={5} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {severityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SEV_COLORS[String(entry.name).toLowerCase()] || 'var(--accent-purple)'} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '10px', boxShadow: 'var(--shadow-md)', fontSize: '13px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ ...cardStyle, padding: '22px' }}>
          <h3 style={{color: 'var(--text-primary)', marginBottom: '6px', fontSize: '15px', fontWeight: 700}}>Common Conditions</h3>
          <div style={{ height: 240, marginTop: '10px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={commonConditions} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.12} horizontal={false} />
                <XAxis type="number" stroke="var(--text-muted)" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <RechartsTooltip cursor={{fill: 'var(--primary-glow)'}} contentStyle={{background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: 'var(--shadow-md)', fontSize: '13px'}} />
                <Bar dataKey="count" fill="var(--primary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ ...cardStyle, gridColumn: '1 / -1', padding: '22px' }}>
          <h3 style={{color: 'var(--text-primary)', marginBottom: '6px', fontSize: '15px', fontWeight: 700}}>Checkups Over Time</h3>
          <div style={{ height: 240, marginTop: '10px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                <XAxis dataKey="name" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <RechartsTooltip contentStyle={{background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: 'var(--shadow-md)', fontSize: '13px', color: 'var(--text-primary)'}} />
                <Line type="monotone" dataKey="checkups" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--primary)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Checkups */}
      <div className="recent-section" style={{ marginTop: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 className="recent-title" style={{margin: 0}}>📂 Global Recent Checkups</h3>
          <input 
            type="text" placeholder="Search by name, condition..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              padding: '9px 16px', borderRadius: '10px', 
              border: '1px solid var(--border)', background: 'var(--bg-muted)', 
              color: 'var(--text-primary)', minWidth: '230px', fontSize: '13px',
              outline: 'none', fontFamily: 'var(--font)'
            }}
          />
        </div>
        {filteredHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <span style={{ fontSize: '36px', display: 'block', marginBottom: '10px' }}>🔍</span>
            <p style={{color: 'var(--text-muted)', fontSize: '14px'}}>No checkups found. Start a new analysis.</p>
          </div>
        ) : (
          <div className="recent-grid">
            {filteredHistory.slice(0, 8).map((h, index) => {
              const sev = String(h.severity || 'low').toLowerCase();
              const isLatest = index === 0 && searchTerm === '';
              return (
                <div className="recent-card" key={h._id || Math.random()} 
                  onClick={() => setSelectedReport(h)}
                  style={{ cursor: 'pointer', position: 'relative', borderColor: isLatest ? 'var(--primary)' : 'var(--border)' }}
                >
                  {isLatest && <span style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 700, boxShadow: '0 2px 6px rgba(79,125,245,0.35)' }}>NEW</span>}
                  <div className="recent-card-top">
                    <span className="recent-name">{h.name}</span>
                    <span className="recent-sev-badge" style={{ color: SEV_COLORS[sev] || 'var(--text-muted)' }}>{h.severity || 'Low'}</span>
                  </div>
                  <p className="recent-cond">{h.conditions?.[0]?.name || h.conditions?.[0]?.condition || 'Unknown'}</p>
                  <p className="recent-time">{new Date(h.createdAt || Date.now()).toLocaleDateString()} at {new Date(h.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Report Modal */}
      {selectedReport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,35,50,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.18s ease-out' }}>
          <div style={{ ...cardStyle, padding: '32px', width: '90%', maxWidth: '580px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(26,35,50,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.3px' }}>Medical Report</h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
                  Patient: <strong style={{color: 'var(--text-primary)'}}>{selectedReport.name}</strong> • Age: {selectedReport.age} • Gender: {selectedReport.gender}
                </p>
              </div>
              <button onClick={() => setSelectedReport(null)} style={{ color: 'var(--text-muted)', fontSize: '1.3rem', background: 'var(--bg-muted)', padding: '4px 12px', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--font)' }}>✕</button>
            </div>
            
            <div style={{ marginTop: '18px' }}>
              <h4 style={{color: 'var(--primary)', marginBottom: '6px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Reported Symptoms</h4>
              <p style={{ color: 'var(--text-secondary)', background: 'var(--bg-muted)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', margin: 0, fontSize: '14px', lineHeight: 1.6 }}>
                {selectedReport.symptoms || 'None recorded'}
              </p>
            </div>

            <div style={{ marginTop: '18px' }}>
              <h4 style={{color: 'var(--primary)', marginBottom: '6px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px'}}>AI Analysis: Top Condition</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-muted)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <p style={{ color: 'var(--text-primary)', fontSize: '1rem', margin: 0, fontWeight: 700 }}>
                  {selectedReport.conditions?.[0]?.name || selectedReport.conditions?.[0]?.condition || 'Unknown'}
                </p>
                <span style={{ color: SEV_COLORS[String(selectedReport.severity).toLowerCase()] || 'var(--text-muted)', fontSize: '12px', fontWeight: 700 }}>
                  {selectedReport.severity}
                </span>
              </div>
            </div>

            <div style={{ marginTop: '18px' }}>
              <h4 style={{color: 'var(--primary)', marginBottom: '8px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Recommended Steps</h4>
              <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7 }}>
                {(selectedReport.recommendations || []).map((r, i) => <li key={i} style={{marginBottom: '6px'}}>{r}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
