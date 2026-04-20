import { useMemo, useState, useEffect } from 'react';
import HospitalCard from './HospitalCard';
import { hospitals as staticHospitals } from '../data/hospitals';
import { getSpecialist } from '../data/mapSpecialist';
import { fetchHospitals } from '../services/api';

const HospitalList = ({ topCondition, patientData, severity }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [hospitals, setHospitals] = useState(staticHospitals);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLocation({ lat, lng });
          
          try {
            const data = await fetchHospitals(lat, lng);
            if (data && data.length > 0) {
              const liveHospitals = data.map(h => ({
                ...h,
                specialist: 'general' // Ensure they safely fallback in the view logic
              }));
              setHospitals(liveHospitals);
            }
          } catch (e) {
            console.error("Error fetching live hospitals", e);
          }
          
          setLoadingLocation(false);
        },
        (error) => {
          setLoadingLocation(false);
        }
      );
    } else {
      setLoadingLocation(false);
    }
  }, []);

  const recommendedSpecialist = useMemo(() => {
    return getSpecialist(topCondition);
  }, [topCondition]);

  const recommendedHospitals = useMemo(() => {
    // Show hospitals that match the specialist type, fallback to 'general' if none
    const matches = hospitals.filter(h => h.specialist === recommendedSpecialist);
    if (matches.length > 0) return matches;
    return hospitals.filter(h => h.specialist === 'general');
  }, [recommendedSpecialist, hospitals]);

  if (!topCondition) return null;

  return (
    <section className="section hospital-section" style={{ marginTop: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h3 className="section-title" style={{ margin: 0 }}>🏥 Nearby Hospitals</h3>
          {userLocation ? (
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--accent-green)' }}>📍 Location detected automatically</p>
          ) : (
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>📍 Using default region</p>
          )}
        </div>
        <span style={{ 
          background: 'rgba(14, 165, 233, 0.1)', 
          color: 'var(--accent-blue, #0ea5e9)', 
          padding: '4px 12px', 
          borderRadius: '16px', 
          fontSize: '0.85rem',
          fontWeight: '600',
          textTransform: 'capitalize'
        }}>
          Suggested: {recommendedSpecialist}
        </span>
      </div>
      
      <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.95rem', marginBottom: '20px' }}>
        Based on your primary symptom profile ({topCondition}), we recommend consulting a <strong>{recommendedSpecialist.charAt(0).toUpperCase() + recommendedSpecialist.slice(1)}</strong>. Here are available facilities:
      </p>

      <div className="hospital-grid">
        {recommendedHospitals.map(hospital => (
          <HospitalCard 
            key={hospital.id} 
            hospital={hospital} 
            patientData={patientData}
            severity={severity}
          />
        ))}
      </div>
    </section>
  );
};

export default HospitalList;
