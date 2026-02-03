// facultyManagementRoute.js - UPDATED API Routes for Faculty Management
// Academic Affairs Manager (adminSerrano) Backend Routes
// WITH SEPARATED NAME FIELDS & YEAR-ONLY PDS

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
// HELPER FUNCTION: BUILD FULL NAME
// ============================================

function buildFullName(firstName, middleInitial, lastName) {
  if (middleInitial && middleInitial.trim()) {
    return `${firstName} ${middleInitial}. ${lastName}`;
  }
  return `${firstName} ${lastName}`;
}

// ============================================
// GET ALL ACTIVE FACULTY
// ============================================

router.get('/faculty', async (req, res) => {
  try {
    console.log('📚 Fetching active faculty members...');
    
    const query = `
      SELECT 
        id,
        last_name,
        first_name,
        middle_initial,
        birthdate,
        contact_number,
        program,
        employment_type,
        highest_degree,
        last_pds_update,
        image_path,
        is_active,
        created_at,
        updated_at
      FROM faculty
      WHERE is_active = TRUE
      ORDER BY last_name ASC, first_name ASC
    `;
    
    const result = await pool.query(query);
    
    // Add full_name to each record
    const facultyWithFullNames = result.rows.map(faculty => ({
      ...faculty,
      full_name: buildFullName(faculty.first_name, faculty.middle_initial, faculty.last_name)
    }));
    
    console.log(`✅ Found ${facultyWithFullNames.length} active faculty members`);
    
    res.json(facultyWithFullNames);
    
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
        last_name,
        first_name,
        middle_initial,
        birthdate,
        contact_number,
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
    
    // Add full_name to each record
    const facultyWithFullNames = result.rows.map(faculty => ({
      ...faculty,
      full_name: buildFullName(faculty.first_name, faculty.middle_initial, faculty.last_name)
    }));
    
    console.log(`✅ Found ${facultyWithFullNames.length} deactivated faculty members`);
    
    res.json(facultyWithFullNames);
    
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
// GET SINGLE FACULTY BY ID (WITH COMPLETE INFO)
// ============================================

router.get('/faculty/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📚 Fetching faculty member with ID: ${id}`);
    
    // Get basic faculty info
    const facultyQuery = `
      SELECT 
        id, last_name, first_name, middle_initial, birthdate, contact_number,
        program, employment_type, highest_degree, last_pds_update,
        image_path, is_active, created_at, updated_at
      FROM faculty
      WHERE id = $1
    `;
    
    const facultyResult = await pool.query(facultyQuery, [id]);
    
    if (facultyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Faculty member not found'
      });
    }
    
    const faculty = facultyResult.rows[0];
    faculty.full_name = buildFullName(faculty.first_name, faculty.middle_initial, faculty.last_name);
    
    // Get education
    const educationQuery = `
      SELECT degree_level, degree_title, school_name, year_graduated, field_of_study
      FROM faculty_education
      WHERE faculty_id = $1
      ORDER BY CASE degree_level
        WHEN 'Doctorate' THEN 1
        WHEN 'Masters' THEN 2
        WHEN 'Undergraduate' THEN 3
      END
    `;
    const educationResult = await pool.query(educationQuery, [id]);
    
    // Get certifications
    const certsQuery = `
      SELECT certification_name, issuing_organization, license_number, 
             issue_date, expiry_date, is_active
      FROM faculty_certifications
      WHERE faculty_id = $1 AND is_active = TRUE
      ORDER BY issue_date DESC
    `;
    const certsResult = await pool.query(certsQuery, [id]);
    
    // Get government agencies
    const agenciesQuery = `
      SELECT agency_type, agency_name, position, employment_status,
             start_date, end_date, is_active
      FROM faculty_government_agencies
      WHERE faculty_id = $1 AND is_active = TRUE
      ORDER BY start_date DESC
    `;
    const agenciesResult = await pool.query(agenciesQuery, [id]);
    
    const completeProfile = {
      ...faculty,
      education: educationResult.rows,
      certifications: certsResult.rows,
      government_agencies: agenciesResult.rows
    };
    
    console.log(`✅ Found faculty: ${faculty.full_name}`);
    
    res.json(completeProfile);
    
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
    const { 
      last_name, first_name, middle_initial, birthdate, contact_number,
      program, employment_type, highest_degree, last_pds_update 
    } = req.body;
    const created_by = req.body.created_by || 'adminSerrano';
    
    // Validation
    if (!last_name || !first_name || !program || !employment_type || !highest_degree) {
      return res.status(400).json({
        success: false,
        error: 'All required fields must be filled'
      });
    }
    
    // Validate program
    const validPrograms = ['BSIT', 'BSCpE', 'BSHM', 'BSOA', 'Gen Ed', 'Others'];
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
    const pds_year = last_pds_update ? parseInt(last_pds_update) : null;
    
    await client.query('BEGIN');
    
    const fullName = buildFullName(first_name, middle_initial, last_name);
    console.log(`📝 Creating new faculty: ${fullName}`);
    
    const insertQuery = `
      INSERT INTO faculty (
        last_name, first_name, middle_initial, birthdate, contact_number,
        program, employment_type, highest_degree, last_pds_update,
        image_path, created_by, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE)
      RETURNING id, last_name, first_name, middle_initial, program, employment_type, highest_degree, image_path, created_at
    `;
    
    const result = await client.query(insertQuery, [
      last_name, first_name, middle_initial || null, birthdate, contact_number,
      program, employment_type, highest_degree, pds_year,
      image_path, created_by
    ]);
    
    await client.query('COMMIT');
    
    const newFaculty = result.rows[0];
    newFaculty.full_name = buildFullName(newFaculty.first_name, newFaculty.middle_initial, newFaculty.last_name);
    
    console.log(`✅ Faculty created successfully: ${fullName} (ID: ${newFaculty.id})`);
    
    res.status(201).json({
      success: true,
      message: `Faculty "${fullName}" created successfully`,
      faculty: newFaculty
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
    const { last_name, first_name, middle_initial, birthdate, contact_number, program, employment_type, highest_degree, last_pds_update } = req.body;
    
    // Check if faculty exists
    const checkQuery = 'SELECT id, first_name, middle_initial, last_name, image_path FROM faculty WHERE id = $1';
    const checkResult = await client.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Faculty member not found'
      });
    }
    
    await client.query('BEGIN');
    
    const faculty = checkResult.rows[0];
    const oldFullName = buildFullName(faculty.first_name, faculty.middle_initial, faculty.last_name);
    
    console.log(`📝 Updating faculty: ${oldFullName}`);
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (last_name) {
      updates.push(`last_name = $${paramCount}`);
      values.push(last_name);
      paramCount++;
    }
    
    if (first_name) {
      updates.push(`first_name = $${paramCount}`);
      values.push(first_name);
      paramCount++;
    }
    
    if (middle_initial !== undefined) {
      updates.push(`middle_initial = $${paramCount}`);
      values.push(middle_initial || null);
      paramCount++;
    }
    
    if (birthdate) {
      updates.push(`birthdate = $${paramCount}`);
      values.push(birthdate);
      paramCount++;
    }
    
    if (contact_number) {
      updates.push(`contact_number = $${paramCount}`);
      values.push(contact_number);
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
    
    if (last_pds_update) {
      updates.push(`last_pds_update = $${paramCount}`);
      values.push(parseInt(last_pds_update));
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
      RETURNING id, last_name, first_name, middle_initial, program, employment_type, highest_degree, image_path, updated_at
    `;
    
    const result = await client.query(updateQuery, values);
    
    await client.query('COMMIT');
    
    const updatedFaculty = result.rows[0];
    updatedFaculty.full_name = buildFullName(updatedFaculty.first_name, updatedFaculty.middle_initial, updatedFaculty.last_name);
    
    console.log(`✅ Faculty updated successfully: ${updatedFaculty.full_name}`);
    
    res.json({
      success: true,
      message: `Faculty "${updatedFaculty.full_name}" updated successfully`,
      faculty: updatedFaculty
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
    
    const checkQuery = 'SELECT id, first_name, middle_initial, last_name, is_active FROM faculty WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Faculty member not found'
      });
    }
    
    const faculty = checkResult.rows[0];
    const fullName = buildFullName(faculty.first_name, faculty.middle_initial, faculty.last_name);
    
    if (!faculty.is_active) {
      return res.status(400).json({
        success: false,
        error: 'Faculty is already deactivated'
      });
    }
    
    console.log(`🚫 Deactivating faculty: ${fullName}`);
    
    const updateQuery = `
      UPDATE faculty
      SET is_active = FALSE,
          deactivated_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, first_name, middle_initial, last_name, deactivated_at
    `;
    
    const result = await pool.query(updateQuery, [id]);
    
    const deactivatedFaculty = result.rows[0];
    deactivatedFaculty.full_name = buildFullName(deactivatedFaculty.first_name, deactivatedFaculty.middle_initial, deactivatedFaculty.last_name);
    
    console.log(`✅ Faculty deactivated: ${deactivatedFaculty.full_name}`);
    
    res.json({
      success: true,
      message: `Faculty "${deactivatedFaculty.full_name}" has been deactivated`,
      faculty: deactivatedFaculty
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
    
    const checkQuery = 'SELECT id, first_name, middle_initial, last_name, is_active FROM faculty WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Faculty member not found'
      });
    }
    
    const faculty = checkResult.rows[0];
    const fullName = buildFullName(faculty.first_name, faculty.middle_initial, faculty.last_name);
    
    if (faculty.is_active) {
      return res.status(400).json({
        success: false,
        error: 'Faculty is already active'
      });
    }
    
    console.log(`🔄 Restoring faculty: ${fullName}`);
    
    const updateQuery = `
      UPDATE faculty
      SET is_active = TRUE,
          restored_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, first_name, middle_initial, last_name, restored_at
    `;
    
    const result = await pool.query(updateQuery, [id]);
    
    const restoredFaculty = result.rows[0];
    restoredFaculty.full_name = buildFullName(restoredFaculty.first_name, restoredFaculty.middle_initial, restoredFaculty.last_name);
    
    console.log(`✅ Faculty restored: ${restoredFaculty.full_name}`);
    
    res.json({
      success: true,
      message: `Faculty "${restoredFaculty.full_name}" has been restored`,
      faculty: restoredFaculty
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
    
    const query = `SELECT * FROM vw_faculty_overall_stats`;
    
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
    
    const query = `SELECT * FROM vw_program_summary_enhanced`;
    
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
        f.first_name,
        f.middle_initial,
        f.last_name
      FROM faculty_history fh
      JOIN faculty f ON f.id = fh.faculty_id
      WHERE fh.faculty_id = $1
      ORDER BY fh.performed_at DESC
    `;
    
    const result = await pool.query(query, [id]);
    
    // Add full_name to each history record
    const historyWithFullNames = result.rows.map(record => ({
      ...record,
      full_name: buildFullName(record.first_name, record.middle_initial, record.last_name)
    }));
    
    console.log(`✅ Found ${historyWithFullNames.length} history records`);
    
    res.json({
      success: true,
      count: historyWithFullNames.length,
      history: historyWithFullNames
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