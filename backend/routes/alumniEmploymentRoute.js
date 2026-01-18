// alumniEmploymentRoute.js
import express from 'express';
import pkg from 'pg';

const router = express.Router();
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'capstone_db',
  password: 'Kisses123',
  port: 5432
});

// GET all alumni responses (for admin dashboard)
router.get('/alumni-employment/responses', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        full_name,
        batch,
        program,
        employment_status,
        work_type,
        employment_timeline,
        submitted_at
      FROM alumni_employment_responses
      ORDER BY submitted_at DESC
    `;
    
    const result = await pool.query(query);
    res.json({ success: true, responses: result.rows });
  } catch (err) {
    console.error('Error fetching alumni responses:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch responses' });
  }
});

// GET statistics (for admin dashboard)
router.get('/alumni-employment/stats', async (req, res) => {
  try {
    const totalQuery = 'SELECT COUNT(*) as total FROM alumni_employment_responses';
    const employedQuery = `
      SELECT COUNT(*) as employed 
      FROM alumni_employment_responses 
      WHERE employment_status IN ('Employed', 'Self-Employed')
    `;
    const unemployedQuery = `
      SELECT COUNT(*) as unemployed 
      FROM alumni_employment_responses 
      WHERE employment_status = 'Unemployed'
    `;
    const timelineQuery = `
      SELECT employment_timeline, COUNT(*) as count
      FROM alumni_employment_responses
      WHERE employment_timeline IS NOT NULL
      GROUP BY employment_timeline
    `;

    const [totalResult, employedResult, unemployedResult, timelineResult] = await Promise.all([
      pool.query(totalQuery),
      pool.query(employedQuery),
      pool.query(unemployedQuery),
      pool.query(timelineQuery)
    ]);

    const stats = {
      total: parseInt(totalResult.rows[0].total),
      employed: parseInt(employedResult.rows[0].employed),
      unemployed: parseInt(unemployedResult.rows[0].unemployed),
      timeline: timelineResult.rows
    };

    res.json({ success: true, stats });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
});

// POST new alumni response (public submission)
router.post('/alumni-employment/submit', async (req, res) => {
  try {
    const { 
      full_name, 
      batch, 
      program, 
      employment_status, 
      work_type, 
      employment_timeline 
    } = req.body;

    // Validation
    if (!full_name || !batch || !program || !employment_status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please fill in all required fields' 
      });
    }

    const query = `
      INSERT INTO alumni_employment_responses 
      (full_name, batch, program, employment_status, work_type, employment_timeline)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      full_name.trim(),
      batch.trim(),
      program,
      employment_status,
      work_type ? work_type.trim() : null,
      employment_timeline || null
    ];

    const result = await pool.query(query, values);
    
    res.json({ 
      success: true, 
      message: 'Response submitted successfully!',
      response: result.rows[0]
    });
  } catch (err) {
    console.error('Error submitting response:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit response. Please try again.' 
    });
  }
});

// DELETE response (admin only)
router.delete('/alumni-employment/responses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM alumni_employment_responses WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Response not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Response deleted successfully' 
    });
  } catch (err) {
    console.error('Error deleting response:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete response' 
    });
  }
});

// GET responses with filters
router.get('/alumni-employment/filter', async (req, res) => {
  try {
    const { batch, program, status } = req.query;
    
    let query = 'SELECT * FROM alumni_employment_responses WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (batch) {
      query += ` AND batch = $${paramCount}`;
      params.push(batch);
      paramCount++;
    }

    if (program) {
      query += ` AND program = $${paramCount}`;
      params.push(program);
      paramCount++;
    }

    if (status) {
      query += ` AND employment_status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ' ORDER BY submitted_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, responses: result.rows });
  } catch (err) {
    console.error('Error filtering responses:', err);
    res.status(500).json({ success: false, message: 'Failed to filter responses' });
  }
});

export default router;