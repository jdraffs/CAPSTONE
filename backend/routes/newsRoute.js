// routes/newsRoute.js - News Management Route (Updated)
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pool from '../db.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'public/uploads/news';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// ============================================
// CREATE NEWS POST
// ============================================
router.post('/create', upload.single('thumbnail'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { title, content, adminid } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Thumbnail image is required'
      });
    }

    await client.query('BEGIN');

    // Insert thumbnail into news_uploads
    const thumbnailPath = `/uploads/news/${req.file.filename}`;
    const thumbnailQuery = `
      INSERT INTO news_uploads (file_path, file_type, uploaded_by, created_at)
      VALUES ($1, 'image', $2, NOW())
      RETURNING id
    `;
    const thumbnailResult = await client.query(thumbnailQuery, [thumbnailPath, adminid || 'adminCMO']);
    const thumbnailId = thumbnailResult.rows[0].id;

    // Insert news post
    const newsQuery = `
      INSERT INTO news (title, content, thumbnail_id, adminid, created_at, is_deleted)
      VALUES ($1, $2, $3, $4, NOW(), false)
      RETURNING *
    `;
    const newsResult = await client.query(newsQuery, [title, content, thumbnailId, adminid || 'adminCMO']);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'News post created successfully',
      post: newsResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating news post:', error);
    
    // Delete uploaded file if database insert fails
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create news post',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// ============================================
// GET ALL NEWS POSTS (NOT DELETED)
// ============================================
router.get('/posts', async (req, res) => {
  try {
    const query = `
      SELECT 
        n.*,
        u.file_path as thumbnail_path,
        u.id as thumbnail_id
      FROM news n
      LEFT JOIN news_uploads u ON n.thumbnail_id = u.id
      WHERE n.is_deleted = false
      ORDER BY n.created_at DESC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      posts: result.rows
    });

  } catch (error) {
    console.error('Error fetching news posts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch news posts',
      error: error.message
    });
  }
});

// ============================================
// GET TRASH (DELETED POSTS)
// ============================================
router.get('/trash', async (req, res) => {
  try {
    const query = `
      SELECT 
        n.*,
        u.file_path as thumbnail_path,
        u.id as thumbnail_id
      FROM news n
      LEFT JOIN news_uploads u ON n.thumbnail_id = u.id
      WHERE n.is_deleted = true
      ORDER BY n.deleted_at DESC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      posts: result.rows
    });

  } catch (error) {
    console.error('Error fetching trash:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trash',
      error: error.message
    });
  }
});

// ============================================
// UPDATE NEWS POST
// ============================================
router.put('/update/:id', upload.single('thumbnail'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { title, content, keepThumbnail } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    await client.query('BEGIN');

    let thumbnailId = keepThumbnail;

    // If new thumbnail uploaded
    if (req.file) {
      // Get old thumbnail to delete
      const oldThumbQuery = 'SELECT thumbnail_id FROM news WHERE id = $1';
      const oldThumbResult = await client.query(oldThumbQuery, [id]);
      const oldThumbnailId = oldThumbResult.rows[0]?.thumbnail_id;

      if (oldThumbnailId) {
        const oldPathQuery = 'SELECT file_path FROM news_uploads WHERE id = $1';
        const oldPathResult = await client.query(oldPathQuery, [oldThumbnailId]);
        const oldPath = oldPathResult.rows[0]?.file_path;
        
        if (oldPath) {
          const fullPath = path.join('public', oldPath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        }

        await client.query('DELETE FROM news_uploads WHERE id = $1', [oldThumbnailId]);
      }

      // Insert new thumbnail
      const thumbnailPath = `/uploads/news/${req.file.filename}`;
      const thumbnailQuery = `
        INSERT INTO news_uploads (file_path, file_type, uploaded_by, created_at)
        VALUES ($1, 'image', 'adminCMO', NOW())
        RETURNING id
      `;
      const thumbnailResult = await client.query(thumbnailQuery, [thumbnailPath]);
      thumbnailId = thumbnailResult.rows[0].id;
    }

    // Update news post
    const updateQuery = `
      UPDATE news
      SET title = $1, content = $2, thumbnail_id = $3
      WHERE id = $4
      RETURNING *
    `;
    const result = await client.query(updateQuery, [title, content, thumbnailId, id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'News post not found'
      });
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'News post updated successfully',
      post: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating news post:', error);
    
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update news post',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// ============================================
// MOVE TO TRASH
// ============================================
router.put('/trash/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      UPDATE news
      SET is_deleted = true, deleted_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'News post not found'
      });
    }

    res.json({
      success: true,
      message: 'News post moved to trash'
    });

  } catch (error) {
    console.error('Error moving to trash:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to move to trash',
      error: error.message
    });
  }
});

// ============================================
// RESTORE FROM TRASH
// ============================================
router.put('/restore/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      UPDATE news
      SET is_deleted = false, deleted_at = NULL
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'News post not found'
      });
    }

    res.json({
      success: true,
      message: 'News post restored successfully'
    });

  } catch (error) {
    console.error('Error restoring news post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore news post',
      error: error.message
    });
  }
});

// ============================================
// DELETE PERMANENTLY
// ============================================
router.delete('/delete/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Get thumbnail info
    const thumbQuery = 'SELECT thumbnail_id FROM news WHERE id = $1';
    const thumbResult = await client.query(thumbQuery, [id]);
    const thumbnailId = thumbResult.rows[0]?.thumbnail_id;

    if (thumbnailId) {
      const pathQuery = 'SELECT file_path FROM news_uploads WHERE id = $1';
      const pathResult = await client.query(pathQuery, [thumbnailId]);
      const filePath = pathResult.rows[0]?.file_path;
      
      if (filePath) {
        const fullPath = path.join('public', filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }

      await client.query('DELETE FROM news_uploads WHERE id = $1', [thumbnailId]);
    }

    // Delete news post
    const deleteQuery = 'DELETE FROM news WHERE id = $1';
    await client.query(deleteQuery, [id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'News post deleted permanently'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting news post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete news post',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// ============================================
// EMPTY TRASH
// ============================================
router.delete('/empty-trash', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get all deleted posts with thumbnails
    const query = `
      SELECT n.id, n.thumbnail_id, u.file_path
      FROM news n
      LEFT JOIN news_uploads u ON n.thumbnail_id = u.id
      WHERE n.is_deleted = true
    `;
    const result = await client.query(query);

    // Delete all files
    for (const row of result.rows) {
      if (row.file_path) {
        const fullPath = path.join('public', row.file_path);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
      
      if (row.thumbnail_id) {
        await client.query('DELETE FROM news_uploads WHERE id = $1', [row.thumbnail_id]);
      }
    }

    // Delete all news posts
    await client.query('DELETE FROM news WHERE is_deleted = true');

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Trash emptied successfully. ${result.rows.length} post(s) deleted.`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error emptying trash:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to empty trash',
      error: error.message
    });
  } finally {
    client.release();
  }
});

export default router;