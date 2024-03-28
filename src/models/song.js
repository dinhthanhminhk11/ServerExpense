const mongoose = require("mongoose");
const songSchema = new mongoose.Schema({
    id :{
        type: Number,
        default: Date.now()
    },
    title : {
        type: String
    },
    trackNumber: {
        type: Number
    },
    year: {
        type: Number,
        default: 2024
    },
    duration: {
        type: Number
    },
    data: {
        type: String
    },
    dateModified: {
        type: Number,
        default : Date.now()
    },
    albumIdString: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Album'
    },
    albumId: {
        type: Number
    },
    albumName: {
        type: String
    },
    artistId: {
        type: Number
    },
    artistName: {
        type: String
    },
    composer: {
        type: String
    },
    albumArtist: {
        type: String
    },
    dataPath: {
        type: String
    },
})

module.exports = mongoose.model("Song", songSchema);