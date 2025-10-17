import express from 'express';
import multer from 'multer';
import pkg from 'pg';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const { Pool } = pkg;

// PostgreSQL connection
const pool = new Pool({
  user: 'postgres',          // change to your DB user
  host: 'localhost',
  database: 'capstone_db',   // change to your database name
  password: 'Kisses123',     // your PostgreSQL password
  port: 5432
});

// Ensure upload directory exists
const uploadDir = './public/uploads/ojt';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// CREATE POST (Insert to DB)
router.post('/create', upload.single('image'), async (req, res) => {
  try {
    const { title, content, adminid } = req.body;
    const imagePath = req.file ? `/uploads/ojt/${req.file.filename}` : null;

    const query = `
      INSERT INTO ojt_posts (title, content, image_path, adminid)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [title, content, imagePath, adminid];
    const result = await pool.query(query, values);

    res.json({ success: true, post: result.rows[0] });
  } catch (err) {
    console.error('Error inserting post:', err);
    res.status(500).json({ success: false, message: 'Database insert failed' });
  }
});

// FETCH ALL POSTS
router.get('/posts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ojt_posts ORDER BY created_at DESC');
    res.json({ success: true, posts: result.rows });
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch posts' });
  }
});

export default router;
