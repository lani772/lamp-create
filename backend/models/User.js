
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['super_admin', 'admin', 'operator', 'viewer', 'user'], 
    default: 'viewer' 
  },
  allowedLamps: [{ type: String }], // Array of Controller IDs or Lamp IDs
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isPasswordResetRequired: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Password Hash Middleware
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Password Match Method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
