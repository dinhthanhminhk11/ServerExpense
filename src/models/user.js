const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
  },
  image: {
    type: String,
  },
  phone: {
    type: String,
    // minlength: 9,
  },
  email: {
    type: String,
    require: true,
  },
  password: {
    type: String,
    minlength: 6,
  },
  verified: {
    type: Boolean,
    default: false
  },
  tokenDevice: {
    type: String
  },

  OTP: { type: String },
  OTPCreatedTime: { type: Date },
  OTPAttempts: { type: Number, default: 0 },
  isBlocked: { type: Boolean, default: false },
  blockUntil: { type: Date },
})
module.exports = mongoose.model("User", userSchema);
