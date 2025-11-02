import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';


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
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/private', express.static(path.join(__dirname, 'private')));
app.use('/public', express.static(path.join(__dirname, 'public')));




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


// pagstart ng server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
