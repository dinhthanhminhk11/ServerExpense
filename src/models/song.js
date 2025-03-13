const mongoose = require("mongoose");

const songSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    caption: { type: String, required: true },
    artist: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    album: { type: mongoose.Schema.Types.ObjectId, ref: "Album" },
    genres: [{ type: mongoose.Schema.Types.ObjectId, ref: "Genre" }],
    fileUrl: { type: String, required: true },
    coverImage: { type: String },
    duration: { type: Number },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Like" }],
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
    plays: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Song", songSchema);