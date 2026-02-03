//server.js - Updated Version with Unified Trash
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from "./db.js";
import fs from "fs";
import XLSX from "xlsx";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// mga routes 
import loginRoute from './routes/loginRoute.js';
import ojtRoute from './routes/ojtRoute.js';
import researchextensionRoute from './routes/research&extensionRoute.js';
import nstpRoute from './routes/nstpRoute.js';
import recentUploadsRoute from "./routes/recentUploadsRoute.js";
import formsrepositoryRoute from './routes/formsrepositoryRoute.js';
import fileRepositoryRoute from "./routes/fileRepositoryRoute.js";
import dataUploadsRoute from "./routes/dataUploadsRoute.js";
import eventsRoute from "./routes/eventsRoute.js";
import dashboardStatsRoute from "./routes/dashboardStatsRoute.js";
import activityLogsRoute from "./routes/activityLogsRoute.js";
import roleManagementRoute from './routes/roleManagementRoute.js';
import userManagementRoute from './routes/userManagementRoute.js'
import chatbotRoute from './routes/chatbotRoute.js'
import feedbackRoute from "./routes/feedbackRoute.js";
import trashRoute from './routes/trashRoute.js'; // NEW: Unified trash route
import accreditationRoute from './routes/accreditationRoute.js';
import scholarshipRoutes from './routes/scholarshipRoutes.js';
import careerRoutes from './routes/careerRoutes.js';
import certificateRequestRoute from './routes/certificateRequestRoute.js';
import newsRoute from './routes/newsRoute.js';
import alumniEmploymentRoute from './routes/alumniEmploymentRoute.js';
import searchRoute from './routes/searchRoute.js';
import adminActivityLogsRoute from './routes/adminActivityLogsRoute.js';
import facultyManagementRoute from './routes/facultyManagementRoute.js';

// initialize 
dotenv.config();
const app = express();

// middleware 
app.use(cors());
app.use(express.json());

// serve static folders (correct relative paths)
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/private', express.static(path.join(__dirname, '../private')));
app.use('/public', express.static(path.join(__dirname, '../public')));

// routes
app.use('/api/login', loginRoute);
app.use('/api/chatbot', chatbotRoute);
app.use('/api/ojt', ojtRoute);
app.use('/api/researchextension', researchextensionRoute);
app.use('/api/nstp', nstpRoute);
app.use("/api/recent-uploads", recentUploadsRoute);
app.use("/api/files", fileRepositoryRoute);
app.use('/api/forms', formsrepositoryRoute);
app.use("/uploads", express.static("uploads"));
app.use("/api", dataUploadsRoute);
app.use("/api", eventsRoute);
app.use("/api", dashboardStatsRoute);
app.use("/api", activityLogsRoute);
app.use('/private', express.static(path.join(__dirname, '../private')));
app.use("/api", roleManagementRoute);
app.use("/api", userManagementRoute);
app.use("/api", feedbackRoute);
app.use("/api", trashRoute); // NEW: Unified trash management
app.use('/api', accreditationRoute);
app.use('/api/scholarships', scholarshipRoutes);
app.use('/api/career', careerRoutes);
app.use('/api/certificate-requests', certificateRequestRoute);
app.use('/api/news', newsRoute);
app.use('/api', alumniEmploymentRoute);
app.use('/api', searchRoute);
app.use('/api', adminActivityLogsRoute);
app.use('/api', facultyManagementRoute);

// SINGLE /api/files/data endpoint with trash support
app.get("/api/files/data", async (req, res) => {
  try {
    const { includeTrash } = req.query;
    
    let query = `
      SELECT 
        id, 
        file_name AS filename, 
        file_type AS type, 
        file_size, 
        adminid,
        created_at AS uploaded_at,
        file_path,
        chart_type,
        is_trashed,
        trashed_at
      FROM file_repository_files
    `;
    
    // Exclude trashed files by default unless explicitly requested
    if (includeTrash !== 'true') {
      query += ' WHERE is_trashed = FALSE OR is_trashed IS NULL';
    }
    
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query);
    const files = result.rows;

    const enrichedFiles = files.map(file => {
      const dbPath = file.file_path || "";
      const filename = dbPath.split("/").pop();
      const absolutePath = path.resolve(__dirname, "public/uploads/fileRepository", filename);

      if (fs.existsSync(absolutePath)) {
        try {
          const workbook = XLSX.readFile(absolutePath);
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          const labels = jsonData[0] || [];
          const values = jsonData.slice(1)
            .map(row => row.map(v => (typeof v === 'string' ? v.trim() : v)))
            .flat()
            .map(Number)
            .filter(n => !isNaN(n));

          return {
            ...file,
            labels,
            data: values
          };
        } catch (e) {
          console.error(`Failed to parse ${file.filename}:`, e.message);
          return { ...file, labels: [], data: [] };
        }
      } else {
        console.warn(`File not found: ${absolutePath}`);
        return { ...file, labels: [], data: [] };
      }
    });

    res.json(enrichedFiles);
  } catch (err) {
    console.error("Error fetching file data:", err);
    res.status(500).json({ error: "Failed to retrieve files" });
  }
});

// Save AI interpretation to database
app.post("/api/files/save-interpretation", async (req, res) => {
  try {
    const { file_id, interpretation, column_analyzed } = req.body;

    if (!file_id || !interpretation) {
      return res.status(400).json({ error: "file_id and interpretation are required" });
    }

    const result = await pool.query(
      `UPDATE file_repository_files 
       SET ai_interpretation = $1, 
           interpretation_generated_at = NOW(),
           analyzed_column = $2
       WHERE id = $3
       RETURNING id, ai_interpretation, interpretation_generated_at`,
      [interpretation, column_analyzed, file_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    res.json({
      success: true,
      message: "Interpretation saved successfully",
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Error saving interpretation:", err);
    res.status(500).json({ error: "Failed to save interpretation" });
  }
});

// Get saved interpretation for a file
app.get("/api/files/interpretation/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;

    const result = await pool.query(
      `SELECT ai_interpretation, interpretation_generated_at, analyzed_column 
       FROM file_repository_files 
       WHERE id = $1`,
      [fileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    res.json({
      interpretation: result.rows[0].ai_interpretation,
      generated_at: result.rows[0].interpretation_generated_at,
      analyzed_column: result.rows[0].analyzed_column
    });
  } catch (err) {
    console.error("Error fetching interpretation:", err);
    res.status(500).json({ error: "Failed to fetch interpretation" });
  }
});

// pagstart ng server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));