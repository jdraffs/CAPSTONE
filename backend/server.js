import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import loginRoute from './routes/loginRoute.js';
import chatbotRoute from './routes/chatbotRoute.js';
import ojtRoute from './routes/ojtRoute.js';
import announcementRoute from './routes/announcementRoute.js';
import researchextensionRoute from './routes/research&extensionRoute.js';
import nstpRoute from './routes/nstpRoute.js';
import recentUploadsRoute from "./routes/recentUploadsRoute.js";


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('public/uploads'));

// Route groups
app.use('/api/login', loginRoute);
app.use('/api', chatbotRoute);
app.use('/api/ojt', ojtRoute);
app.use('/api/announcements', announcementRoute);
app.use('/api/researchextension', researchextensionRoute);
app.use('/api/nstp', nstpRoute);
app.use("/api/recent-uploads", recentUploadsRoute);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
