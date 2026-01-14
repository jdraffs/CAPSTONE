// routes/trashRoute.js - UNIFIED TRASH MANAGEMENT
// This replaces all scattered trash logic in server.js and fileRepositoryRoute.js

import express from 'express';
import pool from "../db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// MOVE TO TRASH (Soft Delete)
// ==========================================
router.post("/trash/move/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({ error: "File ID is required" });
    }

    // Check if file exists
    const fileResult = await pool.query(
      "SELECT file_name FROM file_repository_files WHERE id = $1",
      [fileId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    const fileName = fileResult.rows[0].file_name;

    // Soft delete: mark as trashed
    const result = await pool.query(
      `UPDATE file_repository_files 
       SET is_trashed = TRUE, 
           trashed_at = NOW()
       WHERE id = $1
       RETURNING id, file_name, is_trashed, trashed_at`,
      [fileId]
    );

    // Log the event
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

// ==========================================
// RESTORE FROM TRASH
// ==========================================
router.post("/trash/restore/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({ error: "File ID is required" });
    }

    // Check if file exists in trash
    const fileResult = await pool.query(
      "SELECT file_name FROM file_repository_files WHERE id = $1 AND is_trashed = TRUE",
      [fileId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: "File not found in trash" });
    }

    const fileName = fileResult.rows[0].file_name;

    // Restore: unmark as trashed
    const result = await pool.query(
      `UPDATE file_repository_files 
       SET is_trashed = FALSE, 
           trashed_at = NULL
       WHERE id = $1
       RETURNING id, file_name, is_trashed`,
      [fileId]
    );

    // Log the event
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

// ==========================================
// GET ALL TRASHED FILES
// ==========================================
router.get("/trash", async (req, res) => {
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
        f.trashed_at,
        f.folder_id
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

// ==========================================
// PERMANENTLY DELETE SINGLE FILE
// ==========================================
router.delete("/trash/permanent/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;

    // Get file info before deletion
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
    const dbPath = checkResult.rows[0].file_path;
    
    // Handle different possible file path formats
    let filePath;
    if (dbPath.startsWith('/uploads')) {
      filePath = path.join(__dirname, '..', 'public', dbPath);
    } else if (dbPath.startsWith('./public')) {
      filePath = path.join(__dirname, '..', dbPath.replace('./public/', 'public/'));
    } else {
      const filename = dbPath.split('/').pop() || dbPath;
      filePath = path.join(__dirname, '..', 'public/uploads/fileRepository', filename);
    }

    console.log(`Attempting to delete: ${filePath}`);

    // Try to delete the physical file (don't fail if file doesn't exist)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Deleted file: ${filePath}`);
    } else {
      console.log(`⚠️ File not found (will delete DB record anyway): ${filePath}`);
    }

    // Delete from database
    await pool.query("DELETE FROM file_repository_files WHERE id = $1", [fileId]);

    // Log the event
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

    res.json({ 
      success: true, 
      message: "File permanently deleted",
      fileName: fileName
    });
  } catch (err) {
    console.error("Error permanently deleting file:", err);
    res.status(500).json({ error: "Failed to permanently delete file" });
  }
});

// ==========================================
// EMPTY TRASH (Delete ALL trashed files)
// ==========================================
router.delete("/trash/empty", async (req, res) => {
  try {
    // Get all trashed files
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

    // Delete each file
    for (const file of trashedFiles.rows) {
      try {
        const dbPath = file.file_path;
        
        // Handle different possible file path formats
        let filePath;
        if (dbPath.startsWith('/uploads')) {
          filePath = path.join(__dirname, '..', 'public', dbPath);
        } else if (dbPath.startsWith('./public')) {
          filePath = path.join(__dirname, '..', dbPath.replace('./public/', 'public/'));
        } else {
          const filename = dbPath.split('/').pop() || dbPath;
          filePath = path.join(__dirname, '..', 'public/uploads/fileRepository', filename);
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

export default router;