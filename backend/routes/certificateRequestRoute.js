import express from "express";

// certificateRequestRoute.js
import multer from "multer";
import path from "path";
import fs from "fs";
import { Pool } from "pg";   // ✅ ADD THIS

const router = express.Router();

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "capstone_db",
  password: "Kisses123",
  port: 5432,
});


// ========================
// PUBLIC ENDPOINTS
// ========================

// Submit new certificate request (PUBLIC - No auth required)
router.post('/submit', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      fullName,
      studentNumber,
      course,
      yearLevel,
      section,
      campus,
      certificateType,
      reason,
      contactEmail,
      contactNumber
    } = req.body;

    // Validate required fields
    if (!fullName || !studentNumber || !course || !yearLevel || !certificateType || !reason) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Insert certificate request
    const insertQuery = `
      INSERT INTO certificate_requests (
        full_name, student_number, course, year_level, section, campus,
        certificate_type, reason, contact_email, contact_number, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
      RETURNING *;
    `;
    
    const result = await client.query(insertQuery, [
      fullName,
      studentNumber,
      course,
      yearLevel,
      section || null,
      campus || 'PUP Parañaque',
      certificateType,
      reason,
      contactEmail || null,
      contactNumber || null
    ]);

    const request = result.rows[0];

    // Log activity
    await client.query(
      `INSERT INTO certificate_activity_logs (request_id, action, performed_by, remarks)
       VALUES ($1, $2, $3, $4)`,
      [request.id, 'submitted', 'Student', `Request submitted: ${certificateType}`]
    );

    await client.query('COMMIT');

    res.json({ 
      success: true, 
      message: 'Certificate request submitted successfully',
      requestNumber: request.request_number,
      request
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error submitting certificate request:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit certificate request' 
    });
  } finally {
    client.release();
  }
});

// Check request status by request number (PUBLIC)
router.get('/status/:requestNumber', async (req, res) => {
  try {
    const { requestNumber } = req.params;

    const query = `
      SELECT 
        id, request_number, full_name, student_number, 
        certificate_type, status, reason,
        created_at, generated_at, printed_at, released_at,
        admin_remarks
      FROM certificate_requests
      WHERE request_number = $1
    `;

    const result = await pool.query(query, [requestNumber]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Request not found' 
      });
    }

    // Get activity logs
    const logsQuery = `
      SELECT action, performed_by, remarks, created_at
      FROM certificate_activity_logs
      WHERE request_id = $1
      ORDER BY created_at DESC
    `;
    const logs = await pool.query(logsQuery, [result.rows[0].id]);

    res.json({ 
      success: true, 
      request: result.rows[0],
      activityLogs: logs.rows
    });

  } catch (err) {
    console.error('Error checking request status:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check request status' 
    });
  }
});

// ========================
// ADMIN ENDPOINTS
// ========================

// Get all certificate requests (ADMIN)
router.get('/admin/requests', async (req, res) => {
  try {
    const { status, certificateType, search, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        id, request_number, full_name, student_number, course,
        year_level, section, certificate_type, status, reason,
        created_at, generated_at, printed_at
      FROM certificate_requests
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    // Filter by status
    if (status && status !== 'all') {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    // Filter by certificate type
    if (certificateType && certificateType !== 'all') {
      query += ` AND certificate_type = $${paramCount}`;
      params.push(certificateType);
      paramCount++;
    }

    // Search by name or student number
    if (search) {
      query += ` AND (full_name ILIKE $${paramCount} OR student_number ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM certificate_requests WHERE 1=1`;
    const countResult = await pool.query(countQuery);

    res.json({ 
      success: true, 
      requests: result.rows,
      total: parseInt(countResult.rows[0].count)
    });

  } catch (err) {
    console.error('Error fetching certificate requests:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch certificate requests' 
    });
  }
});

// Get single request details (ADMIN)
router.get('/admin/request/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `SELECT * FROM certificate_requests WHERE id = $1`;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Request not found' 
      });
    }

    // Get activity logs
    const logsQuery = `
      SELECT * FROM certificate_activity_logs
      WHERE request_id = $1
      ORDER BY created_at DESC
    `;
    const logs = await pool.query(logsQuery, [id]);

    res.json({ 
      success: true, 
      request: result.rows[0],
      activityLogs: logs.rows
    });

  } catch (err) {
    console.error('Error fetching request details:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch request details' 
    });
  }
});

// Generate certificate (ADMIN)
router.post('/admin/generate/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { adminId, adminName } = req.body;

    // Update request status
    const updateQuery = `
      UPDATE certificate_requests
      SET 
        status = 'generated',
        certificate_issued_date = CURRENT_DATE,
        generated_at = CURRENT_TIMESTAMP,
        processed_by_admin = $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await client.query(updateQuery, [adminId, id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        message: 'Request not found' 
      });
    }

    // Log activity
    await client.query(
      `INSERT INTO certificate_activity_logs (request_id, action, performed_by, admin_id, remarks)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, 'generated', adminName, adminId, 'Certificate generated and ready for printing']
    );

    await client.query('COMMIT');

    res.json({ 
      success: true, 
      message: 'Certificate generated successfully',
      request: result.rows[0]
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error generating certificate:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate certificate' 
    });
  } finally {
    client.release();
  }
});

// Mark as printed (ADMIN)
router.post('/admin/print/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { adminId, adminName } = req.body;

    const updateQuery = `
      UPDATE certificate_requests
      SET 
        status = 'printed',
        printed_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await client.query(updateQuery, [id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        message: 'Request not found' 
      });
    }

    // Log activity
    await client.query(
      `INSERT INTO certificate_activity_logs (request_id, action, performed_by, admin_id, remarks)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, 'printed', adminName, adminId, 'Certificate printed']
    );

    await client.query('COMMIT');

    res.json({ 
      success: true, 
      message: 'Certificate marked as printed',
      request: result.rows[0]
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error marking certificate as printed:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark certificate as printed' 
    });
  } finally {
    client.release();
  }
});

// Mark as released (ADMIN)
router.post('/admin/release/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { adminId, adminName, remarks } = req.body;

    const updateQuery = `
      UPDATE certificate_requests
      SET 
        status = 'released',
        released_at = CURRENT_TIMESTAMP,
        admin_remarks = $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await client.query(updateQuery, [remarks || null, id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        message: 'Request not found' 
      });
    }

    // Log activity
    await client.query(
      `INSERT INTO certificate_activity_logs (request_id, action, performed_by, admin_id, remarks)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, 'released', adminName, adminId, remarks || 'Certificate released to student']
    );

    await client.query('COMMIT');

    res.json({ 
      success: true, 
      message: 'Certificate marked as released',
      request: result.rows[0]
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error marking certificate as released:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark certificate as released' 
    });
  } finally {
    client.release();
  }
});

// Delete request (ADMIN)
router.delete('/admin/delete/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Delete activity logs first (cascade will handle this, but explicit is clearer)
    await client.query('DELETE FROM certificate_activity_logs WHERE request_id = $1', [id]);
    
    // Delete request
    const result = await client.query('DELETE FROM certificate_requests WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        message: 'Request not found' 
      });
    }

    await client.query('COMMIT');

    res.json({ 
      success: true, 
      message: 'Certificate request deleted successfully'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting certificate request:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete certificate request' 
    });
  } finally {
    client.release();
  }
});

// Get statistics (ADMIN)
router.get('/admin/stats', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'generated') as generated_count,
        COUNT(*) FILTER (WHERE status = 'printed') as printed_count,
        COUNT(*) FILTER (WHERE status = 'released') as released_count,
        COUNT(*) FILTER (WHERE certificate_type = 'no_id') as no_id_count,
        COUNT(*) FILTER (WHERE certificate_type = 'id_fillout') as id_fillout_count,
        COUNT(*) as total_count
      FROM certificate_requests
    `);

    res.json({ 
      success: true, 
      stats: stats.rows[0]
    });

  } catch (err) {
    console.error('Error fetching statistics:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch statistics' 
    });
  }
});

// Configure multer for signature uploads
const signatureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './public/uploads/signatures';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `admin_signature_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const uploadSignature = multer({
  storage: signatureStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WEBP) are allowed'));
    }
  }
});

// ==============================
// E-SIGNATURE ENDPOINTS
// ==============================

// Upload or update admin e-signature
router.post('/admin/signature/upload', uploadSignature.single('signature'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { adminId, signatureName, signatureTitle } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No signature image uploaded'
      });
    }

    const signaturePath = `/uploads/signatures/${req.file.filename}`;

    // Check if admin already has a signature
    const existingSignature = await client.query(
      'SELECT id, signature_image_path FROM admin_signatures WHERE admin_id = $1',
      [adminId]
    );

    if (existingSignature.rows.length > 0) {
      // Delete old signature file
      const oldPath = path.join('./public', existingSignature.rows[0].signature_image_path);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }

      // Update existing signature
      const updateQuery = `
        UPDATE admin_signatures
        SET signature_image_path = $1,
            signature_name = $2,
            signature_title = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE admin_id = $4
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, [
        signaturePath,
        signatureName || 'MILA JOY J. MARTINEZ',
        signatureTitle || 'Head, Student Affairs and Services',
        adminId
      ]);

      await client.query('COMMIT');

      return res.json({
        success: true,
        message: 'Signature updated successfully',
        signature: result.rows[0]
      });
    } else {
      // Insert new signature
      const insertQuery = `
        INSERT INTO admin_signatures (admin_id, signature_image_path, signature_name, signature_title)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      
      const result = await client.query(insertQuery, [
        adminId,
        signaturePath,
        signatureName || 'MILA JOY J. MARTINEZ',
        signatureTitle || 'Head, Student Affairs and Services'
      ]);

      await client.query('COMMIT');

      return res.json({
        success: true,
        message: 'Signature uploaded successfully',
        signature: result.rows[0]
      });
    }

  } catch (err) {
    await client.query('ROLLBACK');
    
    // Delete uploaded file if database operation failed
    if (req.file) {
      const filePath = path.join('./public/uploads/signatures', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    console.error('Error uploading signature:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to upload signature'
    });
  } finally {
    client.release();
  }
});

// Get admin e-signature
router.get('/admin/signature/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;

    const query = `
      SELECT * FROM admin_signatures
      WHERE admin_id = $1
    `;

    const result = await pool.query(query, [adminId]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        signature: null // No signature uploaded yet
      });
    }

    res.json({
      success: true,
      signature: result.rows[0]
    });

  } catch (err) {
    console.error('Error fetching signature:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch signature'
    });
  }
});

// Delete admin e-signature
router.delete('/admin/signature/:adminId', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { adminId } = req.params;

    // Get signature info
    const signature = await client.query(
      'SELECT signature_image_path FROM admin_signatures WHERE admin_id = $1',
      [adminId]
    );

    if (signature.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Signature not found'
      });
    }

    // Delete file
    const filePath = path.join('./public', signature.rows[0].signature_image_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await client.query('DELETE FROM admin_signatures WHERE admin_id = $1', [adminId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Signature deleted successfully'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting signature:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete signature'
    });
  } finally {
    client.release();
  }
});

export default router;