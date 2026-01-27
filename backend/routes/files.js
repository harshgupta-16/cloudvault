import express from "express";
import File from "../models/file.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Get all files for the logged-in user
router.get("/", auth, async (req, res) => {
  try {
    const files = await File.find({ userId: req.userId }).sort({ uploadedAt: -1 });
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
