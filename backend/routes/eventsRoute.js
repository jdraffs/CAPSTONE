// routes/eventsRoute.js
import express from "express";
import pool from "../db.js";
const router = express.Router();

// GET recent events (limit optional)
router.get("/events/recent", async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  try {
    const q = `SELECT id, event_type, title, details, file_id, meta, created_at
               FROM dashboard_events
               ORDER BY created_at DESC
               LIMIT $1`;
    const result = await pool.query(q, [limit]);
    res.json({ success: true, events: result.rows });
  } catch (err) {
    console.error("Failed to fetch events", err);
    res.status(500).json({ success: false, message: "Failed to fetch events" });
  }
});

// POST create an event
router.post("/events", async (req, res) => {
  const { event_type, title, details, file_id, meta } = req.body;
  try {
    const q = `INSERT INTO dashboard_events (event_type, title, details, file_id, meta)
               VALUES ($1,$2,$3,$4,$5) RETURNING *`;
    const result = await pool.query(q, [event_type, title, details, file_id || null, meta || {}]);
    res.json({ success: true, event: result.rows[0] });
  } catch (err) {
    console.error("Failed to create event", err);
    res.status(500).json({ success: false, message: "Failed to create event" });
  }
});

export default router;
