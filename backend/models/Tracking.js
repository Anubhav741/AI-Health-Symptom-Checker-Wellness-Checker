import mongoose from 'mongoose';

const trackingSchema = new mongoose.Schema({
  checkupId: { type: String, required: true, index: true },
  email: { type: String, required: true, index: true },
  symptom_status: [{
    symptom: { type: String, required: true },
    status: { type: String, enum: ['active', 'improving', 'resolved'], default: 'active' }
  }],
  health_trend: {
    type: String,
    enum: ['improving', 'stable', 'worsening'],
    default: 'stable'
  },
  action_tracking: [{
    recommendation: { type: String, required: true },
    status: { type: String, enum: ['done', 'not_done'], default: 'not_done' }
  }],
  recovery_summary: { type: String, default: '' },
  alert: { type: String, default: '' },
  satisfaction: { type: Number, min: 1, max: 5, default: null },
  severity: { type: String },
  previous_symptoms: { type: [String], default: [] },
  current_symptoms: { type: [String], default: [] },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      delete ret._id;
      delete ret.__v;
    }
  }
});

const Tracking = mongoose.model('Tracking', trackingSchema);
export default Tracking;
