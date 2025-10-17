import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import loginRoute from './routes/loginRoute.js';
import chatbotRoute from './routes/chatbotRoute.js';
import ojtRoute from './routes/ojtRoute.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('public/uploads'));

// Route groups
app.use('/api/login', loginRoute);
app.use('/api', chatbotRoute);
app.use('/api/ojt', ojtRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
