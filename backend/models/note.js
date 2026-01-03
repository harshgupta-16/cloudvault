import mongoose from "mongoose";

const noteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  title: {
    type: String,
    required: true,
  },
}, { timestamps: true });

export default mongoose.model("note", noteSchema);
