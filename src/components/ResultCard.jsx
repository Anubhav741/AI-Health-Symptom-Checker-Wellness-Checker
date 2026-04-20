import { useEffect, useRef } from 'react';

const ProbBar = ({ prob }) => {
  const fillRef = useRef(null);

  useEffect(() => {
    const el = fillRef.current;
    if (!el) return;
    el.style.width = '0%';
    const t = setTimeout(() => { el.style.width = `${prob}%`; }, 100);
    return () => clearTimeout(t);
  }, [prob]);

  const color =
    prob >= 70 ? 'var(--accent-red, #ef4444)' :
    prob >= 40 ? 'var(--accent-yellow, #f59e0b)' :
                 'var(--accent-green, #10b981)';

  return (
    <div style={{ background: 'var(--border, #e2e8f0)', height: '6px', borderRadius: '4px', overflow: 'hidden', margin: '8px 0' }}>
      <div ref={fillRef} style={{ background: color, height: '100%', transition: 'width 0.8s ease-out' }} />
    </div>
  );
};

const ResultCard = ({ condition, index }) => {
  const prob = typeof condition.probability === 'number'
    ? condition.probability
    : parseInt(condition.probability, 10) || 0;

  // Calculate confidence level
  const confidenceLevel = prob >= 80 ? 'Very High' : prob >= 50 ? 'Moderate' : 'Low';
  const confidenceColor = prob >= 80 ? 'var(--accent-red)' : prob >= 50 ? 'var(--accent-yellow)' : 'var(--text-muted)';

  return (
    <div className="condition-card" style={{
      background: 'var(--card-bg, #ffffff)',
      border: '1px solid var(--border, #e2e8f0)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: prob >= 70 ? 'var(--accent-red)' : 'var(--accent-blue)' }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text, #1e293b)' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginRight: '8px' }}>#{index + 1}</span>
          {condition.name || condition.condition}
        </h4>
        
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text)' }}>
            {prob}%
          </span>
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
        <span style={{ 
          fontSize: '0.75rem', 
          fontWeight: '600', 
          padding: '2px 8px', 
          borderRadius: '12px', 
          background: 'rgba(0,0,0,0.05)',
          color: confidenceColor
        }}>
          Confidence: {confidenceLevel}
        </span>
      </div>

      <ProbBar prob={prob} />

      {condition.description && (
        <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted, #64748b)', lineHeight: '1.4' }}>
          {condition.description}
        </p>
      )}
    </div>
  );
};

export default ResultCard;
