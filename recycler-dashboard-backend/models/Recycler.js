const mongoose = require('mongoose');

const RecyclerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  acceptedMaterials: [{ type: String }],
  rates: {
    type: Map,
    of: Number, // e.g., { "PCB": 150, "CRT": 50 }
  },
  pickupAvailable: { type: Boolean, default: false },
  serviceRadiusKm: { type: Number, default: 10 }
}, { timestamps: true });

module.exports = mongoose.model('Recycler', RecyclerSchema);
