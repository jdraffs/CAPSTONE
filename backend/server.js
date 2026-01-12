//server.js - Updated with Activity Logs Route
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
import activityLogsRoute from "./routes/activityLogsRoute.js"; // NEW ROUTE
import roleManagementRoute from './routes/roleManagementRoute.js';
import userManagementRoute from './routes/userManagementRoute.js'
import chatbotRoute from './routes/chatbotRoute.js'

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
app.use("/uploads", express.static("uploads")); // serve uploaded files
app.use("/api", dataUploadsRoute);
app.use("/api", eventsRoute);
app.use("/api", dashboardStatsRoute);
app.use("/api", activityLogsRoute); // ADD THIS LINE
app.use('/private', express.static(path.join(__dirname, '../private')));
app.use("/api", roleManagementRoute);
app.use("/api", userManagementRoute);

// UPDATED /api/files/data endpoint to include proper adminid
app.get("/api/files/data", async (req, res) => {
  try {
    // fetch file metadata from DB with adminid
    const result = await pool.query(`
      SELECT 
        id, 
        file_name AS filename, 
        file_type AS type, 
        file_size, 
        adminid,  -- CRITICAL: Include adminid from database
        created_at AS uploaded_at,
        file_path,
        chart_type
      FROM file_repository_files
      ORDER BY created_at DESC
    `);

    const files = result.rows;
    const enrichedFiles = files.map(file => {
      const dbPath = file.file_path || ""; // stored path from DB
      const filename = dbPath.split("/").pop();
      const absolutePath = path.resolve(__dirname, "public/uploads/fileRepository", filename);

      if (fs.existsSync(absolutePath)) {
        try {
          const workbook = XLSX.readFile(absolutePath);
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          // return as array of arrays (header row + data rows)
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          const labels = jsonData[0] || [];
          // produce a numeric-array for sample data: flatten following rows and take numbers
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
          console.error(`Failed to parse ${file.filename} (${absolutePath}):`, e.message);
          return { ...file, labels: [], data: [] };
        }
      } else {
        console.warn(`File not found on disk: ${absolutePath}`);
        return { ...file, labels: [], data: [] };
      }
    });

    res.json(enrichedFiles);
  } catch (err) {
    console.error("Error fetching file data:", err);
    res.status(500).json({ error: "Failed to retrieve files" });
  }
});

// Add this route in server.js after the existing routes

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