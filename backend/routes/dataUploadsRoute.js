//dataUploadsRoute.js
import express from "express";
import multer from "multer";
import pkg from "pg";

const { Pool } = pkg;
const router = express.Router();

// database connection
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "capstone_db",
  password: "Kisses123",
  port: 5432,
});

// multer + utilities
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

router.get("/test", (req, res) => {
  res.send("Data Upload Route Working");
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//FIX: changed upload path to fileRepository (same as File Repository)
const uploadDir = path.join(__dirname, "../public/uploads/fileRepository");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// multer storage - UPDATED PATH
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// UPLOAD A FILE
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { folder_id, adminid } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // extract file info
    const storedFileName = file.filename; // includes timestamp
    const originalFileName = file.originalname;
    const fileType = file.mimetype;
    const fileSize = file.size;
    
    //FIX: updated file path to match fileRepository structure
    const filePath = `/uploads/fileRepository/${storedFileName}`;

    //first step: Insert into file_repository_files
    const result = await pool.query(
      `INSERT INTO file_repository_files 
        (folder_id, file_name, file_path, file_type, file_size, adminid)
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING *`,
      [folder_id || null, storedFileName, filePath, fileType, fileSize, adminid]
    );

    const fileId = result.rows[0].id;

    // 2nd setp: insert dashboard event
    await pool.query(
      `INSERT INTO dashboard_events (event_type, title, details, file_id, meta)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        "file_upload",
        "New dataset uploaded",
        originalFileName,
        fileId,
        JSON.stringify({
          adminid,
          icon: "upload",
          file_type: fileType,
        }),
      ]
    );

    res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      file: result.rows[0],
      id: fileId // included file ID for logging
    });

  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: "File upload failed" });
  }
});

// GET UPLOADED FILES
router.get("/data/uploads", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM file_repository_files ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to load files" });
  }
});

// log when analytics report is generated
router.post("/analytics/generated", async (req, res) => {
  try {
    const { title, details, file_id, adminid } = req.body;

    await pool.query(
      `INSERT INTO dashboard_events (event_type, title, details, file_id, meta)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        "report_generated",
        title || "New analytics report generated",
        details || "Analytics report created",
        file_id || null,
        JSON.stringify({ adminid, icon: "chart-line" })
      ]
    );

    res.json({ success: true, message: "Analytics event logged" });
  } catch (err) {
    console.error("Error logging analytics event:", err);
    res.status(500).json({ success: false, message: "Failed to log event" });
  }
});

export default router;