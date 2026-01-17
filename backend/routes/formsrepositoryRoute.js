// formsrepositoryRoute.js - FIXED VERSION
import express from "express";
import multer from "multer";
import pkg from "pg";
import fs from "fs";

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
const uploadDir = "./public/uploads/forms_repository";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

const ADMIN_ID = "adminave";

// ---------- Folder Routes ----------

// Create Folder
router.post("/folders", async (req, res) => {
  try {
    const { name, parent_id } = req.body;

    const result = await pool.query(
      `INSERT INTO forms_repository_folders (name, parent_id, adminid)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, parent_id ?? null, ADMIN_ID]
    );

    res.json({ success: true, folder: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get Folders - UPDATED to support ?all=true
router.get("/folders", async (req, res) => {
  try {
    const { parent_id, all } = req.query;

    let query = `SELECT * FROM forms_repository_folders WHERE adminid = $1`;
    const params = [ADMIN_ID];

    // If ?all=true, fetch ALL folders (for trash/favorites/recent views)
    if (all === "true") {
      query += " ORDER BY id DESC";
      const result = await pool.query(query, params);
      return res.json({ success: true, folders: result.rows });
    }

    // Otherwise, filter by parent_id
    if (parent_id !== undefined) {
      if (parent_id === "null") {
        query += " AND parent_id IS NULL";
      } else {
        query += " AND parent_id = $2";
        params.push(parseInt(parent_id));
      }
    }

    query += " ORDER BY id DESC";

    const result = await pool.query(query, params);
    res.json({ success: true, folders: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete Folder (block root folders)
router.delete("/folders/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const check = await pool.query(
      "SELECT parent_id, name FROM forms_repository_folders WHERE id = $1",
      [id]
    );

    if (!check.rows.length) {
      return res.status(404).json({ success: false, message: "Folder not found" });
    }

    if (check.rows[0].parent_id === null) {
      return res.status(403).json({ success: false, message: "Root folders cannot be deleted" });
    }

    await pool.query("DELETE FROM forms_repository_folders WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------- File Routes ----------

// Upload File (folder_id REQUIRED)
router.post("/files", upload.single("file"), async (req, res) => {
  try {
    const { folder_id } = req.body;

    if (!folder_id) {
      return res.status(400).json({ success: false, message: "folder_id is required" });
    }

    const filePath = `/uploads/forms_repository/${req.file.filename}`;

    const result = await pool.query(
      `INSERT INTO forms_repository_files
       (folder_id, file_name, file_path, file_type, file_size, adminid)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        parseInt(folder_id),
        req.file.originalname,
        filePath,
        req.file.mimetype,
        req.file.size,
        ADMIN_ID,
      ]
    );

    res.json({ success: true, file: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ UPDATED: Get Files - support ?all=true for trash/favorites/recent
router.get("/files", async (req, res) => {
  try {
    const { folder_id, all } = req.query;

    // If ?all=true, return ALL files (for trash, favorites, recent views)
    if (all === "true") {
      const result = await pool.query(
        `SELECT * FROM forms_repository_files
         WHERE adminid = $1
         ORDER BY id DESC`,
        [ADMIN_ID]
      );
      return res.json({ success: true, files: result.rows });
    }

    // Otherwise, folder_id is required
    if (!folder_id) {
      return res.status(400).json({ success: false, message: "folder_id is required when all=true is not set" });
    }

    const result = await pool.query(
      `SELECT * FROM forms_repository_files
       WHERE adminid = $1 AND folder_id = $2
       ORDER BY id DESC`,
      [ADMIN_ID, parseInt(folder_id)]
    );

    res.json({ success: true, files: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete File
router.delete("/files/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "SELECT file_path FROM forms_repository_files WHERE id = $1",
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    const filePath = `./public${result.rows[0].file_path}`;
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await pool.query("DELETE FROM forms_repository_files WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;