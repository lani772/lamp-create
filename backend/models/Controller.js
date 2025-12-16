
const mongoose = require('mongoose');

const scheduleSchema = mongoose.Schema({
  time: { type: String, required: true }, // HH:MM
  action: { type: String, enum: ['on', 'off'], required: true },
  enabled: { type: Boolean, default: true }
});

const lampSchema = mongoose.Schema({
  name: { type: String, required: true },
  pin: { type: Number, required: true },
  status: { type: Boolean, default: false },
  isLocked: { type: Boolean, default: false },
  totalHours: { type: Number, default: 0 },
  lastTurnedOn: { type: Date },
  schedules: [scheduleSchema]
});

const controllerSchema = mongoose.Schema({
  name: { type: String, required: true },
  ip: { type: String, required: true },
  secretKey: { type: String, required: true },
  model: { type: String, enum: ['ESP32', 'ESP8266'], default: 'ESP32' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lamps: [lampSchema],
  isOnline: { type: Boolean, default: false }
}, {
  timestamps: true
});

const Controller = mongoose.model('Controller', controllerSchema);

module.exports = Controller;
