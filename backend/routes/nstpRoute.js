import express from 'express';
import multer from 'multer';
import pkg from 'pg';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const { Pool } = pkg;

// PostgreSQL connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'capstone_db',
  password: 'Kisses123',
  port: 5432
});

// Ensure upload directory exists
const uploadDir = './public/uploads/nstp';
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

// CREATE NSTP
router.post('/create', upload.single('image'), async (req, res) => {
  try {
    const { title, content, adminid } = req.body;
    const imagePath = req.file ? `/uploads/nstp/${req.file.filename}` : null;

    const query = `
      INSERT INTO nstp_posts (title, content, image_path, adminid)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [title, content, imagePath, adminid];
    const result = await pool.query(query, values);

    res.json({ success: true, post: result.rows[0] });
  } catch (err) {
    console.error('Error inserting nstp:', err);
    res.status(500).json({ success: false, message: 'Database insert failed' });
  }
});

// FETCH ALL NSTP
router.get('/posts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM nstp_posts ORDER BY created_at DESC');
    res.json({ success: true, posts: result.rows });
  } catch (err) {
    console.error('Error fetching nstp:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch posts' });
  }
});

// DELETE nstp
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get image path first (to delete from folder)
    const result = await pool.query('SELECT image_path FROM nstp_posts WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'nstp not found' });
    }

    const imagePath = result.rows[0].image_path;
    if (imagePath) {
      const fullPath = path.join('./public', imagePath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    await pool.query('DELETE FROM nstp_posts WHERE id = $1', [id]);
    res.json({ success: true, message: 'nstp deleted successfully' });
  } catch (err) {
    console.error('Error deleting nstp:', err);
    res.status(500).json({ success: false, message: 'Failed to delete post' });
  }
});

// UPDATE nstp
router.put('/update/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    const oldPost = await pool.query('SELECT image_path FROM nstp_posts WHERE id = $1', [id]);
    if (oldPost.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'nstp not found' });
    }

    let imagePath = oldPost.rows[0].image_path;

    if (req.file) {
      if (imagePath) {
        const oldImageFullPath = path.join('./public', imagePath);
        if (fs.existsSync(oldImageFullPath)) fs.unlinkSync(oldImageFullPath);
      }
      imagePath = `/uploads/nstp/${req.file.filename}`;
    }

    const query = `
      UPDATE nstp_posts
      SET title = $1, content = $2, image_path = $3
      WHERE id = $4
      RETURNING *;
    `;
    const values = [title, content, imagePath, id];
    const result = await pool.query(query, values);

    res.json({ success: true, post: result.rows[0] });
  } catch (err) {
    console.error('Error updating nstp:', err);
    res.status(500).json({ success: false, message: 'Failed to update post' });
  }
});

export default router;
