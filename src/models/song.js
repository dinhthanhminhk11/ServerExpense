const mongoose = require("mongoose");
const songSchema = new mongoose.Schema({
    title : {
        type: String
    },
    trackNumber: {
        type: Number
    },
    year: {
        type: Number
    },
    duration: {
        type: Number
    },
    data: {
        type: String
    },
    dateModified: {
        type: Number
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