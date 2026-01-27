import express from "express";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import auth from "../middleware/auth.js";
import dotenv from "dotenv";
import File from "../models/file.js";


dotenv.config();

const router = express.Router();

// Multer config (store file in memory)
const upload = multer({ storage: multer.memoryStorage() });

// S3 client (AWS SDK v3)
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Upload Route
router.post("/", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    const file = req.file;
    const folder = file.mimetype.startsWith("image") ? "images" : "documents";
    const key = `${folder}/${req.userId}-${Date.now()}-${file.originalname}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3.send(command);

    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    await File.create({
      userId: req.userId,
      key,
      url: fileUrl
    });

    res.json({
      msg: "Upload successful",
      key,
      url: fileUrl
    });


  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
