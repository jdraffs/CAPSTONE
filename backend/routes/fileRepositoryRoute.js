//fileRepositoryRoute.js
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

// basta ensure upload directory exists
const uploadDir = "./public/uploads/fileRepository";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

// only allow certain file types
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/vnd.ms-excel", // .xls
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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

// folder routes toh
// get all folders (or subfolders by parent_id) — updated to support all=true
router.get("/folders", async (req, res) => {
  try {
    const { parent_id, all } = req.query;

    let query;
    let params = [];

    if (all === "true") {
      query = "SELECT * FROM file_repository_folders ORDER BY created_at DESC";
    } else if (parent_id !== undefined) {
      // parent_id provided (may be null or value)
      if (parent_id === "null") {
        query = "SELECT * FROM file_repository_folders WHERE parent_id IS NULL ORDER BY created_at DESC";
      } else {
        query = "SELECT * FROM file_repository_folders WHERE parent_id = $1 ORDER BY created_at DESC";
        params = [parent_id];
      }
    } else {
      // default to root folders (existing behavior)
      query = "SELECT * FROM file_repository_folders WHERE parent_id IS NULL ORDER BY created_at DESC";
    }

    const result = await pool.query(query, params);
    res.json({ success: true, folders: result.rows });
  } catch (err) {
    console.error("Error fetching folders:", err);
    res.status(500).json({ success: false, message: "Failed to fetch folders" });
  }
});

// file routes toh

// upload file
// MODIFY existing upload file endpoint to log events
router.post("/upload", upload.single("file"), async (req, res) => {
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

    const fileId = result.rows[0].id;

    // ADDED THIS: Log to dashboard_events
    await pool.query(
      `INSERT INTO dashboard_events (event_type, title, details, file_id, meta)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        "repo_file_added",  //changed from "repo_update"
        "Repository updated",
        `File added: ${req.file.originalname}`,
        fileId,
        JSON.stringify({ adminid, action: "file_added", icon: "folder" })
      ]
    );

    res.json({ success: true, file: result.rows[0] });
  } catch (err) {
    console.error("Error uploading file:", err);
    res.status(500).json({ success: false, message: "File upload failed" });
  }
});

// get all files in a folder — updated to support all=true
router.get("/files", async (req, res) => {
  try {
    const { folder_id, all } = req.query;

    let query;
    let params = [];

    if (all === "true") {
      query = "SELECT * FROM file_repository_files ORDER BY created_at DESC";
    } else if (folder_id !== undefined) {
      if (folder_id === "null") {
        query = "SELECT * FROM file_repository_files WHERE folder_id IS NULL ORDER BY created_at DESC";
      } else {
        query = "SELECT * FROM file_repository_files WHERE folder_id = $1 ORDER BY created_at DESC";
        params = [folder_id];
      }
    } else {
      // maintain existing default behavior (root-level files)
      query = "SELECT * FROM file_repository_files WHERE folder_id IS NULL ORDER BY created_at DESC";
    }

    const result = await pool.query(query, params);
    res.json({ success: true, files: result.rows });
  } catch (err) {
    console.error("Error fetching files:", err);
    res.status(500).json({ success: false, message: "Failed to fetch files" });
  }
});

// delete file
//MODIFIED existing Delete File endpoint to log events
router.delete("/files/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "SELECT file_path, file_name FROM file_repository_files WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: "File not found" });

    const fileName = result.rows[0].file_name;
    const filePath = `./public${result.rows[0].file_path}`;
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await pool.query("DELETE FROM file_repository_files WHERE id = $1", [id]);

    // UPDATED: Used "repo_file_deleted" as event_type
    await pool.query(
      `INSERT INTO dashboard_events (event_type, title, details, meta)
       VALUES ($1, $2, $3, $4)`,
      [
        "repo_file_deleted",  // changed from "repo_update"
        "Repository updated",
        `File deleted: ${fileName}`,
        JSON.stringify({ action: "file_deleted", icon: "trash" })
      ]
    );

    res.json({ success: true, message: "File deleted successfully" });
  } catch (err) {
    console.error("Error deleting file:", err);
    res.status(500).json({ success: false, message: "Failed to delete file" });
  }
});

// sample route in fileRepositoryRoute.js
router.get("/files/data", async (req, res) => {
  try {
    const { id } = req.query;
    const result = await pool.query("SELECT * FROM file_repository_files WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    const file = result.rows[0];
    console.log("Fetched file record:", file); // 👈 add this line

    //correct full path
    const filePath = path.join(process.cwd(), "public", file.file_path.replace(/^\/+/, ""));

    console.log("Resolved file path:", filePath); // add daw this line

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "File not found on disk" });
    }

    res.json({ success: true, message: "File found", path: filePath });
  } catch (err) {
    console.error("Error fetching file data:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


export default router;