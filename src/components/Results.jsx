import { useEffect, useRef } from 'react';
import HospitalList from './HospitalList';
import ReportGenerator from './ReportGenerator';
import ResultCard from './ResultCard';
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

  const handlePrint = () => window.print();

  return (
    <div className="results-wrapper">
      {/* Title bar */}
      <div className="results-header">
        <div>
          <h2 className="results-title">✅ Analysis Complete</h2>
          {patientName && (
            <p className="results-sub">
              Report for <strong>{patientName}</strong>
            </p>
          )}
        </div>
        <div className="results-actions">
          <button id="print-report-btn" className="ghost-action-btn" onClick={handlePrint} title="Print report">
            🖨 Print
          </button>
          <button id="new-checkup-btn" className="new-checkup-btn" onClick={onReset}>
            ← New Checkup
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

      {/* CTA */}
      <button id="another-checkup-btn" className="another-btn" onClick={onNewCheckup}>
        📋 Start Another Checkup
      </button>

      <p className="disclaimer">
        ⚕ This report is for informational purposes only and does not constitute medical advice.
        Always consult a qualified healthcare professional.
      </p>
    </div>
  );
};

export default Results;
