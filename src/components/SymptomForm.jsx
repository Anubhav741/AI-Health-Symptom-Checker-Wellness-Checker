import { useState } from 'react';
import './SymptomForm.css';

/* ─── Options Data ─── */
const SYMPTOMS_DATA = {
  'Screen/Study Related': ['Headache', 'Eye strain', 'Blurred vision', 'Neck pain', 'Back pain'],
  'Energy/Fatigue': ['Fatigue', 'Drowsiness', 'Weakness', 'Difficulty concentrating'],
  'Hydration/Body': ['Dry mouth', 'Dizziness', 'Dark urine', 'Excessive thirst'],
  'General Illness': ['Fever', 'Nausea', 'Vomiting', 'Body aches', 'Chills'],
  'Mental Health': ['Stress', 'Anxiety', 'Irritability', 'Low mood', 'Lack of motivation'],
  'Other Important': ['Rapid heartbeat', 'Shortness of breath', 'Sweating', 'Loss of appetite']
};

const LIFESTYLE_DATA = {
  sleep: { label: 'Hours of Sleep', opts: ['<4', '4-6', '6-8', '8+'] },
  screen: { label: 'Daily Screen Time', opts: ['<2', '2-5', '5-8', '8+'] },
  water: { label: 'Water Intake', opts: ['<1L', '1-2L', '2-3L', '3L+'] },
  activity: { label: 'Activity Level', opts: ['Low', 'Medium', 'High'] }
};

/* ─── Sub-components ─── */
const Field = ({ label, name, hint, error, children }) => (
  <div className={`field-group ${error ? 'has-error' : ''}`}>
    <label className="field-label" htmlFor={name}>
      {label} <span className="required">*</span>
    </label>
    {children}
    {hint && !error && <span className="field-hint">{hint}</span>}
    {error && <span className="field-error">⚠ {error}</span>}
  </div>
);

const CheckboxGrid = ({ options, selected, onChange }) => (
  <div className="checkbox-grid">
    {options.map((opt) => (
      <label key={opt} className={`checkbox-label ${selected.includes(opt) ? 'checked' : ''}`}>
        <input
          type="checkbox"
          className="checkbox-input"
          checked={selected.includes(opt)}
          onChange={(e) => {
            if (e.target.checked) onChange([...selected, opt]);
            else onChange(selected.filter((x) => x !== opt));
          }}
        />
        {opt}
      </label>
    ))}
  </div>
);

const RadioGrid = ({ options, selected, onChange }) => (
  <div className="radio-grid">
    {options.map((opt) => (
      <label key={opt} className={`radio-label ${selected === opt ? 'checked' : ''}`}>
        <input
          type="radio"
          className="radio-input"
          checked={selected === opt}
          onChange={() => onChange(opt)}
        />
        {opt}
      </label>
    ))}
  </div>
);

/* ─── Main Form ─── */
const SymptomForm = ({ onSubmit, loading }) => {
  const [emergencyMode, setEmergencyMode] = useState(false);
  
  // State
  const [personal, setPersonal] = useState({ name: '', age: '', gender: '', phone: '', email: '' });
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [emergencyText, setEmergencyText] = useState('');
  const [lifestyle, setLifestyle] = useState({ sleep: '', screen: '', water: '', activity: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!personal.name.trim()) e.name = 'Name is required';
    if (!personal.email.trim()) {
      e.email = 'Email is required';
    } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(personal.email)) {
      e.email = 'Valid email is required';
    }
    if (!personal.age || isNaN(personal.age) || personal.age < 1) e.age = 'Valid age required';
    if (!personal.phone.trim()) e.phone = 'Phone is required for emergencies';
    if (!personal.gender) e.gender = 'Gender is required';
    
    if (emergencyMode) {
      if (!emergencyText.trim()) e.emergencyText = 'Please describe the emergency symptoms';
    } else {
      if (selectedSymptoms.length === 0) e.symptoms = 'Select at least one symptom';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePersonalChange = (e) => {
    setPersonal({ ...personal, [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: null }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Build the payload string safely for the backend
    let compiledSymptoms = '';
    
    if (emergencyMode) {
      compiledSymptoms = `EMERGENCY REPORT: ${emergencyText}`;
      // Add any selected vital checkboxes
      if (selectedSymptoms.length > 0) {
        compiledSymptoms += ` | Vital Signs Checked: ${selectedSymptoms.join(', ')}`;
      }
    } else {
      compiledSymptoms = `Symptoms: ${selectedSymptoms.join(', ')} `;
      compiledSymptoms += `| Lifestyle Info - Sleep: ${lifestyle.sleep || 'N/A'}, `;
      compiledSymptoms += `Screen: ${lifestyle.screen || 'N/A'}, `;
      compiledSymptoms += `Water: ${lifestyle.water || 'N/A'}, `;
      compiledSymptoms += `Activity: ${lifestyle.activity || 'N/A'}`;
    }

    // Pass expected shape back to Dashboard
    onSubmit({
      name: personal.name,
      email: personal.email,
      age: Number(personal.age),
      gender: personal.gender,
      duration: 'Recent/Current', 
      symptoms: compiledSymptoms
    });
  };

  return (
    <div className="form-wrapper">
      <div className={`form-card glass-panel ${emergencyMode ? 'emergency-mode' : ''}`}>
        
        {/* Header */}
        <div className="form-header-row">
          <div className="form-header-left">
            <div className="form-icon">📋</div>
            <div>
              <h2 className="form-title">Health Assessment</h2>
              <p className="form-subtitle">Using AI to analyze symptoms and lifestyle patterns</p>
            </div>
          </div>
          <button 
            type="button"
            className={`emergency-toggle-btn ${emergencyMode ? 'active' : ''}`}
            onClick={() => {
              setEmergencyMode(!emergencyMode);
              setErrors({});
            }}
          >
            ⚠️ {emergencyMode ? 'Emergency Mode ON' : 'Emergency Fast-Track'}
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* 1. Personal Info */}
          <h3 className="form-section-title">Personal Information</h3>
          <div className="form-grid">
            <Field label="Full Name" name="name" error={errors.name}>
              <input type="text" name="name" className="field-input" value={personal.name} onChange={handlePersonalChange} placeholder="John Doe" />
            </Field>
            <Field label="Email" name="email" error={errors.email}>
              <input type="email" name="email" className="field-input" value={personal.email} onChange={handlePersonalChange} placeholder="john@example.com" />
            </Field>
            <Field label="Age" name="age" error={errors.age}>
              <input type="number" name="age" className="field-input" value={personal.age} onChange={handlePersonalChange} placeholder="30" />
            </Field>
            <Field label="Gender" name="gender" error={errors.gender}>
              <select name="gender" className="field-input" value={personal.gender} onChange={handlePersonalChange}>
                <option value="" disabled>Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Phone Number" name="phone" error={errors.phone}>
              <input type="tel" name="phone" className="field-input" value={personal.phone} onChange={handlePersonalChange} placeholder="(555) 000-0000" />
            </Field>
          </div>

          {/* 2. Emergency Text Area (Only visible in emergency mode) */}
          {emergencyMode && (
            <div style={{ marginTop: '24px' }}>
              <Field label="Describe the Emergency" name="emergency" error={errors.emergencyText} hint="Be brief but specific (e.g. chest pain left side, started 20 mins ago)">
                <textarea 
                  className="field-input field-textarea" 
                  style={{ borderColor: 'var(--accent-red)' }}
                  value={emergencyText} 
                  onChange={(e) => {
                    setEmergencyText(e.target.value);
                    setErrors({ ...errors, emergencyText: null });
                  }} 
                  placeholder="Type emergency details here..."
                />
              </Field>
            </div>
          )}

          {/* 3. Symptoms Grid */}
          <h3 className="form-section-title">
            {emergencyMode ? 'Vital Signs (Optional)' : 'Select Symptoms'}
          </h3>
          {errors.symptoms && !emergencyMode && <div className="field-error" style={{marginBottom: '16px'}}>⚠ {errors.symptoms}</div>}
          
          {Object.entries(SYMPTOMS_DATA).map(([category, opts]) => {
            // Hide minor categories in emergency mode to declutter UI
            if (emergencyMode && ['Screen/Study Related', 'Energy/Fatigue'].includes(category)) return null;

            return (
              <div key={category} style={{ marginBottom: '24px' }}>
                <p className="field-label" style={{ marginBottom: '12px' }}>{category}</p>
                <CheckboxGrid 
                  options={opts} 
                  selected={selectedSymptoms} 
                  onChange={setSelectedSymptoms} 
                />
              </div>
            );
          })}

          {/* 4. Lifestyle Factors (Hidden in Emergency Mode) */}
          {!emergencyMode && (
            <>
              <h3 className="form-section-title">Lifestyle Factors</h3>
              <div className="form-grid">
                {Object.entries(LIFESTYLE_DATA).map(([key, data]) => (
                  <div key={key}>
                    <p className="field-label" style={{ marginBottom: '12px' }}>{data.label}</p>
                    <RadioGrid 
                      options={data.opts} 
                      selected={lifestyle[key]} 
                      onChange={(val) => setLifestyle({ ...lifestyle, [key]: val })} 
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          <button
            type="submit"
            className={`submit-btn ${loading ? 'loading' : ''} ${emergencyMode ? 'emergency' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <><span className="btn-spinner" /> Processing…</>
            ) : emergencyMode ? (
              'Submit Emergency Request'
            ) : (
              'Analyze Health Data →'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SymptomForm;
