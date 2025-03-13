const mongoose = require("mongoose");

const likeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
  song: { type: mongoose.Schema.Types.ObjectId, ref: "Song", required: true }, 
}, { timestamps: true });

module.exports = mongoose.model("Like", likeSchema);