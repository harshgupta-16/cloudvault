import express from "express";
import Note from "../models/note.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Create Note
router.post("/", auth, async (req, res) => {
  const { title, content } = req.body;
  const note = await Note.create({ userId: req.userId, title, content });
  res.json(note);
});

// Get All Notes for logged-in user
router.get("/", auth, async (req, res) => {
  const notes = await Note.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json(notes);
});

// Update Note
router.put("/:id", auth, async (req, res) => {
  const { title, content } = req.body;
  const note = await Note.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { title, content },
    { new: true }
  );
  res.json(note);
});

// Delete Note
router.delete("/:id", auth, async (req, res) => {
  await Note.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  res.json({ msg: "Note deleted" });
});

export default router;
