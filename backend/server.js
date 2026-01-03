import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import notesRoutes from "./routes/notes.js";
import uploadRoutes from "./routes/upload.js";
import filesRoutes from "./routes/files.js";
import downloadRoutes from "./routes/download.js";

dotenv.config();

const app = express();

// Middleware (must be before routes)
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://cloudvault-zeta.vercel.app"
  ],
  credentials: true,
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.log("MongoDB connection error:", err));

// Routes
app.use("/auth", authRoutes);
app.use("/notes", notesRoutes);
app.use("/upload", uploadRoutes);
app.use("/files", filesRoutes);
app.use("/download", downloadRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Basic Express + MongoDB Server Working");
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
