// routes/dashboardStatsRoute.js
import express from "express";
import pool from "../db.js";

const router = express.Router();

// Get dashboard statistics
router.get("/dashboard/stats", async (req, res) => {
  try {
    // 1. Count all events (Recent System Updates)
    const eventsResult = await pool.query(
      "SELECT COUNT(*) as total FROM dashboard_events"
    );
    const totalEvents = parseInt(eventsResult.rows[0].total) || 0;

    // 2. Count report_generated events
    const reportsResult = await pool.query(
      "SELECT COUNT(*) as total FROM dashboard_events WHERE event_type = 'report_generated'"
    );
    const totalReports = parseInt(reportsResult.rows[0].total) || 0;

    // 3. Count repository items (files + folders)
    const filesResult = await pool.query(
      "SELECT COUNT(*) as total FROM file_repository_files"
    );
    const foldersResult = await pool.query(
      "SELECT COUNT(*) as total FROM file_repository_folders"
    );
    
    const totalFiles = parseInt(filesResult.rows[0].total) || 0;
    const totalFolders = parseInt(foldersResult.rows[0].total) || 0;
    const totalRepoItems = totalFiles + totalFolders;

    res.json({
      success: true,
      stats: {
        totalUpdates: totalEvents,        // Card 1
        totalReports: totalReports,       // Card 2
        totalRepoItems: totalRepoItems    // Card 3
      }
    });

  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics"
    });
  }
});

export default router;