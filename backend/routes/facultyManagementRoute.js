// facultyManagementRoute.js - API Routes for Faculty Management
// Academic Affairs Manager (adminSerrano) Backend Routes

import express from 'express';
import pool from '../db.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// ============================================
// MULTER CONFIGURATION FOR IMAGE UPLOADS
// ============================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/faculty');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// ============================================
// GET ALL ACTIVE FACULTY
// ============================================

router.get('/faculty', async (req, res) => {
  try {
    console.log('📚 Fetching active faculty members...');
    
    const query = `
      SELECT 
        id,
        full_name,
        program,
        employment_type,
        highest_degree,
        image_path,
        is_active,
        created_at,
        updated_at
      FROM faculty
      WHERE is_active = TRUE
      ORDER BY full_name ASC
    `;
    
    const result = await pool.query(query);
    
    console.log(`✅ Found ${result.rows.length} active faculty members`);
    
    res.json({
      success: true,
      count: result.rows.length,
      faculty: result.rows
    });
    
  } catch (error) {
    console.error('❌ Error fetching faculty:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch faculty members',
      message: error.message
    });
  }
});

// ============================================
// GET DEACTIVATED FACULTY
// ============================================

router.get('/faculty/deactivated', async (req, res) => {
  try {
    console.log('📚 Fetching deactivated faculty members...');
    
    const query = `
      SELECT 
        id,
        full_name,
        program,
        employment_type,
        highest_degree,
        image_path,
        is_active,
        deactivated_at,
        created_at
      FROM faculty
      WHERE is_active = FALSE
      ORDER BY deactivated_at DESC
    `;
    
    const result = await pool.query(query);
    
    console.log(`✅ Found ${result.rows.length} deactivated faculty members`);
    
    res.json({
      success: true,
      count: result.rows.length,
      faculty: result.rows
    });
    
  } catch (error) {
    console.error('❌ Error fetching deactivated faculty:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deactivated faculty',
      message: error.message
    });
  }
});

// ============================================
// GET SINGLE FACULTY BY ID
// ============================================

router.get('/faculty/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📚 Fetching faculty member with ID: ${id}`);
    
    const query = `
      SELECT 
        id,
        full_name,
        program,
        employment_type,
        highest_degree,
        image_path,
        is_active,
        created_at,
        updated_at,
        deactivated_at,
        restored_at
      FROM faculty
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Faculty member not found'
      });
    }
    
    console.log(`✅ Found faculty: ${result.rows[0].full_name}`);
    
    res.json({
      success: true,
      faculty: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Error fetching faculty:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch faculty member',
      message: error.message
    });
  }
});

// ============================================
// CREATE NEW FACULTY
// ============================================

router.post('/faculty', upload.single('image'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { full_name, program, employment_type, highest_degree } = req.body;
    const created_by = req.body.created_by || 'adminSerrano';
    
    // Validation
    if (!full_name || !program || !employment_type || !highest_degree) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }
    
    // Validate program
    const validPrograms = ['BSIT', 'BSCpE', 'BSHM', 'BSOA'];
    if (!validPrograms.includes(program)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid program'
      });
    }
    
    // Validate employment type
    const validEmployment = ['Regular', 'Part-Time'];
    if (!validEmployment.includes(employment_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid employment type'
      });
    }
    
    // Validate degree
    const validDegrees = ['Bachelor', 'Master', 'Doctorate'];
    if (!validDegrees.includes(highest_degree)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid degree'
      });
    }
    
    const image_path = req.file ? `/uploads/faculty/${req.file.filename}` : null;
    
    await client.query('BEGIN');
    
    console.log(`📝 Creating new faculty: ${full_name}`);
    
    const insertQuery = `
      INSERT INTO faculty (
        full_name,
        program,
        employment_type,
        highest_degree,
        image_path,
        created_by,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, TRUE)
      RETURNING id, full_name, program, employment_type, highest_degree, image_path, created_at
    `;
    
    const result = await client.query(insertQuery, [
      full_name,
      program,
      employment_type,
      highest_degree,
      image_path,
      created_by
    ]);
    
    await client.query('COMMIT');
    
    console.log(`✅ Faculty created successfully: ${full_name} (ID: ${result.rows[0].id})`);
    
    res.status(201).json({
      success: true,
      message: `Faculty "${full_name}" created successfully`,
      faculty: result.rows[0]
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating faculty:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create faculty member',
      message: error.message
    });
  } finally {
    client.release();
  }
});

// ============================================
// UPDATE FACULTY
// ============================================

router.put('/faculty/:id', upload.single('image'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { full_name, program, employment_type, highest_degree } = req.body;
    
    // Check if faculty exists
    const checkQuery = 'SELECT id, full_name, image_path FROM faculty WHERE id = $1';
    const checkResult = await client.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Faculty member not found'
      });
    }
    
    await client.query('BEGIN');
    
    const faculty = checkResult.rows[0];
    
    console.log(`📝 Updating faculty: ${faculty.full_name}`);
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (full_name) {
      updates.push(`full_name = $${paramCount}`);
      values.push(full_name);
      paramCount++;
    }
    
    if (program) {
      updates.push(`program = $${paramCount}`);
      values.push(program);
      paramCount++;
    }
    
    if (employment_type) {
      updates.push(`employment_type = $${paramCount}`);
      values.push(employment_type);
      paramCount++;
    }
    
    if (highest_degree) {
      updates.push(`highest_degree = $${paramCount}`);
      values.push(highest_degree);
      paramCount++;
    }
    
    if (req.file) {
      updates.push(`image_path = $${paramCount}`);
      values.push(`/uploads/faculty/${req.file.filename}`);
      paramCount++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    values.push(id); // for WHERE clause
    
    const updateQuery = `
      UPDATE faculty
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, full_name, program, employment_type, highest_degree, image_path, updated_at
    `;
    
    const result = await client.query(updateQuery, values);
    
    await client.query('COMMIT');
    
    console.log(`✅ Faculty updated successfully: ${result.rows[0].full_name}`);
    
    res.json({
      success: true,
      message: `Faculty "${result.rows[0].full_name}" updated successfully`,
      faculty: result.rows[0]
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating faculty:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update faculty member',
      message: error.message
    });
  } finally {
    client.release();
  }
});

// ============================================
// DEACTIVATE FACULTY
// ============================================

router.post('/faculty/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if faculty exists and is active
    const checkQuery = 'SELECT id, full_name, is_active FROM faculty WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Faculty member not found'
      });
    }
    
    const faculty = checkResult.rows[0];
    
    if (!faculty.is_active) {
      return res.status(400).json({
        success: false,
        error: 'Faculty is already deactivated'
      });
    }
    
    console.log(`🚫 Deactivating faculty: ${faculty.full_name}`);
    
    const updateQuery = `
      UPDATE faculty
      SET is_active = FALSE,
          deactivated_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, full_name, deactivated_at
    `;
    
    const result = await pool.query(updateQuery, [id]);
    
    console.log(`✅ Faculty deactivated: ${result.rows[0].full_name}`);
    
    res.json({
      success: true,
      message: `Faculty "${result.rows[0].full_name}" has been deactivated`,
      faculty: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Error deactivating faculty:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate faculty member',
      message: error.message
    });
  }
});

// ============================================
// RESTORE FACULTY
// ============================================

router.post('/faculty/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if faculty exists and is deactivated
    const checkQuery = 'SELECT id, full_name, is_active FROM faculty WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Faculty member not found'
      });
    }
    
    const faculty = checkResult.rows[0];
    
    if (faculty.is_active) {
      return res.status(400).json({
        success: false,
        error: 'Faculty is already active'
      });
    }
    
    console.log(`🔄 Restoring faculty: ${faculty.full_name}`);
    
    const updateQuery = `
      UPDATE faculty
      SET is_active = TRUE,
          restored_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, full_name, restored_at
    `;
    
    const result = await pool.query(updateQuery, [id]);
    
    console.log(`✅ Faculty restored: ${result.rows[0].full_name}`);
    
    res.json({
      success: true,
      message: `Faculty "${result.rows[0].full_name}" has been restored`,
      faculty: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Error restoring faculty:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore faculty member',
      message: error.message
    });
  }
});

// ============================================
// GET FACULTY STATISTICS
// ============================================

router.get('/faculty/stats/overview', async (req, res) => {
  try {
    console.log('📊 Generating faculty statistics...');
    
    const query = `
      SELECT 
        COUNT(*) as total_active,
        SUM(CASE WHEN employment_type = 'Regular' THEN 1 ELSE 0 END) as total_regular,
        SUM(CASE WHEN employment_type = 'Part-Time' THEN 1 ELSE 0 END) as total_parttime,
        SUM(CASE WHEN highest_degree = 'Doctorate' THEN 1 ELSE 0 END) as total_doctoral,
        SUM(CASE WHEN highest_degree = 'Master' THEN 1 ELSE 0 END) as total_masters,
        SUM(CASE WHEN highest_degree = 'Bachelor' THEN 1 ELSE 0 END) as total_bachelor,
        ROUND(SUM(CASE WHEN highest_degree IN ('Doctorate', 'Master') THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as advanced_degree_percent
      FROM faculty
      WHERE is_active = TRUE
    `;
    
    const result = await pool.query(query);
    
    console.log('✅ Statistics generated successfully');
    
    res.json({
      success: true,
      statistics: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Error generating statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate statistics',
      message: error.message
    });
  }
});

// ============================================
// GET PROGRAM STATISTICS
// ============================================

router.get('/faculty/stats/by-program', async (req, res) => {
  try {
    console.log('📊 Generating program statistics...');
    
    const query = `
      SELECT 
        program,
        COUNT(*) as total_faculty,
        SUM(CASE WHEN employment_type = 'Regular' THEN 1 ELSE 0 END) as regular_count,
        SUM(CASE WHEN employment_type = 'Part-Time' THEN 1 ELSE 0 END) as parttime_count,
        SUM(CASE WHEN highest_degree = 'Doctorate' THEN 1 ELSE 0 END) as doctoral_count,
        SUM(CASE WHEN highest_degree = 'Master' THEN 1 ELSE 0 END) as masters_count,
        SUM(CASE WHEN highest_degree = 'Bachelor' THEN 1 ELSE 0 END) as bachelor_count
      FROM faculty
      WHERE is_active = TRUE
      GROUP BY program
      ORDER BY program
    `;
    
    const result = await pool.query(query);
    
    console.log('✅ Program statistics generated successfully');
    
    res.json({
      success: true,
      programs: result.rows
    });
    
  } catch (error) {
    console.error('❌ Error generating program statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate program statistics',
      message: error.message
    });
  }
});

// ============================================
// GET FACULTY CHANGE HISTORY
// ============================================

router.get('/faculty/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📜 Fetching history for faculty ID: ${id}`);
    
    const query = `
      SELECT 
        fh.id,
        fh.action,
        fh.changed_fields,
        fh.performed_by,
        fh.performed_at,
        f.full_name
      FROM faculty_history fh
      JOIN faculty f ON f.id = fh.faculty_id
      WHERE fh.faculty_id = $1
      ORDER BY fh.performed_at DESC
    `;
    
    const result = await pool.query(query, [id]);
    
    console.log(`✅ Found ${result.rows.length} history records`);
    
    res.json({
      success: true,
      count: result.rows.length,
      history: result.rows
    });
    
  } catch (error) {
    console.error('❌ Error fetching history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch history',
      message: error.message
    });
  }
});

// ============================================
// EXPORT ROUTER
// ============================================

export default router;