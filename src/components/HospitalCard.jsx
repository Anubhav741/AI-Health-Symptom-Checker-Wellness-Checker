import { useState } from 'react';
import { selectHospital } from '../services/api';

const HospitalCard = ({ hospital, patientData, severity }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSelect = async () => {
    setLoading(true);
    setError(null);
    try {
      await selectHospital({
        patient_name: patientData?.name || 'Anonymous',
        symptoms: patientData?.symptoms || 'Not described',
        hospital_name: hospital.name,
        severity: severity || 'low'
      });
      setSuccess(true);
    } catch (err) {
      setError(err.friendlyMessage || 'Unable to connect to analysis server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hospital-card" style={{
      background: 'var(--card-bg, #ffffff)', 
      border: '1px solid var(--border, #e2e8f0)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text, #1e293b)' }}>
            <span style={{ marginRight: '8px' }}>{hospital.icon}</span> 
            {hospital.name}
          </h4>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted, #64748b)', fontSize: '0.9rem', textTransform: 'capitalize' }}>
            {hospital.specialist} • {hospital.type}
          </p>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted, #64748b)', fontSize: '0.95rem' }}>
            📍 {hospital.location} {hospital.distance ? ` • ${hospital.distance}` : ''}
          </p>
          {hospital.phone && (
            <p style={{ margin: '6px 0 0 0', fontSize: '0.95rem' }}>
               📞 <a href={`tel:${hospital.phone}`} style={{color: 'var(--accent-blue, #0ea5e9)', textDecoration: 'none', fontWeight: '500'}}>{hospital.phone}</a>
            </p>
          )}
        </div>
        
        {hospital.mapUrl && (
          <a href={hospital.mapUrl} target="_blank" rel="noreferrer" style={{
            fontSize: '0.85rem', color: 'var(--accent-blue, #0ea5e9)', textDecoration: 'none', 
            background: 'rgba(14, 165, 233, 0.1)', padding: '6px 12px', borderRadius: '16px',
            fontWeight: '600', whiteSpace: 'nowrap'
          }}>
            🗺️ Map
          </a>
        )}
      </div>

      {error && <p style={{ color: 'var(--accent-red, #ef4444)', margin: 0, fontSize: '0.9rem' }}>{error}</p>}
      
      {success ? (
        <div style={{ padding: '10px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--accent-green, #16a34a)', borderRadius: '8px', textAlign: 'center', marginTop: '4px', fontWeight: '500' }}>
          ✅ Hospital selection submitted!
        </div>
      ) : (
        <button 
          onClick={handleSelect} 
          disabled={loading}
          style={{
            marginTop: '4px', padding: '10px', width: '100%', border: 'none', borderRadius: '8px',
            background: loading ? 'var(--border, #e2e8f0)' : 'var(--accent-blue, #0ea5e9)', 
            color: loading ? 'var(--text-muted, #64748b)' : '#ffffff',
            fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s',
            boxShadow: '0 2px 4px rgba(14, 165, 233, 0.2)'
          }}
        >
          {loading ? 'Processing...' : 'Select Hospital'}
        </button>
      )}
    </div>
  );
};

export default HospitalCard;
