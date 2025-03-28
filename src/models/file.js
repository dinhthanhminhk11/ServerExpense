const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema({
    file_hash: { type: String },
    file_name: { type: String },
    file_size: { type: Number },
    total_chunks: { type: Number },
    uploaded_chunks: { type: [Number], default: [] },
    status: { type: String, enum: ["uploading", "completed"], default: "uploading" },
    path: { type: String, default: null },
    created_at: { type: Date, default: Date.now }
});


FileSchema.index({ file_hash: 1 });
FileSchema.index({ status: 1 });

module.exports = mongoose.model("File", FileSchema);

