from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Configure Gemini API
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

genai.configure(api_key=GEMINI_API_KEY)

# Initialize the model
model = genai.GenerativeModel('gemini-2.5-flash')

# PUP Parañaque context and knowledge base
PUP_CONTEXT = """
You are a helpful assistant for the Polytechnic University of the Philippines (PUP) Parañaque Campus. 
Your role is to provide accurate information about the campus, programs, admission, and services.

KEY INFORMATION:

CAMPUS LOCATION:
- Address: PUP Parañaque Campus, Col. E. De Leon St. Wawa, Brgy. Sto. Niño, Parañaque City, Philippines 1700, Metro Manila
- Main Office: (02) 8839-0432
- Admissions: (02) 8839-0433
- Student Affairs: (02) 8839-0434

EMAIL ADDRESSES:
- General Inquiries: info.paranaque@pup.edu.ph
- Admissions: admissions.paranaque@pup.edu.ph
- Student Affairs: osa.paranaque@pup.edu.ph

OFFICE HOURS:
- Monday to Friday: 8:00 AM - 5:00 PM
- Saturday: 8:00 AM - 12:00 NN
- Closed on Sundays and Holidays

PROGRAMS OFFERED:
PUP Parañaque typically offers undergraduate programs in:
- Information Technology
- Computer Science
- Business Administration
- Hospitality Management
- Office Administration
- Various other programs (check with admissions for complete list)

ADMISSION REQUIREMENTS (General):
- High School Diploma or equivalent
- Transcript of Records
- Certificate of Good Moral Character
- Birth Certificate (PSA copy)
- 2x2 ID photos
- PUPCET (PUP College Entrance Test) passing score
- Medical Certificate
- Additional requirements may vary by program

TUITION AND FEES:
- PUP is known for being a state university with affordable tuition
- Exact fees vary by program and number of units
- Check with admissions office for current semester fees
- Scholarship opportunities available

ENROLLMENT PROCESS:
1. Pass PUPCET (entrance exam)
2. Submit complete admission requirements
3. Attend enrollment schedule
4. Pay fees and complete registration
5. Get class schedule and student ID

Always be polite, helpful, and direct users to the appropriate office or contact information when you don't have specific details.
If asked about very specific policies, recent changes, or detailed technical questions, advise them to contact the relevant office directly.
"""

@app.route('/api/chatbot', methods=['POST'])
def chatbot():
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        
        if not user_message:
            return jsonify({'reply': 'Please enter a message.'}), 400
        
        # Create prompt with context
        prompt = f"{PUP_CONTEXT}\n\nUser Question: {user_message}\n\nProvide a helpful, concise response:"
        
        # Generate response using Gemini
        response = model.generate_content(prompt)
        bot_reply = response.text
        
        return jsonify({'reply': bot_reply})
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            'reply': 'I apologize, but I encountered an error processing your request. Please try again or contact the office directly at (02) 8839-0432.'
        }), 500

@app.route('/api/chatbot/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Chatbot API is running'})

if __name__ == '__main__':
    print("Starting PUP Parañaque Chatbot API...")
    print(f"Gemini API Key loaded: {'Yes' if GEMINI_API_KEY else 'No'}")
    app.run(host='0.0.0.0', port=5001, debug=True)