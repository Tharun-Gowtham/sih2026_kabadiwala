const express = require('express');
const router = express.Router();
const generateEPRCertificate = require('../utils/pdfGenerator');

// IN-MEMORY DATABASE FOR RAPID PROTOTYPING
let mockProfile = {
  name: 'Formal E-Waste Co.',
  acceptedMaterials: ['PCB', 'Battery', 'Cable'],
  rates: { 'PCB': 150, 'Battery': 80, 'Cable': 100 },
  pickupAvailable: true,
  serviceRadiusKm: 50
};

let mockLots = [
  { lotId: 'LOT-001', dealerName: 'Ramu Scrap', category: 'PCB', declaredWeight: 35, estimatedValue: 5250, distanceKm: 4.2, status: 'pending' },
  { lotId: 'LOT-002', dealerName: 'Shanti Traders', category: 'Battery', declaredWeight: 120, estimatedValue: 9600, distanceKm: 12.5, status: 'pending' }
];

// --- RECYCLER PROFILE ROUTES ---
router.get('/recycler/profile', (req, res) => {
  res.json(mockProfile);
});

router.put('/recycler/profile', (req, res) => {
  const { acceptedMaterials, rates, pickupAvailable, serviceRadiusKm } = req.body;
  mockProfile = {
    ...mockProfile,
    acceptedMaterials,
    rates,
    pickupAvailable,
    serviceRadiusKm
  };
  res.json(mockProfile);
});

// --- LOTS ROUTES ---
router.get('/lots', (req, res) => {
  res.json(mockLots);
});

router.post('/lots/:lotId/confirm', async (req, res) => {
  try {
    const { verifiedWeight } = req.body;
    const lotIndex = mockLots.findIndex(l => l.lotId === req.params.lotId);
    
    if (lotIndex === -1) return res.status(404).json({ error: 'Lot not found' });
    if (mockLots[lotIndex].status === 'confirmed') return res.status(400).json({ error: 'Lot already confirmed' });

    mockLots[lotIndex].verifiedWeight = verifiedWeight;
    mockLots[lotIndex].status = 'confirmed';
    
    const lot = mockLots[lotIndex];

    // Generate Certificate
    const certificateBase64 = await generateEPRCertificate(lot, mockProfile);

    res.json({ message: 'Handover confirmed', lot, certificate: certificateBase64 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
