import express from "express";
import auth from "../middleware/auth.js";
import File from "../models/file.js";
import { S3Client, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// S3 Client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Generate secure temporary download URL
router.get("/:id", auth, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file)
      return res.status(404).json({ msg: "File not found" });

    // Ownership check
    if (file.userId.toString() !== req.userId)
      return res.status(403).json({ msg: "Not authorized" });

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: file.key,
    });

    const downloadURL = await getSignedUrl(s3, command, { expiresIn: 120 }); // 2 minutes

    res.json({
      msg: "Download link generated",
      fileName: file.key,
      downloadURL,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE File
router.delete("/:id", auth, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ msg: "File not found" });

    // Validate owner
    if (file.userId.toString() !== req.userId) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    // Delete from S3 bucket
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: file.key,
    });

    await s3.send(command);

    // Remove DB record
    await File.findByIdAndDelete(req.params.id);

    res.json({ msg: "File deleted successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
