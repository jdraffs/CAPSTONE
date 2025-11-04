// --- Admin 2 Routes ---
import express from "express";
import multer from "multer";
import pkg from "pg";

const { Pool } = pkg;
const router = express.Router();

// Database connection
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "your_database_name",
  password: "yourpassword",
  port: 5432,
});

// Multer setup for file uploads
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

router.get("/test", (req, res) => {
  res.send("Data Upload Route Working");
});


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadPath = path.join(__dirname, "../public/uploads");

// Ensure directory exists
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/data_uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });



// Upload a file
router.post("/upload", upload.single("file"), async (req, res) => {
  const { folder_id, adminid } = req.body;
  const file = req.file;

  await pool.query(
    `INSERT INTO file_repository_files 
     (folder_id, file_name, file_path, file_type, file_size, adminid)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [folder_id, file.originalname, file.path, file.mimetype, file.size, adminid]
  );

  res.status(200).json({ message: "File uploaded successfully" });
});

// Save visualization
router.post("/data/visualization", async (req, res) => {
  try {
    const { title, chartType, labels, values, fileId } = req.body;

    await pool.query(
      `INSERT INTO data_visualizations (title, chart_type, labels, values, source_file_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [title, chartType, JSON.stringify(labels), JSON.stringify(values), fileId]
    );

    res.json({ success: true, message: "Visualization saved!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error saving visualization" });
  }
});

// Fetch uploaded files
router.get("/data/uploads", async (req, res) => {
  const result = await pool.query("SELECT * FROM data_uploads ORDER BY uploaded_at DESC");
  res.json(result.rows);
});

// Fetch visualizations
router.get("/data/visualizations", async (req, res) => {
  const result = await pool.query("SELECT * FROM data_visualizations ORDER BY created_at DESC");
  res.json(result.rows);
});

export default router;
