import { useEffect, useRef, useMemo, useState } from 'react';
import HospitalList from './HospitalList';
import ReportGenerator from './ReportGenerator';
import ResultCard from './ResultCard';
import HealthTracker from './HealthTracker';
import './Results.css';

const SEVERITY_META = {
  low:      { color: 'var(--sev-low)',  label: 'Low Risk',      icon: '🟢', bg: 'var(--sev-low-bg)'  },
  medium:   { color: 'var(--sev-med)',  label: 'Moderate Risk', icon: '🟡', bg: 'var(--sev-med-bg)'  },
  moderate: { color: 'var(--sev-med)',  label: 'Moderate Risk', icon: '🟡', bg: 'var(--sev-med-bg)'  },
  high:     { color: 'var(--sev-high)', label: 'High Risk',     icon: '🔴', bg: 'var(--sev-high-bg)' },
};

const Results = ({ results, patientName, patientData, onReset, onNewCheckup }) => {
  const { conditions = [], severity = 'low', recommendations = [] } = results;
  const sev = SEVERITY_META[severity?.toLowerCase()] || SEVERITY_META.low;
  const topCondition = conditions[0]?.name || conditions[0]?.condition || 'No clear condition identified';
  const topProbability = conditions[0]?.probability;
  const keyRecommendation = recommendations[0] || 'Monitor symptoms and consult a healthcare professional if they worsen.';
  const summarySeverityLabel = sev.label;
  const quickSummary = `${summarySeverityLabel}. Most likely concern: ${topCondition}${topProbability ? ` (${topProbability}%)` : ''}. Next step: ${keyRecommendation}`;
  const [copied, setCopied] = useState(false);

  const stableCheckupId = useMemo(() => {
    return patientData?.checkupId || `chk_${patientData?.name?.replace(/\s+/g, '_')}_${Date.now()}`;
  }, [patientData?.checkupId, patientData?.name]);

  const handlePrint = () => window.print();

  const handleDownloadReport = () => {
    const lines = [
      '═══════════════════════════════════════════',
      '  AI HEALTH ASSISTANT — DIAGNOSTIC REPORT  ',
      '═══════════════════════════════════════════',
      '',
      `Patient: ${patientName || 'N/A'}`,
      `Date: ${new Date().toLocaleString()}`,
      `Severity: ${sev.label}`,
      '',
      '─── SYMPTOMS ───',
      patientData?.symptoms || 'Not provided',
      '',
      '─── TOP CONDITIONS ───',
      ...conditions.map((c, i) => 
        `  ${i + 1}. ${c.name || c.condition} — ${c.probability || '?'}% probability`
      ),
      '',
      '─── RECOMMENDATIONS ───',
      ...recommendations.map((r, i) => `  ${i + 1}. ${r}`),
      '',
      '═══════════════════════════════════════════',
      '⚕ This is for informational purposes only.',
      '  Always consult a qualified healthcare professional.',
      '═══════════════════════════════════════════'
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HealthAI_Report_${patientName?.replace(/\s+/g, '_') || 'Patient'}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(quickSummary).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="results-wrapper">
      {/* Title bar */}
      <div className="results-header">
        <div>
          <h2 className="results-title">✅ Analysis Complete</h2>
          {patientName && (
            <p className="results-sub">
              Report for <strong>{patientName}</strong> • {new Date().toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="results-actions">
          <button id="download-report-btn" className="ghost-action-btn" onClick={handleDownloadReport} title="Download report as text">
            📥 Download
          </button>
          <button id="copy-summary-btn" className="ghost-action-btn" onClick={handleCopySummary} title="Copy summary to clipboard">
            {copied ? '✅ Copied!' : '📋 Copy'}
          </button>
          <button id="print-report-btn" className="ghost-action-btn" onClick={handlePrint} title="Print report">
            🖨 Print
          </button>
          <button id="new-checkup-btn" className="new-checkup-btn" onClick={onNewCheckup}>
            ＋ New Checkup
          </button>
        </div>
      </div>

      {/* Severity Banner */}
      <div
        className="severity-banner"
        style={{ background: sev.bg, borderColor: sev.color }}
      >
        <span className="sev-icon">{sev.icon}</span>
        <div>
          <p className="sev-label" style={{ color: sev.color }}>Overall Severity</p>
          <p className="sev-value" style={{ color: sev.color }}>{sev.label}</p>
        </div>
        {severity?.toLowerCase() === 'high' && (
          <p className="sev-warning">
            ⚠ Please consult a doctor immediately.
          </p>
        )}
      </div>

      {/* Quick Summary */}
      <section className="section">
        <h3 className="section-title">📝 Quick Summary</h3>
        <div className="quick-summary-card">
          <p className="quick-summary-text">{quickSummary}</p>
        </div>
      </section>

      {/* Patient Info Card */}
      {patientData && (
        <section className="section">
          <h3 className="section-title">👤 Patient Information</h3>
          <div className="quick-summary-card" style={{ borderLeftColor: 'var(--accent-purple)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', fontSize: '14px' }}>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Name</span><br /><strong>{patientData.name || 'N/A'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Age</span><br /><strong>{patientData.age || 'N/A'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Gender</span><br /><strong>{patientData.gender || 'N/A'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Email</span><br /><strong>{patientData.email || 'N/A'}</strong></div>
            </div>
          </div>
        </section>
      )}

      {/* Conditions */}
      <section className="section">
        <h3 className="section-title">🧬 Top Possible Conditions</h3>
        <div className="conditions-list">
          {conditions.length === 0 && (
            <p className="no-data">No conditions returned by the server.</p>
          )}
          {conditions.map((cond, i) => (
            <ResultCard key={i} condition={cond} index={i} />
          ))}
        </div>
      </section>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <section className="section">
          <h3 className="section-title">💡 Recommendations</h3>
          <ul className="rec-list">
            {recommendations.map((rec, i) => (
              <li key={i} className="rec-item">
                <span className="rec-bullet">✦</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Health Tracking Panel */}
      <section className="section">
        <h3 className="section-title">📊 Health Tracking</h3>
        <HealthTracker
          checkupId={stableCheckupId}
          email={patientData?.email || ''}
          symptoms={patientData?.symptoms || ''}
          recommendations={recommendations}
          severity={severity}
        />
      </section>

      {/* Hospitals Recommendation */}
      <HospitalList 
        topCondition={conditions[0]?.name || conditions[0]?.condition}
        patientData={patientData}
        severity={severity}
      />

      {/* Report Generator */}
      <ReportGenerator 
        patientData={patientData}
        conditions={conditions}
        severity={severity}
        recommendations={recommendations}
      />

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button id="another-checkup-btn" className="another-btn" onClick={onNewCheckup}>
          📋 Start Another Checkup
        </button>
        <button className="another-btn" onClick={onReset} style={{ background: '#fff', color: 'var(--text-secondary)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          🏠 Go Home
        </button>
      </div>

      <p className="disclaimer">
        ⚕ This report is for informational purposes only and does not constitute medical advice.
        Always consult a qualified healthcare professional.
      </p>
    </div>
  );
};

export default Results;
