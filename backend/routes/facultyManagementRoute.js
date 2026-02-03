// facultyManagementRoute.js - UPDATED WITH EDIT & DELETE
// NEW ENDPOINTS:
// 1. PUT /faculty/:id - Update faculty with image upload support
// 2. DELETE /faculty/:id - Permanently delete faculty

import express from 'express';
import pool from '../db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// ============================================
// MULTER CONFIGURATION
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
  limits: { fileSize: 5 * 1024 * 1024 },
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
// HELPER FUNCTION
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
        id, last_name, first_name, middle_initial, birthdate, contact_number,
        program, employment_type, highest_degree, last_pds_update,
        image_path, is_active, created_at, updated_at
      FROM faculty
      WHERE is_active = TRUE
      ORDER BY last_name ASC, first_name ASC
    `;
    
    const result = await pool.query(query);
    
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
        id, last_name, first_name, middle_initial, birthdate, contact_number,
        program, employment_type, highest_degree, image_path,
        is_active, deactivated_at, created_at
      FROM faculty
      WHERE is_active = FALSE
      ORDER BY deactivated_at DESC
    `;
    
    const result = await pool.query(query);
    
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
    
    const certsQuery = `
      SELECT certification_name, issuing_organization, license_number, 
             issue_date, expiry_date, is_active
      FROM faculty_certifications
      WHERE faculty_id = $1 AND is_active = TRUE
      ORDER BY issue_date DESC
    `;
    const certsResult = await pool.query(certsQuery, [id]);
    
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
    
    if (!last_name || !first_name || !program || !employment_type || !highest_degree) {
      return res.status(400).json({
        success: false,
        error: 'All required fields must be filled'
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
    
    const newFaculty = result.rows[0];
    const facultyId = newFaculty.id;
    
    console.log(`✅ Faculty created with ID: ${facultyId}`);
    
    // Insert education data
    const educationData = [];
    
    if (req.body.undergradTitle && req.body.undergradSchool && req.body.undergradYear) {
      educationData.push({
        degree_level: 'Undergraduate',
        degree_title: req.body.undergradTitle,
        school_name: req.body.undergradSchool,
        year_graduated: req.body.undergradYear,
        field_of_study: req.body.undergradField || null
      });
    }
    
    if (req.body.mastersTitle && req.body.mastersSchool && req.body.mastersYear) {
      educationData.push({
        degree_level: 'Masters',
        degree_title: req.body.mastersTitle,
        school_name: req.body.mastersSchool,
        year_graduated: req.body.mastersYear,
        field_of_study: req.body.mastersField || null
      });
    }
    
    if (req.body.doctorateTitle && req.body.doctorateSchool && req.body.doctorateYear) {
      educationData.push({
        degree_level: 'Doctorate',
        degree_title: req.body.doctorateTitle,
        school_name: req.body.doctorateSchool,
        year_graduated: req.body.doctorateYear,
        field_of_study: req.body.doctorateField || null
      });
    }
    
    for (const edu of educationData) {
      await client.query(`
        INSERT INTO faculty_education (faculty_id, degree_level, degree_title, school_name, year_graduated, field_of_study)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [facultyId, edu.degree_level, edu.degree_title, edu.school_name, edu.year_graduated, edu.field_of_study]);
      
      console.log(`✅ Added ${edu.degree_level} education`);
    }
    
    // Insert certifications
    const certifications = [];
    let certIndex = 1;
    
    while (req.body[`cert_name_${certIndex}`] && req.body[`cert_org_${certIndex}`]) {
      certifications.push({
        name: req.body[`cert_name_${certIndex}`],
        org: req.body[`cert_org_${certIndex}`],
        number: req.body[`cert_number_${certIndex}`] || null,
        issue: req.body[`cert_issue_${certIndex}`] || null,
        expiry: req.body[`cert_expiry_${certIndex}`] || null
      });
      certIndex++;
    }
    
    for (const cert of certifications) {
      await client.query(`
        INSERT INTO faculty_certifications (faculty_id, certification_name, issuing_organization, license_number, issue_date, expiry_date, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE)
      `, [facultyId, cert.name, cert.org, cert.number, cert.issue, cert.expiry]);
      
      console.log(`✅ Added certification: ${cert.name}`);
    }
    
    // Insert agencies
    const agencies = [];
    let agencyIndex = 1;
    
    while (req.body[`agency_type_${agencyIndex}`] && req.body[`agency_name_${agencyIndex}`]) {
      agencies.push({
        type: req.body[`agency_type_${agencyIndex}`],
        name: req.body[`agency_name_${agencyIndex}`],
        position: req.body[`agency_position_${agencyIndex}`] || null,
        status: req.body[`agency_status_${agencyIndex}`] || 'Active',
        start: req.body[`agency_start_${agencyIndex}`] || null,
        end: req.body[`agency_end_${agencyIndex}`] || null
      });
      agencyIndex++;
    }
    
    for (const agency of agencies) {
      await client.query(`
        INSERT INTO faculty_government_agencies (faculty_id, agency_type, agency_name, position, employment_status, start_date, end_date, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
      `, [facultyId, agency.type, agency.name, agency.position, agency.status, agency.start, agency.end]);
      
      console.log(`✅ Added agency: ${agency.name}`);
    }
    
    await client.query('COMMIT');
    
    newFaculty.full_name = buildFullName(newFaculty.first_name, newFaculty.middle_initial, newFaculty.last_name);
    
    console.log(`✅ Faculty "${fullName}" created successfully with all related data`);
    
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
// NEW: UPDATE FACULTY (FIX #1 & #3)
// ============================================

router.put('/faculty/:id', upload.single('image'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { 
      last_name, first_name, middle_initial, birthdate, contact_number,
      program, employment_type, highest_degree, last_pds_update 
    } = req.body;
    
    console.log(`📝 Updating faculty ID: ${id}`);
    
    // Check if faculty exists
    const checkQuery = 'SELECT * FROM faculty WHERE id = $1';
    const checkResult = await client.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Faculty member not found'
      });
    }
    
    const oldFaculty = checkResult.rows[0];
    
    await client.query('BEGIN');
    
    // Handle image update
    let image_path = oldFaculty.image_path;
    
    if (req.file) {
      // Delete old image if exists
      if (oldFaculty.image_path && oldFaculty.image_path.startsWith('/uploads/faculty/')) {
        const oldImagePath = path.join('public', oldFaculty.image_path);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
          console.log(`🗑️ Deleted old image: ${oldImagePath}`);
        }
      }
      
      image_path = `/uploads/faculty/${req.file.filename}`;
      console.log(`📸 New image uploaded: ${image_path}`);
    }
    
    const pds_year = last_pds_update ? parseInt(last_pds_update) : null;
    
    // Update faculty record
    const updateQuery = `
      UPDATE faculty
      SET 
        last_name = $1,
        first_name = $2,
        middle_initial = $3,
        birthdate = $4,
        contact_number = $5,
        program = $6,
        employment_type = $7,
        highest_degree = $8,
        last_pds_update = $9,
        image_path = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `;
    
    const result = await client.query(updateQuery, [
      last_name,
      first_name,
      middle_initial || null,
      birthdate,
      contact_number,
      program,
      employment_type,
      highest_degree,
      pds_year,
      image_path,
      id
    ]);
    
    const updatedFaculty = result.rows[0];
    
    await client.query('COMMIT');
    
    updatedFaculty.full_name = buildFullName(updatedFaculty.first_name, updatedFaculty.middle_initial, updatedFaculty.last_name);
    
    console.log(`✅ Faculty updated successfully: ${updatedFaculty.full_name}`);
    
    res.json({
      success: true,
      message: 'Faculty updated successfully',
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
// NEW: DELETE FACULTY PERMANENTLY (FIX #2)
// ============================================

router.delete('/faculty/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Permanently deleting faculty ID: ${id}`);
    
    // Check if faculty exists
    const checkQuery = 'SELECT * FROM faculty WHERE id = $1';
    const checkResult = await client.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Faculty member not found'
      });
    }
    
    const faculty = checkResult.rows[0];
    const fullName = buildFullName(faculty.first_name, faculty.middle_initial, faculty.last_name);
    
    // Check if faculty is deactivated (safety check)
    if (faculty.is_active) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete active faculty. Please deactivate first.'
      });
    }
    
    await client.query('BEGIN');
    
    // Delete image file if exists
    if (faculty.image_path && faculty.image_path.startsWith('/uploads/faculty/')) {
      const imagePath = path.join('public', faculty.image_path);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log(`🗑️ Deleted image: ${imagePath}`);
      }
    }
    
    // Delete related records (cascade should handle this, but being explicit)
    await client.query('DELETE FROM faculty_education WHERE faculty_id = $1', [id]);
    await client.query('DELETE FROM faculty_certifications WHERE faculty_id = $1', [id]);
    await client.query('DELETE FROM faculty_government_agencies WHERE faculty_id = $1', [id]);
    await client.query('DELETE FROM faculty_history WHERE faculty_id = $1', [id]);
    
    // Delete faculty record
    await client.query('DELETE FROM faculty WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    
    console.log(`✅ Faculty permanently deleted: ${fullName}`);
    
    res.json({
      success: true,
      message: `Faculty "${fullName}" has been permanently deleted`
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error deleting faculty:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete faculty member',
      message: error.message
    });
  } finally {
    client.release();
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