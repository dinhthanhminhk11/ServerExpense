const mongoose = require("mongoose");
const currentYear = new Date().getFullYear();
const albumSchema = new mongoose.Schema({
    idAlbum: {
        type: Number,
        default : Date.now()
    },
    albumName: {
        type: String
    },
    artistId: {
        type: Number
    },
    releaseYear: {
        type: Number,
        default :currentYear
    },
})

module.exports = mongoose.model("Album", albumSchema);