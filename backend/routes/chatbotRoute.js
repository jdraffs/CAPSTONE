// chatbotRoute.js - ES6 module format
import express from 'express';
import axios from 'axios';

const router = express.Router();

// Python API URL (where your Gemini chatbot runs)
const PYTHON_API_URL = 'http://localhost:5001/api/chatbot';

router.post('/', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ 
        reply: 'Please provide a message.' 
      });
    }

    // Forward request to Python API
    const response = await axios.post(PYTHON_API_URL, {
      message: message
    }, {
      timeout: 30000 // 30 second timeout
    });

    // Return the chatbot's reply
    res.json({ reply: response.data.reply });

  } catch (error) {
    console.error('Chatbot route error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        reply: 'The chatbot service is currently unavailable. Please try again later or contact us directly at (02) 8839-0432.' 
      });
    }

    res.status(500).json({ 
      reply: 'I apologize, but I encountered an error. Please contact our office at (02) 8839-0432 for assistance.' 
    });
  }
});

export default router;