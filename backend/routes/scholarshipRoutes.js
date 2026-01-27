// scholarshipRoutes.js - FIXED VERSION with eligible_courses
import express from 'express';
import multer from 'multer';
import pkg from 'pg';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'capstone_db',
  password: 'Kisses123',
  port: 5432
});

const uploadDir = './public/uploads/scholarships';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word documents, and images are allowed.'));
    }
  }
});

// CREATE scholarship - FIXED
router.post('/create', upload.array('files', 3), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { title, provider, amount, slots, open_date, deadline, status, 
            description, eligibility, benefits, contact_info, 
            required_documents, application_process, external_links, 
            eligible_courses, adminid } = req.body;  // ← ADDED eligible_courses

    // ← UPDATED QUERY - Added eligible_courses column
    const scholarshipQuery = `
      INSERT INTO scholarships 
      (title, provider, amount, slots, open_date, deadline, status, 
       description, eligibility, benefits, contact_info, 
       required_documents, application_process, external_links, 
       eligible_courses, adminid)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *;
    `;
    
    // ← UPDATED VALUES - Added eligible_courses value
    const values = [
      title, provider, amount, slots || null, open_date, deadline, status,
      description, eligibility, benefits, contact_info || null,
      required_documents || null, application_process || null, 
      external_links || null, eligible_courses || 'All Programs', adminid
    ];
    
    const scholarshipResult = await client.query(scholarshipQuery, values);
    const scholarship = scholarshipResult.rows[0];

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const filePath = `/uploads/scholarships/${file.filename}`;
        
        const fileQuery = `
          INSERT INTO scholarship_files 
          (scholarship_id, file_name, file_path, file_type, file_size)
          VALUES ($1, $2, $3, $4, $5)
        `;
        
        await client.query(fileQuery, [
          scholarship.id,
          file.originalname,
          filePath,
          file.mimetype,
          file.size
        ]);
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, scholarship });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating scholarship:', err);
    res.status(500).json({ success: false, message: 'Failed to create scholarship' });
  } finally {
    client.release();
  }
});

// GET all scholarships (for admin)
router.get('/all', async (req, res) => {
  try {
    const query = `
      SELECT 
        s.*,
        json_agg(
          json_build_object(
            'id', sf.id,
            'file_name', sf.file_name,
            'file_path', sf.file_path,
            'file_type', sf.file_type,
            'file_size', sf.file_size
          )
        ) FILTER (WHERE sf.id IS NOT NULL) as files
      FROM scholarships s
      LEFT JOIN scholarship_files sf ON s.id = sf.scholarship_id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `;
    
    const result = await pool.query(query);
    res.json({ success: true, scholarships: result.rows });
  } catch (err) {
    console.error('Error fetching scholarships:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch scholarships' });
  }
});

// GET public scholarships (for students/public view)
router.get('/public', async (req, res) => {
  try {
    const query = `
      SELECT 
        s.*,
        json_agg(
          json_build_object(
            'id', sf.id,
            'file_name', sf.file_name,
            'file_path', sf.file_path,
            'file_type', sf.file_type,
            'file_size', sf.file_size
          )
        ) FILTER (WHERE sf.id IS NOT NULL) as files
      FROM scholarships s
      LEFT JOIN scholarship_files sf ON s.id = sf.scholarship_id
      GROUP BY s.id
      ORDER BY 
        CASE 
          WHEN s.status = 'open' THEN 1
          WHEN s.status = 'upcoming' THEN 2
          WHEN s.status = 'closed' THEN 3
        END,
        s.deadline ASC
    `;
    
    const result = await pool.query(query);
    res.json({ success: true, scholarships: result.rows });
  } catch (err) {
    console.error('Error fetching public scholarships:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch scholarships' });
  }
});

// UPDATE scholarship status only (for auto-updates)
router.patch('/update-status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const query = 'UPDATE scholarships SET status = $1 WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [status, id]);
    
    if (result.rows.length > 0) {
      res.json({ success: true, scholarship: result.rows[0] });
    } else {
      res.status(404).json({ success: false, message: 'Scholarship not found' });
    }
  } catch (err) {
    console.error('Error updating scholarship status:', err);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

// UPDATE scholarship - FIXED
router.put('/update/:id', upload.array('files', 3), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { title, provider, amount, slots, open_date, deadline, status,
            description, eligibility, benefits, contact_info,
            required_documents, application_process, external_links, 
            eligible_courses, keepFiles } = req.body;

    // Parse keepFiles
    let filesToKeep = [];
    if (keepFiles) {
      try {
        const parsed = JSON.parse(keepFiles);
        filesToKeep = parsed.map(id => parseInt(id, 10));
      } catch (e) {
        console.error('Error parsing keepFiles:', e);
      }
    }

    // ← UPDATED QUERY - Added eligible_courses column
    const updateQuery = `
      UPDATE scholarships
      SET title = $1, provider = $2, amount = $3, slots = $4,
          open_date = $5, deadline = $6, status = $7,
          description = $8, eligibility = $9, benefits = $10,
          contact_info = $11, required_documents = $12,
          application_process = $13, external_links = $14,
          eligible_courses = $15
      WHERE id = $16
      RETURNING *;
    `;
    
    // ← UPDATED VALUES - Added eligible_courses value
    const values = [
      title, provider, amount, slots || null, open_date, deadline, status,
      description, eligibility, benefits, contact_info || null,
      required_documents || null, application_process || null,
      external_links || null, eligible_courses || 'All Programs', id
    ];
    
    const result = await client.query(updateQuery, values);

    // Handle file deletion
    const existingFiles = await client.query(
      'SELECT id, file_path FROM scholarship_files WHERE scholarship_id = $1',
      [id]
    );

    for (const file of existingFiles.rows) {
      if (!filesToKeep.includes(file.id)) {
        const fullPath = path.join('./public', file.file_path);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
        await client.query('DELETE FROM scholarship_files WHERE id = $1', [file.id]);
      }
    }

    // Add new files
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const filePath = `/uploads/scholarships/${file.filename}`;
        
        await client.query(
          `INSERT INTO scholarship_files 
           (scholarship_id, file_name, file_path, file_type, file_size)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, file.originalname, filePath, file.mimetype, file.size]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, scholarship: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating scholarship:', err);
    res.status(500).json({ success: false, message: 'Failed to update scholarship' });
  } finally {
    client.release();
  }
});

// DELETE scholarship
router.delete('/delete/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Get all files
    const filesResult = await client.query(
      'SELECT id, file_path FROM scholarship_files WHERE scholarship_id = $1',
      [id]
    );

    // Delete physical files
    for (const file of filesResult.rows) {
      const fullPath = path.join('./public', file.file_path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    // Delete from database
    await client.query('DELETE FROM scholarship_files WHERE scholarship_id = $1', [id]);
    await client.query('DELETE FROM scholarships WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Scholarship deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting scholarship:', err);
    res.status(500).json({ success: false, message: 'Failed to delete scholarship' });
  } finally {
    client.release();
  }
});

export default router;