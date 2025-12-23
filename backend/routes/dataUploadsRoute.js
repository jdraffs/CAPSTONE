//dataUploadsRoute.js - Complete with Activity Logging
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

// ==================== ACTIVITY LOGGING HELPER FUNCTION ====================
async function logFileUpload(adminId, fileName, fileType, fileSize, fileId) {
  try {
    await pool.query(
      `INSERT INTO activity_logs (type, message, adminid, timestamp, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        'upload',
        `Uploaded analytics file: ${fileName}`,
        adminId,
        new Date().toISOString(),
        JSON.stringify({
          fileName: fileName,
          fileType: fileType,
          fileSize: fileSize,
          fileId: fileId,
          action: 'file_upload'
        })
      ]
    );
    console.log(`✅ Logged upload activity for admin ${adminId}: ${fileName}`);
  } catch (error) {
    console.error('Failed to log upload activity:', error);
  }
}

async function logFileDeletion(adminId, fileName, fileId) {
  try {
    await pool.query(
      `INSERT INTO activity_logs (type, message, adminid, timestamp, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        'delete',
        `Deleted analytics file: ${fileName}`,
        adminId,
        new Date().toISOString(),
        JSON.stringify({
          fileId: fileId,
          fileName: fileName,
          action: 'file_deletion'
        })
      ]
    );
    console.log(`✅ Logged deletion activity for admin ${adminId}: ${fileName}`);
  } catch (error) {
    console.error('Failed to log deletion activity:', error);
  }
}
// ==================== END ACTIVITY LOGGING ====================

// UPLOAD A FILE WITH LOGGING
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
      [folder_id || null, storedFileName, filePath, fileType, fileSize, adminid || '2']
    );

    const fileId = result.rows[0].id;

    // 2nd step: insert dashboard event
    await pool.query(
      `INSERT INTO dashboard_events (event_type, title, details, file_id, meta)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        "file_upload",
        "New dataset uploaded",
        originalFileName,
        fileId,
        JSON.stringify({
          adminid: adminid || '2',
          icon: "upload",
          file_type: fileType,
        }),
      ]
    );

    // LOG THE UPLOAD ACTIVITY
    await logFileUpload(
      adminid || '2',
      originalFileName,
      fileType,
      fileSize,
      fileId
    );

    res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      file: result.rows[0],
      id: fileId
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

// DELETE FILE WITH LOGGING
router.delete("/files/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get file info before deleting for logging
    const fileResult = await pool.query(
      'SELECT file_name, adminid FROM file_repository_files WHERE id = $1',
      [id]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileInfo = fileResult.rows[0];

    // Delete the file from database
    await pool.query('DELETE FROM file_repository_files WHERE id = $1', [id]);

    // LOG THE DELETION
    await logFileDeletion(
      fileInfo.adminid,
      fileInfo.file_name,
      id
    );

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
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
        JSON.stringify({ adminid: adminid || '2', icon: "chart-line" })
      ]
    );

    res.json({ success: true, message: "Analytics event logged" });
  } catch (err) {
    console.error("Error logging analytics event:", err);
    res.status(500).json({ success: false, message: "Failed to log event" });
  }
});

// API endpoint to receive activity logs from frontend
router.post("/activity-logs", async (req, res) => {
  try {
    const { type, message, adminId, timestamp, details } = req.body;

    await pool.query(
      `INSERT INTO activity_logs (type, message, adminid, timestamp, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        type,
        message,
        adminId,
        timestamp || new Date().toISOString(),
        JSON.stringify(details)
      ]
    );

    console.log(`✅ Activity log stored: ${type} - ${message}`);
    res.json({ success: true, message: "Activity logged successfully" });
  } catch (error) {
    console.error("Error storing activity log:", error);
    res.status(500).json({ success: false, error: "Failed to store activity log" });
  }
});

// GET activity logs (for SuperAdmin dashboard)
router.get("/activity-logs", async (req, res) => {
  try {
    const { adminid, type, limit } = req.query;
    
    let query = 'SELECT * FROM activity_logs WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (adminid) {
      query += ` AND adminid = $${paramCount}`;
      params.push(adminid);
      paramCount++;
    }

    if (type) {
      query += ` AND type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }

    query += ' ORDER BY timestamp DESC';

    if (limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(parseInt(limit));
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
});

export default router;