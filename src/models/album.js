const mongoose = require("mongoose");

const albumSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
  songs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }], 
  releaseDate: { type: Date, default: Date.now }, 
  coverImage: { type: String }, 
}, { timestamps: true });

module.exports = mongoose.model("Album", albumSchema);