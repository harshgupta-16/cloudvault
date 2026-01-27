import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  key: {
    type: String,
    required: true,
    unique: true
  },
  url: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

// FIX: Checks if model already exists before creating new
const File = mongoose.models.File || mongoose.model("File", fileSchema);

export default File;
