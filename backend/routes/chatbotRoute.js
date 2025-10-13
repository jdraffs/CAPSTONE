import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

router.post('/chatbot', async (req, res) => {
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

export default router;
