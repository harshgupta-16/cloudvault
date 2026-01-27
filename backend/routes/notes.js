import express from "express";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import auth from "../middleware/auth.js";
import Note from "../models/note.js";

const router = express.Router();

// Create Note
router.post("/", auth, async (req, res) => {
  const { title, content, isLocked } = req.body;
  const note = await Note.create({ userId: req.userId, title, content, isLocked: isLocked || false });
  res.json(note);
});

// Get All Notes for logged-in user
router.get("/", auth, async (req, res) => {
  const notes = await Note.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json(notes);
});

// Update Note
router.put("/:id", auth, async (req, res) => {
  const { title, content, isLocked } = req.body;
  const updateData = { title, content };
  if (typeof isLocked === 'boolean') {
    updateData.isLocked = isLocked;
  }
  const note = await Note.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    updateData,
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
