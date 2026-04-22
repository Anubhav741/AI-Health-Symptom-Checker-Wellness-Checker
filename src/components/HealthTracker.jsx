import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initializeTracking,
  updateTrackingActions,
  confirmRecovery as confirmRecoveryAPI,
  getTracking,
} from '../services/api';
import './HealthTracker.css';

/* ─── Trend icon map ─── */
const TREND_ICONS = {
  improving: '📈',
  stable: '➡️',
  worsening: '📉',
};

/* ─── Nurse-style care reminders based on severity ─── */
const NURSE_REMINDERS = {
  high: [
    { icon: '🚨', text: 'Schedule a doctor visit within the next 24 hours', priority: 'urgent' },
    { icon: '💊', text: 'Take any prescribed medications on time', priority: 'high' },
    { icon: '📋', text: 'Keep a log of your symptoms — note any changes', priority: 'high' },
    { icon: '🚫', text: 'Avoid strenuous activities until cleared by a doctor', priority: 'medium' },
    { icon: '📞', text: 'Call emergency services if symptoms worsen suddenly', priority: 'urgent' },
  ],
  moderate: [
    { icon: '🩺', text: 'Consider seeing a healthcare provider this week', priority: 'medium' },
    { icon: '💧', text: 'Stay well hydrated — drink 8+ glasses of water', priority: 'medium' },
    { icon: '😴', text: 'Get 8 hours of rest tonight — sleep aids recovery', priority: 'medium' },
    { icon: '🌡️', text: 'Monitor your temperature twice daily', priority: 'low' },
    { icon: '📝', text: 'Note any new symptoms that appear', priority: 'low' },
  ],
  low: [
    { icon: '✅', text: 'Continue your normal routine with extra rest', priority: 'low' },
    { icon: '🥗', text: 'Eat nutritious meals to support your immune system', priority: 'low' },
    { icon: '🚶', text: 'Light exercise like a 20-min walk can help', priority: 'low' },
    { icon: '💧', text: 'Keep hydrated throughout the day', priority: 'low' },
  ],
};

/* ─── HealthTracker Component ─── */
const HealthTracker = ({ checkupId, email, symptoms, recommendations, severity }) => {
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  // Recovery confirmation state
  const [selectedResolved, setSelectedResolved] = useState([]);
  const [satisfaction, setSatisfaction] = useState(0);
  const [recoveryConfirmed, setRecoveryConfirmed] = useState(false);
  const [recoveryError, setRecoveryError] = useState(null);

  const savedTimer = useRef(null);

  // ── Initialize or fetch existing tracking ──
  const bootstrap = useCallback(async () => {
    if (!checkupId || !email) return;
    setLoading(true);
    
    const localTrackStr = localStorage.getItem(`health_track_${checkupId}`);
    if (localTrackStr) {
      try {
        setTracking(JSON.parse(localTrackStr));
        setLoading(false);
        return;
      } catch (e) {}
    }

    try {
      const existing = await getTracking(checkupId);
      if (existing && (existing.symptom_status || existing.data?.symptom_status)) {
        const data = existing.data || existing;
        setTracking(data);
        localStorage.setItem(`health_track_${checkupId}`, JSON.stringify(data));
        setLoading(false);
        return;
      }

      const result = await initializeTracking({
        checkupId, email, symptoms, recommendations, severity,
      });
      if (result?.data) {
        setTracking(result.data);
        localStorage.setItem(`health_track_${checkupId}`, JSON.stringify(result.data));
      }
    } catch (err) {
      console.error('Failed to bootstrap tracking:', err);
    } finally {
      setLoading(false);
    }
  }, [checkupId, email, symptoms, recommendations, severity]);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  // ── Toggle action checkbox ──
  const toggleAction = useCallback(async (index) => {
    if (!tracking || saving) return;
    setSaving(true);

    const updatedActions = tracking.action_tracking.map((a, i) => ({
      ...a,
      status: i === index ? (a.status === 'done' ? 'not_done' : 'done') : a.status,
    }));

    try {
      const result = await updateTrackingActions({ checkupId, action_tracking: updatedActions });
      if (result?.data) {
        setTracking(result.data);
        localStorage.setItem(`health_track_${checkupId}`, JSON.stringify(result.data));
      } else {
        const newTrack = { ...tracking, action_tracking: updatedActions };
        setTracking(newTrack);
        localStorage.setItem(`health_track_${checkupId}`, JSON.stringify(newTrack));
      }
      flashSaved();
    } catch (err) {
      console.error('Failed to toggle action:', err);
      // Optimistic local-only update
      const newTrack = { ...tracking, action_tracking: updatedActions };
      setTracking(newTrack);
      localStorage.setItem(`health_track_${checkupId}`, JSON.stringify(newTrack));
      flashSaved();
    } finally {
      setSaving(false);
    }
  }, [tracking, saving, checkupId]);

  // ── Confirm recovery ──
  const handleConfirmRecovery = useCallback(async () => {
    if (!tracking || saving) return;
    setSaving(true);
    setRecoveryError(null);

    try {
      const result = await confirmRecoveryAPI({
        checkupId, resolvedSymptoms: selectedResolved,
        satisfaction: satisfaction > 0 ? satisfaction : undefined,
      });

      if (result?.data) {
        setTracking(result.data);
        localStorage.setItem(`health_track_${checkupId}`, JSON.stringify(result.data));
        setRecoveryConfirmed(true);
        flashSaved();
      } else {
        // Local-only recovery confirmation
        const updated = {
          ...tracking,
          health_trend: 'improving',
          recovery_summary: `Recovery confirmed. ${selectedResolved.length} symptom(s) resolved. Satisfaction: ${satisfaction || 'N/A'}/5.`,
          symptom_status: (tracking.symptom_status || []).map(s => ({
            ...s,
            status: selectedResolved.includes(s.symptom) ? 'resolved' : s.status
          }))
        };
        setTracking(updated);
        localStorage.setItem(`health_track_${checkupId}`, JSON.stringify(updated));
        setRecoveryConfirmed(true);
        flashSaved();
      }
    } catch (err) {
      // Local-only fallback
      const updated = {
        ...tracking,
        health_trend: 'improving',
        recovery_summary: `Recovery confirmed locally. ${selectedResolved.length} symptom(s) resolved.`,
        symptom_status: (tracking.symptom_status || []).map(s => ({
          ...s,
          status: selectedResolved.includes(s.symptom) ? 'resolved' : s.status
        }))
      };
      setTracking(updated);
      localStorage.setItem(`health_track_${checkupId}`, JSON.stringify(updated));
      setRecoveryConfirmed(true);
      flashSaved();
    } finally {
      setSaving(false);
    }
  }, [tracking, saving, checkupId, selectedResolved, satisfaction]);

  const flashSaved = () => {
    setSavedMsg(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSavedMsg(false), 2000);
  };

  const toggleResolvedSymptom = (symptom) => {
    setSelectedResolved((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  // ── Derived values ──
  const actionsDone = tracking?.action_tracking?.filter((a) => a.status === 'done').length || 0;
  const actionsTotal = tracking?.action_tracking?.length || 0;
  const progressPercent = actionsTotal > 0 ? Math.round((actionsDone / actionsTotal) * 100) : 0;

  const nurseReminders = NURSE_REMINDERS[severity?.toLowerCase()] || NURSE_REMINDERS.low;

  // ── Loading state ──
  if (loading) {
    return (
      <div className="health-tracker">
        <div className="tracker-section" style={{ textAlign: 'center', padding: '40px' }}>
          <div className="tracker-loading-spinner">
            <div className="tracker-spinner-ring" />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '16px' }}>
            Initializing health tracking…
          </p>
        </div>
      </div>
    );
  }

  if (!tracking) return null;

  return (
    <div className="health-tracker" id="health-tracker-panel">
      {/* ─── 1. Health Trend Banner ─── */}
      <div className="trend-banner" data-trend={tracking.health_trend}>
        <span className="trend-icon">{TREND_ICONS[tracking.health_trend] || '➡️'}</span>
        <div className="trend-info">
          <span className="trend-label">Health Trend</span>
          <span className="trend-value">{tracking.health_trend}</span>
        </div>
      </div>

      {/* ─── 2. Alert ─── */}
      {tracking.alert && (
        <div className="tracker-alert" id="health-alert-banner">
          <span style={{ fontSize: '22px', flexShrink: 0 }}>🚨</span>
          <span>{tracking.alert}</span>
        </div>
      )}

      {/* ─── 3. 🩺 Nurse Care Plan — replaces raw JSON ─── */}
      <div className="tracker-section">
        <h4 className="tracker-section-title">🩺 Nurse Care Plan</h4>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Based on your <strong style={{ color: severity?.toLowerCase() === 'high' ? 'var(--accent-red)' : severity?.toLowerCase() === 'moderate' ? 'var(--accent-yellow)' : 'var(--accent-green)' }}>
          {severity || 'low'} severity</strong> assessment, here are your care instructions:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {nurseReminders.map((reminder, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              padding: '10px 14px',
              background: reminder.priority === 'urgent' ? 'var(--sev-high-bg)' : 
                         reminder.priority === 'high' ? '#fffbeb' : 'var(--bg-muted)',
              border: `1px solid ${reminder.priority === 'urgent' ? '#fca5a5' : 
                      reminder.priority === 'high' ? '#fde68a' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)', transition: 'all 0.15s'
            }}>
              <span style={{ fontSize: '18px', flexShrink: 0 }}>{reminder.icon}</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5, fontWeight: 500 }}>{reminder.text}</span>
              </div>
              {reminder.priority === 'urgent' && (
                <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'var(--accent-red)', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0, alignSelf: 'center' }}>
                  Urgent
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── 4. Action Tracking (Checkbox Cards) ─── */}
      {tracking.action_tracking && tracking.action_tracking.length > 0 && (
        <div className="tracker-section">
          <h4 className="tracker-section-title">
            ✅ Action Tracking
            <span className={`saved-indicator ${savedMsg ? 'show' : ''}`}>
              💾 Saved
            </span>
          </h4>

          <div className="action-progress">
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="progress-text">{actionsDone}/{actionsTotal}</span>
          </div>

          <div className="action-list">
            {tracking.action_tracking.map((action, i) => (
              <div
                key={i}
                id={`action-item-${i}`}
                className={`action-item ${action.status === 'done' ? 'done' : ''}`}
                onClick={() => toggleAction(i)}
              >
                <div className="action-checkbox">
                  <span className="action-checkmark">✓</span>
                </div>
                <span className="action-text">{action.recommendation}</span>
                <span className={`action-badge ${action.status}`}>
                  {action.status === 'done' ? 'Done' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 5. Symptom Status Grid ─── */}
      {tracking.symptom_status && tracking.symptom_status.length > 0 && (
        <div className="tracker-section">
          <h4 className="tracker-section-title">🩺 Symptom Status</h4>
          <div className="symptom-status-grid">
            {tracking.symptom_status.map((sym, i) => (
              <div key={i} className="symptom-status-item">
                <span className="symptom-dot" data-status={sym.status} />
                <span className="symptom-name">{sym.symptom}</span>
                <span className="symptom-badge" data-status={sym.status}>
                  {sym.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 6. Recovery Summary (readable, not JSON) ─── */}
      {tracking.recovery_summary && (
        <div className="recovery-card">
          <h4 className="tracker-section-title" style={{ marginBottom: '10px' }}>
            🎉 Recovery Summary
          </h4>
          <p className="recovery-text">{tracking.recovery_summary}</p>
        </div>
      )}

      {/* ─── 7. Recovery Confirmation Section ─── */}
      {!recoveryConfirmed && (
        <div className="tracker-section recovery-confirm-section">
          <h4 className="tracker-section-title">💪 Confirm Recovery</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Select symptoms that have improved or resolved:
          </p>

          <div className="recovery-symptom-select">
            {(tracking.symptom_status || [])
              .filter((s) => s.status !== 'resolved')
              .map((sym, i) => (
                <button
                  key={i}
                  className={`recovery-symptom-chip ${selectedResolved.includes(sym.symptom) ? 'selected' : ''}`}
                  onClick={() => toggleResolvedSymptom(sym.symptom)}
                >
                  {selectedResolved.includes(sym.symptom) ? '✓ ' : ''}
                  {sym.symptom}
                </button>
              ))}
            {(tracking.symptom_status || []).filter((s) => s.status !== 'resolved').length === 0 && (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                All symptoms already resolved. You can still rate your satisfaction below.
              </p>
            )}
          </div>

          <div className="satisfaction-row">
            <span className="satisfaction-label">How satisfied are you?</span>
            <div className="satisfaction-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  id={`satisfaction-star-${star}`}
                  className={`star-btn ${star <= satisfaction ? 'active' : ''}`}
                  onClick={() => setSatisfaction(star)}
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>

          {recoveryError && (
            <div className="recovery-error-msg">
              <span>⚠️</span> {recoveryError}
            </div>
          )}

          <button
            id="confirm-recovery-btn"
            className="recover-btn"
            onClick={handleConfirmRecovery}
            disabled={saving || (selectedResolved.length === 0 && satisfaction === 0)}
          >
            {saving ? (
              <><span className="btn-mini-spinner" /> Saving…</>
            ) : (
              'Confirm Recovery'
            )}
          </button>
        </div>
      )}

      {/* Recovery success state */}
      {recoveryConfirmed && (
        <div className="recovery-card recovery-success-card" style={{ textAlign: 'center' }}>
          <div className="recovery-success-icon">🎊</div>
          <p className="recovery-text">
            Recovery confirmed! Thank you for your feedback.
            {satisfaction > 0 && (
              <span> Your rating: {'⭐'.repeat(satisfaction)}</span>
            )}
          </p>
        </div>
      )}

      {/* ─── 8. Readable Tracking Overview (replaces raw JSON) ─── */}
      <div className="tracker-section" style={{ background: 'var(--bg-muted)', border: '1px dashed var(--border)' }}>
        <h4 className="tracker-section-title">📋 Tracking Overview</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          <div style={{ padding: '10px 14px', background: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-light)', display: 'block' }}>Health Trend</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: tracking.health_trend === 'improving' ? 'var(--accent-green)' : tracking.health_trend === 'worsening' ? 'var(--accent-red)' : 'var(--accent-yellow)', textTransform: 'capitalize' }}>
              {TREND_ICONS[tracking.health_trend]} {tracking.health_trend || 'Stable'}
            </span>
          </div>
          <div style={{ padding: '10px 14px', background: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-light)', display: 'block' }}>Actions Done</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)' }}>{actionsDone} / {actionsTotal}</span>
          </div>
          <div style={{ padding: '10px 14px', background: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-light)', display: 'block' }}>Symptoms</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{tracking.symptom_status?.length || 0} tracked</span>
          </div>
          <div style={{ padding: '10px 14px', background: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-light)', display: 'block' }}>Progress</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: progressPercent >= 80 ? 'var(--accent-green)' : progressPercent >= 40 ? 'var(--accent-yellow)' : 'var(--text-secondary)' }}>{progressPercent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthTracker;
