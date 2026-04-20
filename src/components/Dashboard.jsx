import { useState, useEffect, useCallback } from 'react';
import SymptomForm from './SymptomForm';
import Results from './Results';
import AnalyticsDashboard from './AnalyticsDashboard';
import SkeletonLoader from './SkeletonLoader';
import Chatbot from './Chatbot';
import { analyzeSymptoms, saveCheckupToDB, getCheckups } from '../services/api';
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
   SidebarContent MUST live OUTSIDE Dashboard.
   If defined inside, React creates a new component type on every
   render → sidebar unmounts + remounts → any focused input loses focus.
───────────────────────────────────────────────────────────── */
const SidebarContent = ({
  sidebarOpen,
  setSidebarOpen,
  view,
  results,
  history,
  onHome,
  onNewCheckup,
  onViewResults,
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

      {results && (
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
            <li key={h.id} className="history-item">
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
  const [view,             setView]             = useState('home');
  const [formData,         setFormData]         = useState(null);
  const [results,          setResults]          = useState(null);
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState(null);
  const [sidebarOpen,      setSidebarOpen]      = useState(true);
  const [mobileSidebarOpen,setMobileSidebarOpen]= useState(false);
  const [history,          setHistory]          = useState([]);
  const { toast, show: showToast } = useToast();

  const fetchHistory = useCallback(() => {
    fetch("http://localhost:5001/reports")
      .then(res => res.json())
      .then(data => {
        console.log("Reports:", data);
        if (Array.isArray(data)) {
          const formatted = data.map(h => ({
            id: h._id || h.id || Math.random(),
            name: h.name,
            timestamp: h.createdAt,
            severity: h.severity,
            topCondition: h.conditions?.[0]?.name || h.conditions?.[0]?.condition || 'Unknown'
          }));
          setHistory(formatted.slice(0, 5));
        }
      })
      .catch(e => console.error("Fetch history error:", e));
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Close mobile sidebar whenever view changes
  useEffect(() => { setMobileSidebarOpen(false); }, [view]);

  const handleNewCheckup = () => {
    setResults(null);
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
      
      // Save full result backend to database
      const dbPayload = {
        ...data,
        conditions: response.conditions,
        severity: response.severity,
        recommendations: response.recommendations
      };
      await saveCheckupToDB(dbPayload);
      
      // Auto-refresh history globally
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
    setResults(null);
    setFormData(null);
    setError(null);
  };

  // Shared sidebar props — passed by reference so SidebarContent stays stable
  const sidebarProps = {
    sidebarOpen,
    setSidebarOpen,
    view,
    results,
    history,
    onHome: handleReset,
    onNewCheckup: handleNewCheckup,
    onViewResults: () => setView('results'),
  };

  return (
    <div className="dashboard-wrapper">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile Sidebar */}
      <aside className={`sidebar mobile-sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Main Area */}
      <div className="main-area">
        {/* Header */}
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
          </div>
          <button id="header-new-checkup" className="cta-btn" onClick={handleNewCheckup}>
            <span>＋</span> New Checkup
          </button>
        </header>

        {/* Content */}
        <main className="content-area">
          {loading && (
            <SkeletonLoader type="analysis" />
          )}

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

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

      {/* Persistent AI Medical Chatbot */}
      <Chatbot results={results} formData={formData} />
    </div>
  );
};

export default Dashboard;
