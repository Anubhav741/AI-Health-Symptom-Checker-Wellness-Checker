import { useState } from 'react';
import { sendReport } from '../services/api';

const ReportGenerator = ({ patientData, conditions, severity, recommendations }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState(patientData?.email || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const generateReportPreviewText = () => {
    let text = `AI Health Analysis Report\n`;
    text += `=========================\n\n`;
    text += `Patient: ${patientData?.name || 'Anonymous'}\n`;
    text += `Age: ${patientData?.age || 'N/A'}\n`;
    text += `Symptoms: ${patientData?.symptoms || 'Not provided'}\n\n`;
    
    text += `Severity: ${severity.toUpperCase()}\n\n`;

    text += `Possible Conditions:\n`;
    conditions.forEach((c, idx) => {
      text += `${idx + 1}. ${c.name || c.condition} (${c.probability}%)\n`;
    });

    text += `\nRecommendations:\n`;
    recommendations.forEach(r => {
      text += `- ${r}\n`;
    });

    return text;
  };

  const handleDownload = () => {
    const text = generateReportPreviewText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Health_Report_${patientData?.name || 'User'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!email || !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      email,
      symptoms: patientData?.symptoms || 'Not provided',
      conditions: conditions,
      severity: severity,
      recommendations: recommendations
    };

    console.log("Email:", email);
    console.log("Sending report:", payload);

    try {
      await sendReport(payload);
      setSuccess(true);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to send report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-generator" style={{
      marginTop: '24px', 
      padding: '24px',
      background: 'var(--card-bg, #ffffff)',
      borderRadius: '16px',
      border: '1px solid var(--border, #e2e8f0)',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
    }}>
      {!isOpen ? (
        <div style={{ textAlign: 'center' }}>
           <h3 style={{ margin: '0 0 12px 0', color: 'var(--text, #1e293b)' }}>📄 Health Report</h3>
           <p style={{ color: 'var(--text-muted, #64748b)', marginBottom: '16px', fontSize: '0.95rem' }}>
             Generate a comprehensive summary of these AI findings to save or share with your doctor.
           </p>
           <button 
             onClick={() => setIsOpen(true)}
             style={{
               padding: '10px 24px',
               background: 'var(--text, #1e293b)',
               color: '#fff',
               border: 'none',
               borderRadius: '8px',
               fontWeight: '600',
               cursor: 'pointer',
               boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
             }}
           >
             Generate Report
           </button>
        </div>
      ) : (
        <div className="report-form-unfolded">
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: 'var(--text, #1e293b)' }}>📄 Review & Send Report</h3>
              <button 
                onClick={() => setIsOpen(false)} 
                title="Cancel"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}
              >
                ✖
              </button>
           </div>
           
           <div style={{
             background: '#f8fafc',
             padding: '16px',
             borderRadius: '8px',
             border: '1px dashed var(--border)',
             fontFamily: 'monospace',
             fontSize: '0.85rem',
             color: 'var(--text-muted)',
             height: '140px',
             overflowY: 'auto',
             marginBottom: '20px',
             whiteSpace: 'pre-wrap'
           }}>
             {generateReportPreviewText()}
           </div>

           {success ? (
             <div style={{ padding: '16px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--accent-green, #16a34a)', borderRadius: '8px', textAlign: 'center', fontWeight: '500' }}>
               🎉 Report sent to your email
             </div>
           ) : (
             <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
               <div>
                  <label htmlFor="email" style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text)', fontWeight: '500' }}>
                    Send via Email:
                  </label>
                  <input 
                    type="email" 
                    id="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="doctor@example.com"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${error ? 'var(--accent-red)' : 'var(--border)'}`,
                      outline: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                  {error && <span style={{ color: 'var(--accent-red)', fontSize: '0.85rem', marginTop: '6px', display: 'block' }}>{error}</span>}
               </div>

               <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <button 
                    type="button"
                    onClick={() => window.print()}
                    style={{
                      flex: 1,
                      minWidth: '120px',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      color: '#fff',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    📄 Download PDF
                  </button>
                  <button 
                    type="button"
                    onClick={handleDownload}
                    style={{
                      flex: 1,
                      minWidth: '120px',
                      padding: '12px',
                      background: 'transparent',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    ⬇ Download (.txt)
                  </button>
                  <button 
                    type="submit"
                    disabled={loading || !email.trim()}
                    style={{
                      flex: 2,
                      minWidth: '180px',
                      padding: '12px',
                      background: loading ? 'var(--border)' : 'var(--accent-blue, #0ea5e9)',
                      color: loading ? 'var(--text-muted)' : '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'background 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {loading ? 'Sending...' : '✉ Send Report'}
                  </button>
               </div>
             </form>
           )}
        </div>
      )}
    </div>
  );
};

export default ReportGenerator;
