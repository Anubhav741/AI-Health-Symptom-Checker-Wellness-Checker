import { useState, useEffect, useCallback } from 'react';
import SymptomForm from './SymptomForm';
import Results from './Results';
import AnalyticsDashboard from './AnalyticsDashboard';
import SkeletonLoader from './SkeletonLoader';
import Chatbot from './Chatbot';
import GamificationBar from './GamificationBar';
import ThemeToggle from './ThemeToggle';
import { analyzeSymptoms, saveCheckupToDB, getCheckupById } from '../services/api';
import './Dashboard.css';

/* ── Toast helper ── */
const useToast = () => {
  const [toast, setToast] = useState(null);
  const show = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }, []);
  return { toast, show };
};

/* ─────────────────────────────────────────────────────────────
   PatientSummaryModal — shows when clicking a history item
   instead of navigating away / refreshing
───────────────────────────────────────────────────────────── */
const PatientSummaryModal = ({ report, onClose, onViewFull }) => {
  if (!report) return null;
  const sevColors = { low: '#22c55e', moderate: '#f5a623', medium: '#f5a623', high: '#f25f5c' };
  const sev = (report.severity || 'low').toLowerCase();
  const condition = report.conditions?.[0]?.name || report.conditions?.[0]?.condition || 'Unknown';
  const recs = Array.isArray(report.recommendations) ? report.recommendations.slice(0, 4) : [];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(26,35,50,0.3)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
      animation: 'fadeIn 0.15s ease-out'
    }} onClick={onClose}>
      <div style={{
        background: '#fff', border: '1px solid var(--border)', borderRadius: '20px',
        padding: '28px 30px', width: '90%', maxWidth: '500px', maxHeight: '80vh',
        overflowY: 'auto', boxShadow: '0 20px 60px rgba(26,35,50,0.18)',
        animation: 'fadeUp 0.2s ease-out'
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
              {report.name || 'Patient'}
            </h2>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
              {report.age && `Age: ${report.age}`} {report.gender && `• ${report.gender}`} {report.email && `• ${report.email}`}
            </p>
          </div>
          <button onClick={onClose} style={{
            color: 'var(--text-muted)', fontSize: '1.2rem', background: 'var(--bg-muted)',
            padding: '4px 11px', borderRadius: '8px', border: '1px solid var(--border)',
            cursor: 'pointer', fontFamily: 'var(--font)'
          }}>✕</button>
        </div>

        {/* Severity */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
          background: sev === 'high' ? '#fff5f5' : sev === 'moderate' || sev === 'medium' ? '#fffbeb' : '#f0fdf4',
          border: `1.5px solid ${sevColors[sev] || '#e2e8f0'}`,
          borderRadius: '12px', marginBottom: '16px'
        }}>
          <span style={{ fontSize: '24px' }}>{sev === 'high' ? '🔴' : sev === 'low' ? '🟢' : '🟡'}</span>
          <div>
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: sevColors[sev], display: 'block' }}>Severity</span>
            <span style={{ fontSize: '16px', fontWeight: 800, color: sevColors[sev], textTransform: 'capitalize' }}>{report.severity || 'Low'}</span>
          </div>
        </div>

        {/* Likely Condition */}
        <div style={{ marginBottom: '14px' }}>
          <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', marginBottom: '6px' }}>Likely Condition</h4>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{condition}</p>
        </div>

        {/* Symptoms */}
        {report.symptoms && (
          <div style={{ marginBottom: '14px' }}>
            <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', marginBottom: '6px' }}>Reported Symptoms</h4>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, background: 'var(--bg-muted)', padding: '10px 14px', borderRadius: '10px' }}>{report.symptoms}</p>
          </div>
        )}

        {/* Recommendations */}
        {recs.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', marginBottom: '6px' }}>Quick Recommendations</h4>
            <ul style={{ margin: 0, paddingLeft: '16px', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.7 }}>
              {recs.map((r, i) => <li key={i} style={{ marginBottom: '4px' }}>{r}</li>)}
            </ul>
          </div>
        )}

        {/* Date */}
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px' }}>
          📅 {report.createdAt ? new Date(report.createdAt).toLocaleString() : 'Date not available'}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={onViewFull} style={{
            padding: '10px 18px', background: 'var(--primary)', color: '#fff',
            borderRadius: '10px', fontSize: '13px', fontWeight: 600,
            boxShadow: '0 2px 8px rgba(79,125,245,0.3)',
            cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s'
          }}>📊 View Full Report</button>
          <button onClick={() => window.print()} style={{
            padding: '10px 18px', background: '#fff', color: 'var(--text-secondary)',
            borderRadius: '10px', fontSize: '13px', fontWeight: 600,
            border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s'
          }}>🖨 Print</button>
          <button onClick={onClose} style={{
            padding: '10px 18px', background: '#fff', color: 'var(--text-muted)',
            borderRadius: '10px', fontSize: '13px', fontWeight: 600,
            border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s'
          }}>Close</button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   SidebarContent — lives OUTSIDE Dashboard to avoid remounts
───────────────────────────────────────────────────────────── */
const SidebarContent = ({
  sidebarOpen,
  setSidebarOpen,
  view,
  showResults,
  history,
  onHome,
  onNewCheckup,
  onViewResults,
  onHistoryClick,
}) => (
  <>
    <div className="sidebar-logo">
      <span className="logo-icon">🩺</span>
      {sidebarOpen && <span className="logo-text">HealthAI</span>}
    </div>

    <nav className="sidebar-nav">
      <button
        id="nav-dashboard"
        className={`nav-item ${view === 'home' ? 'active' : ''}`}
        onClick={onHome}
      >
        <span className="nav-icon">🏠</span>
        {sidebarOpen && <span>Dashboard</span>}
      </button>

      <button
        id="nav-new-checkup"
        className={`nav-item ${view === 'form' ? 'active' : ''}`}
        onClick={onNewCheckup}
      >
        <span className="nav-icon">📋</span>
        {sidebarOpen && <span>New Checkup</span>}
      </button>

      {showResults && (
        <button
          id="nav-last-results"
          className={`nav-item ${view === 'results' ? 'active' : ''}`}
          onClick={onViewResults}
        >
          <span className="nav-icon">📊</span>
          {sidebarOpen && <span>Last Results</span>}
        </button>
      )}
    </nav>

    {/* History Section */}
    {sidebarOpen && history.length > 0 && (
      <div className="sidebar-history">
        <p className="history-label">Recent Checkups</p>
        <ul className="history-list">
          {history.map((h) => (
            <li 
              key={h.id} 
              className="history-item" 
              onClick={() => onHistoryClick(h)}
              style={{ cursor: 'pointer' }}
            >
              <span className="history-dot" data-sev={h.severity?.toLowerCase()} />
              <div className="history-meta">
                <span className="history-name">{h.name}</span>
                <span className="history-cond">{h.topCondition}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    )}

    <div className="sidebar-footer">
      <button
        id="sidebar-toggle"
        className="toggle-btn"
        onClick={() => setSidebarOpen((o) => !o)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? '◀' : '▶'}
      </button>
    </div>
  </>
);

/* ── Main Dashboard ── */
const Dashboard = () => {
  const [view, setView] = useState(() => {
    return localStorage.getItem('health_view') || 'home';
  });
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('health_formData');
    return saved ? JSON.parse(saved) : null;
  });
  const [results, setResults] = useState(() => {
    const saved = localStorage.getItem('health_results');
    return saved ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [patientModal, setPatientModal] = useState(null);
  const { toast, show: showToast } = useToast();

  const [everHadResults, setEverHadResults] = useState(() => {
    return !!localStorage.getItem('health_results');
  });

  useEffect(() => {
    localStorage.setItem('health_view', view);
  }, [view]);

  useEffect(() => {
    if (formData) localStorage.setItem('health_formData', JSON.stringify(formData));
    else localStorage.removeItem('health_formData');
  }, [formData]);

  useEffect(() => {
    if (results) localStorage.setItem('health_results', JSON.stringify(results));
    else localStorage.removeItem('health_results');
  }, [results]);

  useEffect(() => {
    if (results) setEverHadResults(true);
  }, [results]);

  const fetchHistory = useCallback(() => {
    fetch("http://localhost:5001/reports")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const apiFormatted = data.map(h => ({
            id: h._id || h.id || Math.random().toString(),
            name: h.name,
            email: h.email,
            age: h.age,
            gender: h.gender,
            symptoms: h.symptoms,
            timestamp: h.createdAt,
            severity: h.severity,
            conditions: h.conditions,
            recommendations: h.recommendations,
            topCondition: h.conditions?.[0]?.name || h.conditions?.[0]?.condition || 'Unknown'
          }));
          const combined = [...apiFormatted];
          const localHistoryStr = localStorage.getItem('health_history');
          if (localHistoryStr) {
            try {
              const localHistory = JSON.parse(localHistoryStr);
              localHistory.forEach(lh => {
                if (!combined.find(c => c.id === lh.id)) {
                  combined.push(lh);
                }
              });
            } catch (e) {}
          }
          setHistory(combined.slice(0, 15));
        }
      })
      .catch(e => {
        console.error("Fetch history error, falling back to local:", e);
        const localHistoryStr = localStorage.getItem('health_history');
        if (localHistoryStr) {
          try {
            setHistory(JSON.parse(localHistoryStr).slice(0, 15));
          } catch (err) {}
        }
      });
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => { setMobileSidebarOpen(false); }, [view]);

  /* ─── FIXED: History click now opens a modal summary instead of navigating ─── */
  const handleHistoryClick = (historyItem) => {
    // historyItem already contains all the data from API or localStorage
    // Try to load full report from localStorage first (local reports have full data)
    const localReport = localStorage.getItem(`health_report_${historyItem.id}`);
    
    let report;
    if (localReport) {
      report = JSON.parse(localReport);
    } else if (historyItem.conditions) {
      // API data already has conditions embedded
      report = {
        ...historyItem,
        createdAt: historyItem.timestamp
      };
    } else {
      // Minimal data — still show what we have
      report = {
        name: historyItem.name,
        severity: historyItem.severity,
        conditions: [{ name: historyItem.topCondition }],
        createdAt: historyItem.timestamp,
        recommendations: []
      };
    }

    setPatientModal(report);
    if (window.innerWidth <= 768) setMobileSidebarOpen(false);
  };

  /* ─── View Full Report from modal ─── */
  const handleViewFullReport = () => {
    if (!patientModal) return;
    
    setFormData({
      name: patientModal.name,
      email: patientModal.email,
      age: patientModal.age,
      gender: patientModal.gender,
      symptoms: patientModal.symptoms,
      checkupId: patientModal.checkupId || patientModal._id || patientModal.id
    });
    setResults({
      conditions: patientModal.conditions || [],
      severity: patientModal.severity || 'low',
      recommendations: patientModal.recommendations || []
    });
    setPatientModal(null);
    setView('results');
  };

  const handleNewCheckup = () => {
    setError(null);
    setView('form');
  };

  const handleFormSubmit = async (data) => {
    setFormData(data);
    setLoading(true);
    setError(null);
    try {
      const response = await analyzeSymptoms(data);
      setResults(response);
      
      const checkupId = `chk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      
      const dbPayload = {
        ...data,
        conditions: response.conditions,
        severity: response.severity,
        recommendations: response.recommendations
      };
      
      try {
        await saveCheckupToDB(dbPayload);
      } catch (dbErr) {
        console.warn("DB offline, saved checkup locally entirely");
      }
      
      // Save full report to local storage for offline history
      localStorage.setItem(`health_report_${checkupId}`, JSON.stringify({ ...dbPayload, id: checkupId, createdAt: new Date().toISOString() }));

      // Update local history array
      const localHistoryStr = localStorage.getItem('health_history');
      let localHistory = localHistoryStr ? JSON.parse(localHistoryStr) : [];
      localHistory.unshift({
        id: checkupId,
        name: data.name,
        email: data.email,
        age: data.age,
        gender: data.gender,
        symptoms: data.symptoms,
        timestamp: new Date().toISOString(),
        severity: response.severity,
        conditions: response.conditions,
        recommendations: response.recommendations,
        topCondition: response.conditions?.[0]?.name || response.conditions?.[0]?.condition || 'Unknown'
      });
      localStorage.setItem('health_history', JSON.stringify(localHistory));
      
      setFormData(prev => ({ ...prev, checkupId }));
      
      await fetchHistory();

      setView('results');
      showToast('✅ Analysis complete!');
    } catch (err) {
      setError(
        err.friendlyMessage || err?.response?.data?.message || 'Unable to connect to analysis server'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setView('home');
    setError(null);
  };

  const handleViewResults = () => {
    if (!results) {
      const savedResults = localStorage.getItem('health_results');
      const savedFormData = localStorage.getItem('health_formData');
      if (savedResults) setResults(JSON.parse(savedResults));
      if (savedFormData) setFormData(JSON.parse(savedFormData));
    }
    setView('results');
  };

  const sidebarProps = {
    sidebarOpen,
    setSidebarOpen,
    view,
    showResults: !!results || everHadResults,
    history,
    onHome: handleReset,
    onNewCheckup: handleNewCheckup,
    onViewResults: handleViewResults,
    onHistoryClick: handleHistoryClick,
  };

  return (
    <div className="dashboard-wrapper">
      {mobileSidebarOpen && (
        <div className="mobile-overlay" onClick={() => setMobileSidebarOpen(false)} />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <SidebarContent {...sidebarProps} />
      </aside>

      <aside className={`sidebar mobile-sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
        <SidebarContent {...sidebarProps} />
      </aside>

      <div className="main-area">
        <header className="top-header">
          <div className="header-left">
            <button
              id="mobile-menu-btn"
              className="mobile-menu-btn"
              onClick={() => setMobileSidebarOpen((o) => !o)}
              aria-label="Open menu"
            >
              ☰
            </button>
            <h1 className="header-title">AI Health Assistant</h1>
            <span className="header-badge">Beta</span>
            <ThemeToggle />
          </div>
          <button id="header-new-checkup" className="cta-btn" onClick={handleNewCheckup}>
            <span>＋</span> New Checkup
          </button>
        </header>

        <main className="content-area">
          <GamificationBar totalCheckups={history.length} />

          {loading && <SkeletonLoader type="analysis" />}

          {error && (
            <div className="error-card">
              <span className="error-icon">⚠️</span>
              <h3 className="error-title">Connection Failed</h3>
              <p>{error}</p>
              <div className="error-actions">
                <button id="retry-btn" className="retry-btn" onClick={handleNewCheckup}>
                  Try Again
                </button>
                <button id="go-home-btn" className="ghost-btn" onClick={handleReset}>
                  Go Home
                </button>
              </div>
            </div>
          )}

          {!loading && !error && view === 'home' && (
            <AnalyticsDashboard onStart={handleNewCheckup} />
          )}

          {!loading && !error && view === 'form' && (
            <SymptomForm onSubmit={handleFormSubmit} loading={loading} />
          )}

          {!loading && !error && view === 'results' && results && (
            <Results
              results={results}
              patientName={formData?.name}
              patientData={formData}
              onReset={handleReset}
              onNewCheckup={handleNewCheckup}
            />
          )}
        </main>
      </div>

      {/* Patient Summary Modal */}
      {patientModal && (
        <PatientSummaryModal
          report={patientModal}
          onClose={() => setPatientModal(null)}
          onViewFull={handleViewFullReport}
        />
      )}

      {toast && <div className="toast">{toast}</div>}

      <Chatbot results={results} formData={formData} />
    </div>
  );
};

export default Dashboard;
