//server.js - Corrected Version
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from "./db.js";
import fs from "fs";
import XLSX from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// mga routes 
import loginRoute from './routes/loginRoute.js';
import ojtRoute from './routes/ojtRoute.js';
import researchextensionRoute from './routes/research&extensionRoute.js';
import nstpRoute from './routes/nstpRoute.js';
import recentUploadsRoute from "./routes/recentUploadsRoute.js";
import formsrepositoryRoute from './routes/formsrepositoryRoute.js';
import fileRepositoryRoute from "./routes/fileRepositoryRoute.js";
import dataUploadsRoute from "./routes/dataUploadsRoute.js";
import eventsRoute from "./routes/eventsRoute.js";
import dashboardStatsRoute from "./routes/dashboardStatsRoute.js";
import activityLogsRoute from "./routes/activityLogsRoute.js";
import roleManagementRoute from './routes/roleManagementRoute.js';
import userManagementRoute from './routes/userManagementRoute.js'
import chatbotRoute from './routes/chatbotRoute.js'

// initialize 
dotenv.config();
const app = express();

// middleware 
app.use(cors());
app.use(express.json());

// serve static folders (correct relative paths)
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/private', express.static(path.join(__dirname, '../private')));
app.use('/public', express.static(path.join(__dirname, '../public')));

// routes
app.use('/api/login', loginRoute);
app.use('/api/chatbot', chatbotRoute);
app.use('/api/ojt', ojtRoute);
app.use('/api/researchextension', researchextensionRoute);
app.use('/api/nstp', nstpRoute);
app.use("/api/recent-uploads", recentUploadsRoute);
app.use("/api/files", fileRepositoryRoute);
app.use('/api/forms', formsrepositoryRoute);
app.use("/uploads", express.static("uploads"));
app.use("/api", dataUploadsRoute);
app.use("/api", eventsRoute);
app.use("/api", dashboardStatsRoute);
app.use("/api", activityLogsRoute);
app.use('/private', express.static(path.join(__dirname, '../private')));
app.use("/api", roleManagementRoute);
app.use("/api", userManagementRoute);

// SINGLE /api/files/data endpoint with trash support
app.get("/api/files/data", async (req, res) => {
  try {
    const { includeTrash } = req.query;
    
    let query = `
      SELECT 
        id, 
        file_name AS filename, 
        file_type AS type, 
        file_size, 
        adminid,
        created_at AS uploaded_at,
        file_path,
        chart_type,
        is_trashed,
        trashed_at
      FROM file_repository_files
    `;
    
    // Exclude trashed files by default unless explicitly requested
    if (includeTrash !== 'true') {
      query += ' WHERE is_trashed = FALSE OR is_trashed IS NULL';
    }
    
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query);
    const files = result.rows;

    const enrichedFiles = files.map(file => {
      const dbPath = file.file_path || "";
      const filename = dbPath.split("/").pop();
      const absolutePath = path.resolve(__dirname, "public/uploads/fileRepository", filename);

      if (fs.existsSync(absolutePath)) {
        try {
          const workbook = XLSX.readFile(absolutePath);
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          const labels = jsonData[0] || [];
          const values = jsonData.slice(1)
            .map(row => row.map(v => (typeof v === 'string' ? v.trim() : v)))
            .flat()
            .map(Number)
            .filter(n => !isNaN(n));

          return {
            ...file,
            labels,
            data: values
          };
        } catch (e) {
          console.error(`Failed to parse ${file.filename}:`, e.message);
          return { ...file, labels: [], data: [] };
        }
      } else {
        console.warn(`File not found: ${absolutePath}`);
        return { ...file, labels: [], data: [] };
      }
    });

    res.json(enrichedFiles);
  } catch (err) {
    console.error("Error fetching file data:", err);
    res.status(500).json({ error: "Failed to retrieve files" });
  }
});

// Move file to trash (soft delete)
app.post("/api/files/move-to-trash/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({ error: "File ID is required" });
    }

    const fileResult = await pool.query(
      "SELECT file_name FROM file_repository_files WHERE id = $1",
      [fileId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    const fileName = fileResult.rows[0].file_name;

    const result = await pool.query(
      `UPDATE file_repository_files 
       SET is_trashed = TRUE, 
           trashed_at = NOW()
       WHERE id = $1
       RETURNING id, file_name, is_trashed, trashed_at`,
      [fileId]
    );

    await pool.query(
      `INSERT INTO dashboard_events (event_type, title, details, file_id, meta)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        "repo_file_trashed",
        "Report moved to trash",
        `File moved to trash: ${fileName}`,
        fileId,
        JSON.stringify({ action: "file_trashed", icon: "trash" })
      ]
    );

    res.json({
      success: true,
      message: "File moved to trash successfully",
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Error moving file to trash:", err);
    res.status(500).json({ error: "Failed to move file to trash" });
  }
});

// Restore file from trash
app.post("/api/files/restore/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({ error: "File ID is required" });
    }

    const fileResult = await pool.query(
      "SELECT file_name FROM file_repository_files WHERE id = $1 AND is_trashed = TRUE",
      [fileId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: "File not found in trash" });
    }

    const fileName = fileResult.rows[0].file_name;

    const result = await pool.query(
      `UPDATE file_repository_files 
       SET is_trashed = FALSE, 
           trashed_at = NULL
       WHERE id = $1
       RETURNING id, file_name, is_trashed`,
      [fileId]
    );

    await pool.query(
      `INSERT INTO dashboard_events (event_type, title, details, file_id, meta)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        "repo_file_restored",
        "Report restored",
        `File restored from trash: ${fileName}`,
        fileId,
        JSON.stringify({ action: "file_restored", icon: "undo" })
      ]
    );

    res.json({
      success: true,
      message: "File restored successfully",
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Error restoring file:", err);
    res.status(500).json({ error: "Failed to restore file" });
  }
});

// Get trashed files
app.get("/api/files/trash", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        f.id, 
        f.file_name AS filename, 
        f.file_type AS type, 
        f.file_size, 
        f.adminid,
        f.created_at AS uploaded_at,
        f.file_path,
        f.chart_type,
        f.is_trashed,
        f.trashed_at
      FROM file_repository_files f
      WHERE f.is_trashed = TRUE
      ORDER BY f.trashed_at DESC
    `);

    res.json({
      success: true,
      files: result.rows
    });
  } catch (err) {
    console.error("Error fetching trashed files:", err);
    res.status(500).json({ error: "Failed to fetch trashed files" });
  }
});

// Permanently delete file (from trash only)
// Permanently delete file (from trash only)
app.delete("/api/files/permanent/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;

    const checkResult = await pool.query(
      "SELECT file_path, file_name, is_trashed FROM file_repository_files WHERE id = $1",
      [fileId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    if (!checkResult.rows[0].is_trashed) {
      return res.status(400).json({ 
        error: "File must be in trash before permanent deletion. Move to trash first." 
      });
    }

    const fileName = checkResult.rows[0].file_name;
    
    // Handle different possible file path formats
    let filePath;
    const dbPath = checkResult.rows[0].file_path;
    
    if (dbPath.startsWith('/uploads')) {
      filePath = path.join(__dirname, 'public', dbPath);
    } else if (dbPath.startsWith('./public')) {
      filePath = path.join(__dirname, dbPath.replace('./public/', 'public/'));
    } else {
      const filename = dbPath.split('/').pop() || dbPath;
      filePath = path.join(__dirname, 'public/uploads/fileRepository', filename);
    }

    console.log(`Attempting to delete: ${filePath}`);

    // Try to delete the physical file (don't fail if file doesn't exist)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Deleted file: ${filePath}`);
    } else {
      console.log(`⚠️ File not found (will delete DB record anyway): ${filePath}`);
    }

    await pool.query("DELETE FROM file_repository_files WHERE id = $1", [fileId]);

    await pool.query(
      `INSERT INTO dashboard_events (event_type, title, details, meta)
       VALUES ($1, $2, $3, $4)`,
      [
        "repo_file_deleted_permanent",
        "Report permanently deleted",
        `File permanently deleted: ${fileName}`,
        JSON.stringify({ action: "file_deleted_permanent", icon: "trash-alt" })
      ]
    );

    res.json({ success: true, message: "File permanently deleted" });
  } catch (err) {
    console.error("Error permanently deleting file:", err);
    res.status(500).json({ error: "Failed to permanently delete file" });
  }
});

// Empty trash (delete all trashed files permanently)
// Empty trash (delete all trashed files permanently)
app.delete("/api/files/empty-trash", async (req, res) => {
  try {
    const trashedFiles = await pool.query(
      "SELECT id, file_path, file_name FROM file_repository_files WHERE is_trashed = TRUE"
    );

    if (trashedFiles.rows.length === 0) {
      return res.json({ 
        success: true, 
        message: "Trash is already empty",
        deletedCount: 0 
      });
    }

    let deletedCount = 0;
    let errorFiles = [];

    for (const file of trashedFiles.rows) {
      try {
        // Handle different possible file path formats
        let filePath;
        
        if (file.file_path.startsWith('/uploads')) {
          // Path starts with /uploads
          filePath = path.join(__dirname, 'public', file.file_path);
        } else if (file.file_path.startsWith('./public')) {
          // Path starts with ./public
          filePath = path.join(__dirname, file.file_path.replace('./public/', 'public/'));
        } else {
          // Assume it's relative to uploads/fileRepository
          const filename = file.file_path.split('/').pop() || file.file_path;
          filePath = path.join(__dirname, 'public/uploads/fileRepository', filename);
        }

        console.log(`Attempting to delete: ${filePath}`);
        
        // Try to delete the physical file (don't fail if file doesn't exist)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`✅ Deleted file: ${filePath}`);
        } else {
          console.log(`⚠️ File not found (will delete DB record anyway): ${filePath}`);
        }

        // Delete database record
        await pool.query("DELETE FROM file_repository_files WHERE id = $1", [file.id]);
        deletedCount++;
        
      } catch (fileError) {
        console.error(`Error deleting file ${file.file_name}:`, fileError);
        errorFiles.push(file.file_name);
        // Continue with other files even if one fails
      }
    }

    // Log the event
    try {
      await pool.query(
        `INSERT INTO dashboard_events (event_type, title, details, meta)
         VALUES ($1, $2, $3, $4)`,
        [
          "repo_trash_emptied",
          "Trash emptied",
          `${deletedCount} file(s) permanently deleted from trash${errorFiles.length > 0 ? ` (${errorFiles.length} files had errors)` : ''}`,
          JSON.stringify({ action: "trash_emptied", deletedCount, errorFiles, icon: "trash-alt" })
        ]
      );
    } catch (eventError) {
      console.error("Error logging event:", eventError);
      // Don't fail the whole operation if event logging fails
    }

    // Send response
    if (errorFiles.length > 0) {
      res.json({
        success: true,
        message: `${deletedCount} file(s) deleted (${errorFiles.length} had errors: ${errorFiles.join(', ')})`,
        deletedCount,
        errors: errorFiles
      });
    } else {
      res.json({
        success: true,
        message: `${deletedCount} file(s) permanently deleted`,
        deletedCount
      });
    }
    
  } catch (err) {
    console.error("Error emptying trash:", err);
    res.status(500).json({ error: `Failed to empty trash: ${err.message}` });
  }
});

// Save AI interpretation to database
app.post("/api/files/save-interpretation", async (req, res) => {
  try {
    const { file_id, interpretation, column_analyzed } = req.body;

    if (!file_id || !interpretation) {
      return res.status(400).json({ error: "file_id and interpretation are required" });
    }

    const result = await pool.query(
      `UPDATE file_repository_files 
       SET ai_interpretation = $1, 
           interpretation_generated_at = NOW(),
           analyzed_column = $2
       WHERE id = $3
       RETURNING id, ai_interpretation, interpretation_generated_at`,
      [interpretation, column_analyzed, file_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    res.json({
      success: true,
      message: "Interpretation saved successfully",
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Error saving interpretation:", err);
    res.status(500).json({ error: "Failed to save interpretation" });
  }
});

// Get saved interpretation for a file
app.get("/api/files/interpretation/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;

    const result = await pool.query(
      `SELECT ai_interpretation, interpretation_generated_at, analyzed_column 
       FROM file_repository_files 
       WHERE id = $1`,
      [fileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    res.json({
      interpretation: result.rows[0].ai_interpretation,
      generated_at: result.rows[0].interpretation_generated_at,
      analyzed_column: result.rows[0].analyzed_column
    });
  } catch (err) {
    console.error("Error fetching interpretation:", err);
    res.status(500).json({ error: "Failed to fetch interpretation" });
  }
});

// pagstart ng server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));