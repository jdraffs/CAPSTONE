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
import chatbotRoute from './routes/chatbotRoute.js';
import ojtRoute from './routes/ojtRoute.js';
import announcementRoute from './routes/announcementRoute.js';
import researchextensionRoute from './routes/research&extensionRoute.js';
import nstpRoute from './routes/nstpRoute.js';
import recentUploadsRoute from "./routes/recentUploadsRoute.js";
import formsrepositoryRoute from './routes/formsrepositoryRoute.js';
import fileRepositoryRoute from "./routes/fileRepositoryRoute.js";
import dataUploadsRoute from "./routes/dataUploadsRoute.js";

// initialize 
dotenv.config();
const app = express();

// middleware 
app.use(cors());
app.use(express.json());

// Serve static folders (correct relative paths)
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use('/private', express.static(path.join(__dirname, '../private')));
app.use('/public', express.static(path.join(__dirname, '../public')));

// routes
app.use('/api/login', loginRoute);
app.use('/api', chatbotRoute);
app.use('/api/ojt', ojtRoute);
app.use('/api/announcements', announcementRoute);
app.use('/api/researchextension', researchextensionRoute);
app.use('/api/nstp', nstpRoute);
app.use("/api/recent-uploads", recentUploadsRoute);
app.use("/api/files", fileRepositoryRoute);
app.use('/api/forms', formsrepositoryRoute);
app.use("/uploads", express.static("uploads")); // serve uploaded files
app.use("/api", dataUploadsRoute);


// server.js — replace existing /api/files/data handler with this
app.get("/api/files/data", async (req, res) => {
  try {
    // Fetch file metadata from DB
    const result = await pool.query(`
      SELECT 
        id, 
        file_name AS filename, 
        file_type AS type, 
        file_size, 
        adminid, 
        created_at AS uploaded_at,
        file_path
      FROM file_repository_files
      ORDER BY created_at DESC
    `);

    const files = result.rows;

    const enrichedFiles = files.map(file => {
      const dbPath = file.file_path || ""; // stored path from DB
      const cleaned = dbPath.replace(/^\/+/, "");
      const absolutePath = path.resolve(__dirname, "public", cleaned);

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



// pagstart ng server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
