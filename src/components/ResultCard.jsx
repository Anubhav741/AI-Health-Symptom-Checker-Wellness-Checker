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
    prob >= 70 ? '#f25f5c' :
    prob >= 40 ? '#f5a623' :
                 '#22c55e';

  return (
    <div style={{
      background: 'var(--bg-muted)', height: '6px',
      borderRadius: '4px', overflow: 'hidden', margin: '8px 0'
    }}>
      <div ref={fillRef} style={{
        background: color, height: '100%', borderRadius: '4px',
        transition: 'width 0.9s cubic-bezier(0.16, 1, 0.3, 1)'
      }} />
    </div>
  );
};

const ResultCard = ({ condition, index }) => {
  const prob = typeof condition.probability === 'number'
    ? condition.probability
    : parseInt(condition.probability, 10) || 0;

  const confidenceLevel = prob >= 80 ? 'Very High' : prob >= 50 ? 'Moderate' : 'Low';
  const confidenceColor = prob >= 80 ? '#f25f5c' : prob >= 50 ? '#f5a623' : 'var(--text-muted)';

  return (
    <div className="condition-card" style={{
      background: '#fff', border: '1px solid var(--border)',
      borderRadius: '16px', padding: '18px 20px',
      marginBottom: '0', boxShadow: 'var(--shadow-sm)',
      transition: 'all 0.18s ease', position: 'relative', overflow: 'hidden',
      animation: `slideInUp 0.3s ease ${index * 0.07}s both`
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
        background: prob >= 70 ? '#f25f5c' : 'var(--primary)', borderRadius: '4px 0 0 4px'
      }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 700 }}>
          <span style={{
            color: 'var(--text-muted)', fontSize: '0.8rem', marginRight: '8px',
            background: 'var(--bg-muted)', padding: '2px 8px', borderRadius: '6px',
            border: '1px solid var(--border)'
          }}>#{index + 1}</span>
          {condition.name || condition.condition}
        </h4>
        <span style={{
          fontSize: '1.2rem', fontWeight: 800,
          color: prob >= 70 ? '#f25f5c' : prob >= 40 ? '#f5a623' : 'var(--primary)'
        }}>
          {prob}%
        </span>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
        <span style={{ 
          fontSize: '0.7rem', fontWeight: 600, padding: '3px 10px', borderRadius: '99px', 
          background: 'var(--bg-muted)', border: '1px solid var(--border)', color: confidenceColor
        }}>
          Confidence: {confidenceLevel}
        </span>
      </div>

      <ProbBar prob={prob} />

      {condition.description && (
        <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          {condition.description}
        </p>
      )}
    </div>
  );
};

export default ResultCard;
