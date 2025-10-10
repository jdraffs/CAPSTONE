// Import required dependencies
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables from .env file
dotenv.config();

// Import PostgreSQL client (pg)
import pkg from 'pg';
const { Pool } = pkg;

// PostgreSQL connection setup
const pool = new Pool({
  user: 'postgres', // or your DB user
  host: 'localhost',
  database: 'capstone_db',
  password: 'Kisses123', // replace with your PostgreSQL password
  port: 5432,
});

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Define the port for the server
const PORT = process.env.PORT || 3000;

/* 
  ===============================
  🤖 Chatbot API Endpoint
  ===============================
  This endpoint sends user messages to a Hugging Face AI model (Mistral-7B).
  It returns the model’s generated response to the client.
*/
app.post('/api/chatbot', async (req, res) => {
  const userMessage = req.body.message;

  try {
    const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: `User: ${userMessage}\nAssistant:`,
        parameters: {
          max_new_tokens: 100,
          temperature: 0.7
        }
      })
    });

    const rawResponse = await response.text();
    console.log('Raw Response:', rawResponse);

const data = JSON.parse(rawResponse);
const fullResponse = data[0]?.generated_text || '';

const assistantMatch = fullResponse.match(/Assistant:(.*)/gs);
const assistantReply = assistantMatch ? assistantMatch.pop().replace(/User:.*/s, '').trim() : "Sorry, I couldn't process that.";

res.json({ reply: assistantReply });

  } catch (error) {
    console.error('Error contacting Hugging Face:', error);
    res.status(500).json({ reply: 'Sorry, an error occurred while contacting the AI.' });
  }
});

/* 
  ===============================
  👩‍💼 Admin Routes
  ===============================
  These routes handle admin-related functionality such as 
  fetching admin data and verifying login credentials.
*/

// Get all admin accounts from the database
app.get('/api/admins', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM admin_accounts');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Verify admin login credentials
app.post('/api/login', async (req, res) => {
  const { adminid, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM admin_accounts WHERE adminid = $1 AND password = $2',
      [adminid, password]
    );

    if (result.rows.length > 0) {
      res.json({ success: true, message: 'Login successful' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* 
  ===============================
  🚀 Server Startup
  ===============================
  Start listening on the specified port.
  This confirms the backend is running successfully.
*/

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

