import express from "express";
import multer from "multer";
import pkg from "pg";
import fs from "fs";
import path from "path";

const router = express.Router();
const { Pool } = pkg;

// PostgreSQL connection
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "capstone_db",
  password: "Kisses123",
  port: 5432,
});

// Ensure upload directory exists
const uploadDir = "./public/uploads/fileRepository";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

// Only allow certain file types
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
      "video/mp4",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type"));
  },
});

// ---------- Folder Routes ----------

// Create Folder
router.post("/folders", async (req, res) => {
  try {
    const { name, parent_id, adminid } = req.body;
    const result = await pool.query(
      `INSERT INTO file_repository_folders (name, parent_id, adminid)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, parent_id || null, adminid]
    );
    res.json({ success: true, folder: result.rows[0] });
  } catch (err) {
    console.error("Error creating folder:", err);
    res.status(500).json({ success: false, message: "Failed to create folder" });
  }
});

// Get all folders (or subfolders by parent_id)
router.get("/folders", async (req, res) => {
  try {
    const { parent_id } = req.query;
    const query = parent_id
      ? "SELECT * FROM file_repository_folders WHERE parent_id = $1 ORDER BY created_at DESC"
      : "SELECT * FROM file_repository_folders WHERE parent_id IS NULL ORDER BY created_at DESC";
    const result = await pool.query(query, parent_id ? [parent_id] : []);
    res.json({ success: true, folders: result.rows });
  } catch (err) {
    console.error("Error fetching folders:", err);
    res.status(500).json({ success: false, message: "Failed to fetch folders" });
  }
});

// ---------- File Routes ----------

// Upload File
router.post("/files", upload.single("file"), async (req, res) => {
  try {
    let { folder_id, adminid } = req.body;
    const filePath = `/uploads/fileRepository/${req.file.filename}`;

    if (folder_id === "null" || folder_id === "" || folder_id === undefined) {
      folder_id = null;
    } else {
      folder_id = parseInt(folder_id);
    }

    const result = await pool.query(
      `INSERT INTO file_repository_files 
       (folder_id, file_name, file_path, file_type, file_size, adminid)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        folder_id,
        req.file.originalname,
        filePath,
        req.file.mimetype,
        req.file.size,
        adminid,
      ]
    );

    res.json({ success: true, file: result.rows[0] });
  } catch (err) {
    console.error("Error uploading file:", err);
    res.status(500).json({ success: false, message: "File upload failed" });
  }
});

// Get all files in a folder
router.get("/files", async (req, res) => {
  try {
    const { folder_id } = req.query;
    const query = folder_id
      ? "SELECT * FROM file_repository_files WHERE folder_id = $1 ORDER BY created_at DESC"
      : "SELECT * FROM file_repository_files WHERE folder_id IS NULL ORDER BY created_at DESC";
    const result = await pool.query(query, folder_id ? [folder_id] : []);
    res.json({ success: true, files: result.rows });
  } catch (err) {
    console.error("Error fetching files:", err);
    res.status(500).json({ success: false, message: "Failed to fetch files" });
  }
});

// Delete File
router.delete("/files/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "SELECT file_path FROM file_repository_files WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: "File not found" });

    const filePath = `./public${result.rows[0].file_path}`;
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await pool.query("DELETE FROM file_repository_files WHERE id = $1", [id]);
    res.json({ success: true, message: "File deleted successfully" });
  } catch (err) {
    console.error("Error deleting file:", err);
    res.status(500).json({ success: false, message: "Failed to delete file" });
  }
});

// Delete Folder
router.delete("/folders/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM file_repository_folders WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Folder not found" });
    }

    res.json({ success: true, message: "Folder deleted successfully" });
  } catch (err) {
    console.error("Error deleting folder:", err);
    res.status(500).json({ success: false, message: "Failed to delete folder" });
  }
});

export default router;