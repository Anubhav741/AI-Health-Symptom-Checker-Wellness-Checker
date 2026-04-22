import Tracking from '../models/Tracking.js';
import mongoose from 'mongoose';

let mockTrackingDB = [];

// ─── Helper: Parse symptoms from the compiled symptom string ───
const parseSymptoms = (symptomString) => {
  if (!symptomString) return [];
  // Extract from "Symptoms: X, Y, Z | Lifestyle Info..." format
  const match = symptomString.match(/Symptoms?:\s*([^|]+)/i);
  if (match) {
    return match[1].split(',').map(s => s.trim()).filter(Boolean);
  }
  // Fallback: try splitting by comma
  return symptomString.split(',').map(s => s.trim()).filter(Boolean);
};

// ─── Helper: Compute health trend ───
const computeHealthTrend = (actionTracking, symptomStatuses, severity) => {
  const totalActions = actionTracking.length;
  const doneActions = actionTracking.filter(a => a.status === 'done').length;
  const doneRatio = totalActions > 0 ? doneActions / totalActions : 0;

  const resolvedCount = symptomStatuses.filter(s => s.status === 'resolved').length;
  const improvingCount = symptomStatuses.filter(s => s.status === 'improving').length;
  const activeCount = symptomStatuses.filter(s => s.status === 'active').length;
  const totalSymptoms = symptomStatuses.length || 1;

  const improvementScore = (resolvedCount * 1.0 + improvingCount * 0.5) / totalSymptoms;

  if (doneRatio >= 0.6 && improvementScore >= 0.5) return 'improving';
  if (doneRatio < 0.3 && activeCount > resolvedCount) return 'worsening';
  if (severity === 'high' && activeCount >= totalSymptoms * 0.5) return 'worsening';
  return 'stable';
};

// ─── Helper: Generate alert ───
const generateAlert = (severity, healthTrend, actionTracking) => {
  const doneCount = actionTracking.filter(a => a.status === 'done').length;
  const totalActions = actionTracking.length;
  const noImprovement = totalActions > 0 && doneCount === totalActions && healthTrend !== 'improving';

  if (
    severity === 'high' ||
    healthTrend === 'worsening' ||
    noImprovement
  ) {
    return '⚠️ Your condition may require medical attention. Please consult a doctor.';
  }
  return '';
};

// ─── Helper: Generate recovery summary ───
const generateRecoverySummary = (symptomStatuses, healthTrend) => {
  const resolved = symptomStatuses.filter(s => s.status === 'resolved');
  const improving = symptomStatuses.filter(s => s.status === 'improving');

  if (healthTrend === 'improving' || resolved.length > 0 || improving.length > 0) {
    const parts = [];
    if (resolved.length > 0) {
      parts.push(`${resolved.map(s => s.symptom).join(', ')} ${resolved.length === 1 ? 'has' : 'have'} been resolved`);
    }
    if (improving.length > 0) {
      parts.push(`${improving.map(s => s.symptom).join(', ')} ${improving.length === 1 ? 'is' : 'are'} showing improvement`);
    }
    return parts.length > 0
      ? `Good progress! ${parts.join('. ')}. Keep following your health plan.`
      : 'Your health indicators are trending positively. Continue your current routine.';
  }
  return '';
};

// ─── 1. Initialize Tracking (called after analysis) ───
export const initializeTracking = async (req, res) => {
  try {
    const { checkupId, email, symptoms, recommendations, severity } = req.body;

    if (!checkupId || !email) {
      return res.status(400).json({ message: 'checkupId and email are required' });
    }

    const parsedSymptoms = parseSymptoms(symptoms);

    const symptom_status = parsedSymptoms.map(s => ({
      symptom: s,
      status: 'active'
    }));

    const action_tracking = (recommendations || []).map(rec => ({
      recommendation: rec,
      status: 'not_done'
    }));

    const health_trend = 'stable';
    const alert = generateAlert(severity, health_trend, action_tracking);

    const trackingData = {
      checkupId,
      email,
      symptom_status,
      health_trend,
      action_tracking,
      recovery_summary: '',
      alert,
      severity,
      previous_symptoms: [],
      current_symptoms: parsedSymptoms,
    };

    if (mongoose.connection.readyState !== 1) {
      const entry = { ...trackingData, id: checkupId, createdAt: new Date().toISOString() };
      // Remove any existing tracking for this checkupId
      mockTrackingDB = mockTrackingDB.filter(t => t.checkupId !== checkupId);
      mockTrackingDB.unshift(entry);
      return res.status(201).json({ message: 'Tracking initialized (Mock)', data: entry });
    }

    // Remove existing if re-initializing
    await Tracking.deleteMany({ checkupId });
    const tracking = new Tracking(trackingData);
    await tracking.save();
    res.status(201).json({ message: 'Tracking initialized', data: tracking });
  } catch (error) {
    console.error('Error initializing tracking:', error);
    res.status(500).json({ message: 'Error initializing tracking', error: error.message });
  }
};

// ─── 2. Update Action Status (checkbox toggle) ───
export const updateActions = async (req, res) => {
  try {
    const { checkupId, action_tracking } = req.body;

    if (!checkupId || !action_tracking) {
      return res.status(400).json({ message: 'checkupId and action_tracking required' });
    }

    let trackingData;

    if (mongoose.connection.readyState !== 1) {
      const idx = mockTrackingDB.findIndex(t => t.checkupId === checkupId);
      if (idx === -1) return res.status(404).json({ message: 'Tracking not found' });
      trackingData = mockTrackingDB[idx];
    } else {
      trackingData = await Tracking.findOne({ checkupId });
      if (!trackingData) return res.status(404).json({ message: 'Tracking not found' });
    }

    // Update action statuses
    trackingData.action_tracking = action_tracking;

    // Re-compute symptom statuses based on actions
    const doneCount = action_tracking.filter(a => a.status === 'done').length;
    const totalActions = action_tracking.length;
    const doneRatio = totalActions > 0 ? doneCount / totalActions : 0;

    trackingData.symptom_status = trackingData.symptom_status.map(sym => {
      if (sym.status === 'resolved') return sym; // Don't regress resolved symptoms
      if (doneRatio >= 0.6) return { ...sym, status: 'improving' };
      if (doneRatio < 0.3) return { ...sym, status: 'active' };
      return sym;
    });

    // Re-compute health trend
    trackingData.health_trend = computeHealthTrend(
      trackingData.action_tracking,
      trackingData.symptom_status,
      trackingData.severity
    );

    // Re-compute alert
    trackingData.alert = generateAlert(
      trackingData.severity,
      trackingData.health_trend,
      trackingData.action_tracking
    );

    // Re-compute recovery summary
    trackingData.recovery_summary = generateRecoverySummary(
      trackingData.symptom_status,
      trackingData.health_trend
    );

    if (mongoose.connection.readyState !== 1) {
      const idx = mockTrackingDB.findIndex(t => t.checkupId === checkupId);
      mockTrackingDB[idx] = { ...trackingData, updatedAt: new Date().toISOString() };
      return res.status(200).json({ message: 'Actions updated (Mock)', data: mockTrackingDB[idx] });
    }

    await trackingData.save();
    res.status(200).json({ message: 'Actions updated', data: trackingData });
  } catch (error) {
    console.error('Error updating actions:', error);
    res.status(500).json({ message: 'Error updating actions', error: error.message });
  }
};

// ─── 3. Confirm Recovery ───
export const confirmRecovery = async (req, res) => {
  try {
    const { checkupId, resolvedSymptoms, satisfaction } = req.body;

    if (!checkupId) {
      return res.status(400).json({ message: 'checkupId required' });
    }

    let trackingData;

    if (mongoose.connection.readyState !== 1) {
      const idx = mockTrackingDB.findIndex(t => t.checkupId === checkupId);
      if (idx === -1) return res.status(404).json({ message: 'Tracking not found' });
      trackingData = mockTrackingDB[idx];
    } else {
      trackingData = await Tracking.findOne({ checkupId });
      if (!trackingData) return res.status(404).json({ message: 'Tracking not found' });
    }

    // Mark specified symptoms as resolved
    if (resolvedSymptoms && Array.isArray(resolvedSymptoms)) {
      trackingData.symptom_status = trackingData.symptom_status.map(sym => {
        if (resolvedSymptoms.includes(sym.symptom)) {
          return { ...sym, status: 'resolved' };
        }
        return sym;
      });
    }

    // Set satisfaction
    if (satisfaction && satisfaction >= 1 && satisfaction <= 5) {
      trackingData.satisfaction = satisfaction;
    }

    // Re-compute trend
    trackingData.health_trend = computeHealthTrend(
      trackingData.action_tracking,
      trackingData.symptom_status,
      trackingData.severity
    );

    // Generate recovery summary
    trackingData.recovery_summary = generateRecoverySummary(
      trackingData.symptom_status,
      trackingData.health_trend
    );

    // Re-compute alert
    trackingData.alert = generateAlert(
      trackingData.severity,
      trackingData.health_trend,
      trackingData.action_tracking
    );

    if (mongoose.connection.readyState !== 1) {
      const idx = mockTrackingDB.findIndex(t => t.checkupId === checkupId);
      mockTrackingDB[idx] = { ...trackingData, updatedAt: new Date().toISOString() };
      return res.status(200).json({ message: 'Recovery confirmed (Mock)', data: mockTrackingDB[idx] });
    }

    await trackingData.save();
    res.status(200).json({ message: 'Recovery confirmed', data: trackingData });
  } catch (error) {
    console.error('Error confirming recovery:', error);
    res.status(500).json({ message: 'Error confirming recovery', error: error.message });
  }
};

// ─── 4. Get Tracking Data ───
export const getTracking = async (req, res) => {
  try {
    const { checkupId } = req.params;

    if (mongoose.connection.readyState !== 1) {
      const entry = mockTrackingDB.find(t => t.checkupId === checkupId);
      if (!entry) return res.status(404).json({ message: 'Tracking not found' });
      return res.status(200).json(entry);
    }

    const tracking = await Tracking.findOne({ checkupId });
    if (!tracking) return res.status(404).json({ message: 'Tracking not found' });
    res.status(200).json(tracking);
  } catch (error) {
    console.error('Error fetching tracking:', error);
    res.status(500).json({ message: 'Error fetching tracking', error: error.message });
  }
};

// ─── 5. Get tracking history for an email ───
export const getTrackingHistory = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: 'email query param required' });

    if (mongoose.connection.readyState !== 1) {
      const entries = mockTrackingDB.filter(t => t.email === email);
      return res.status(200).json(entries);
    }

    const trackings = await Tracking.find({ email }).sort({ createdAt: -1 }).limit(20);
    res.status(200).json(trackings);
  } catch (error) {
    console.error('Error fetching tracking history:', error);
    res.status(500).json({ message: 'Error fetching history', error: error.message });
  }
};
