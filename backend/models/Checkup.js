import mongoose from 'mongoose';

const checkupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  email: { type: String, required: true },
  symptoms: { type: String }, 
  conditions: { type: [Object] }, 
  severity: { type: String },
  recommendations: { type: [String] },
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

const Checkup = mongoose.model('Checkup', checkupSchema);
export default Checkup;
