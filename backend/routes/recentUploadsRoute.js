// routes/recentUploadsRoute.js
import express from 'express';
import pool from '../db.js'; // ✅ Use shared DB connection from db.js — no need to redeclare

const router = express.Router();

// ✅ Route: get total uploads from all modules in the past 24 hours
router.get('/', async (req, res) => {
  try {
    const queries = [
      "SELECT COUNT(*) FROM public.ojt_posts WHERE created_at >= (NOW() + INTERVAL '8 hour') - INTERVAL '1 day'",
      "SELECT COUNT(*) FROM public.researchextension_posts WHERE created_at >= (NOW() + INTERVAL '8 hour') - INTERVAL '1 day'",
      "SELECT COUNT(*) FROM public.nstp_posts WHERE created_at >= (NOW() + INTERVAL '8 hour') - INTERVAL '1 day'"
    ];

    // Run all queries in parallel
    const results = await Promise.all(queries.map(q => pool.query(q)));

    // Add all counts together
    const totalRecentUploads = results.reduce(
      (sum, r) => sum + parseInt(r.rows[0].count, 10),
      0
    );


    res.json({ success: true, totalRecentUploads });
  } catch (err) {
    console.error('❌ Error fetching total recent uploads:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch recent uploads' });
  }
});

export default router;
