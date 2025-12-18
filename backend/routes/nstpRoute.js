// nstpRoute.js - Fixed file ID handling in update
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

const uploadDir = './public/uploads/forms_repository';
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
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only documents, images, and spreadsheets are allowed.'));
    }
  }
});

async function getNSTPFolderId(adminid) {
  const checkFolder = await pool.query(
    'SELECT id FROM forms_repository_folders WHERE name = $1 AND adminid = $2 AND parent_id IS NULL',
    ['NSTP', adminid]
  );

  if (checkFolder.rows.length > 0) {
    return checkFolder.rows[0].id;
  }

  const createFolder = await pool.query(
    'INSERT INTO forms_repository_folders (name, adminid, parent_id) VALUES ($1, $2, NULL) RETURNING id',
    ['NSTP', adminid]
  );

  return createFolder.rows[0].id;
}

async function saveFileToRepository(folderId, file, adminid) {
  const filePath = `/uploads/forms_repository/${file.filename}`;
  
  const result = await pool.query(
    `INSERT INTO forms_repository_files 
     (folder_id, file_name, file_path, file_type, file_size, adminid)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [folderId, file.originalname, filePath, file.mimetype, file.size, adminid]
  );

  return result.rows[0];
}

router.post('/create', upload.array('files', 3), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { title, content, adminid } = req.body;

    const postQuery = `
      INSERT INTO nstp_posts (title, content, adminid)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const postResult = await client.query(postQuery, [title, content, adminid]);
    const post = postResult.rows[0];

    if (req.files && req.files.length > 0) {
      const nstpFolderId = await getNSTPFolderId(adminid);

      for (const file of req.files) {
        const savedFile = await saveFileToRepository(nstpFolderId, file, adminid);
        await client.query(
          'INSERT INTO nstp_post_files (post_id, file_id) VALUES ($1, $2)',
          [post.id, savedFile.id]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, post });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating NSTP post:', err);
    res.status(500).json({ success: false, message: 'Failed to create post' });
  } finally {
    client.release();
  }
});

router.get('/posts', async (req, res) => {
  try {
    const postsQuery = `
      SELECT 
        p.*,
        json_agg(
          json_build_object(
            'id', f.id,
            'file_name', f.file_name,
            'file_path', f.file_path,
            'file_type', f.file_type,
            'file_size', f.file_size
          )
        ) FILTER (WHERE f.id IS NOT NULL) as files
      FROM nstp_posts p
      LEFT JOIN nstp_post_files pf ON p.id = pf.post_id
      LEFT JOIN forms_repository_files f ON pf.file_id = f.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
    
    const result = await pool.query(postsQuery);
    res.json({ success: true, posts: result.rows });
  } catch (err) {
    console.error('Error fetching NSTP posts:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch posts' });
  }
});

router.delete('/delete/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    const filesQuery = `
      SELECT f.id, f.file_path
      FROM forms_repository_files f
      JOIN nstp_post_files pf ON f.id = pf.file_id
      WHERE pf.post_id = $1
    `;
    const filesResult = await client.query(filesQuery, [id]);

    for (const file of filesResult.rows) {
      const fullPath = path.join('./public', file.file_path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    for (const file of filesResult.rows) {
      await client.query('DELETE FROM forms_repository_files WHERE id = $1', [file.id]);
    }

    await client.query('DELETE FROM nstp_post_files WHERE post_id = $1', [id]);
    await client.query('DELETE FROM nstp_posts WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting NSTP post:', err);
    res.status(500).json({ success: false, message: 'Failed to delete post' });
  } finally {
    client.release();
  }
});

router.put('/update/:id', upload.array('files', 3), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { title, content, adminid, keepFiles } = req.body;

    // FIXED: Convert keepFiles to numbers for proper comparison
    let filesToKeep = [];
    if (keepFiles) {
      try {
        const parsed = JSON.parse(keepFiles);
        // Ensure all IDs are numbers
        filesToKeep = parsed.map(id => parseInt(id, 10));
      } catch (e) {
        console.error('Error parsing keepFiles:', e);
      }
    }

    console.log('Files to keep:', filesToKeep); // Debug log

    const updateQuery = `
      UPDATE nstp_posts
      SET title = $1, content = $2
      WHERE id = $3
      RETURNING *;
    `;
    const result = await client.query(updateQuery, [title, content, id]);

    // Get all existing files for this post
    const existingFiles = await client.query(
      `SELECT f.id, f.file_path
       FROM forms_repository_files f
       JOIN nstp_post_files pf ON f.id = pf.file_id
       WHERE pf.post_id = $1`,
      [id]
    );

    console.log('Existing files:', existingFiles.rows.map(f => f.id)); // Debug log

    // Delete files that are NOT in the keepFiles array
    for (const file of existingFiles.rows) {
      if (!filesToKeep.includes(file.id)) {
        console.log('Deleting file:', file.id); // Debug log
        const fullPath = path.join('./public', file.file_path);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
        await client.query('DELETE FROM forms_repository_files WHERE id = $1', [file.id]);
      } else {
        console.log('Keeping file:', file.id); // Debug log
      }
    }

    // Add new files if any
    if (req.files && req.files.length > 0) {
      const nstpFolderId = await getNSTPFolderId(adminid);

      for (const file of req.files) {
        const savedFile = await saveFileToRepository(nstpFolderId, file, adminid);
        await client.query(
          'INSERT INTO nstp_post_files (post_id, file_id) VALUES ($1, $2)',
          [id, savedFile.id]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, post: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating NSTP post:', err);
    res.status(500).json({ success: false, message: 'Failed to update post' });
  } finally {
    client.release();
  }
});

export default router;