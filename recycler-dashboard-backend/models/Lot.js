const mongoose = require('mongoose');

const LotSchema = new mongoose.Schema({
  lotId: { type: String, required: true, unique: true }, // The ID encoded in the QR code
  dealerName: { type: String, required: true },
  category: { type: String, required: true },
  declaredWeight: { type: Number, required: true },
  verifiedWeight: { type: Number },
  status: { type: String, enum: ['pending', 'confirmed'], default: 'pending' },
  estimatedValue: { type: Number },
  distanceKm: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('Lot', LotSchema);
