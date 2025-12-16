
const express = require('express');
const router = express.Router();
const Controller = require('../models/Controller');
const { protect, admin } = require('../middleware/authMiddleware');

// Get all controllers (Filtered by user access in real app, returning all for admin here)
router.get('/', protect, async (req, res) => {
  if (req.user.role === 'admin' || req.user.role === 'super_admin') {
    const controllers = await Controller.find({});
    res.json(controllers);
  } else {
    // Implement viewing logic for standard users based on 'allowedLamps'
    // For simplicity, returning empty or restricted list
    res.json([]); 
  }
});

// Add Controller
router.post('/', protect, admin, async (req, res) => {
  const { name, ip, secretKey, model, lamps } = req.body;
  const controller = new Controller({
    name,
    ip,
    secretKey,
    model,
    ownerId: req.user._id,
    lamps: lamps || []
  });
  const createdController = await controller.save();
  res.status(201).json(createdController);
});

// Toggle Lamp (Proxy to ESP32)
router.post('/:id/toggle', protect, async (req, res) => {
  const { pin, status } = req.body;
  const controller = await Controller.findById(req.params.id);

  if (controller) {
    // Here you would use axios/fetch to call the ESP32 IP
    // await axios.get(`http://${controller.ip}/toggle?key=${controller.secretKey}&pin=${pin}&state=${status ? 'on' : 'off'}`);
    
    // Update DB state
    const lamp = controller.lamps.find(l => l.pin === pin);
    if (lamp) {
      lamp.status = status;
      lamp.lastTurnedOn = status ? Date.now() : lamp.lastTurnedOn;
      await controller.save();
    }
    res.json({ message: 'Toggled' });
  } else {
    res.status(404).json({ message: 'Controller not found' });
  }
});

module.exports = router;
