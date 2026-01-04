const chatToggleBtn = document.getElementById('chatToggleBtn');
const chatbox = document.getElementById('chatbox');
const chatIcon = document.getElementById('chatIcon');
const chatMessages = document.getElementById('chatMessages');
const chatText = document.getElementById('chatText');
const questionButtons = document.querySelectorAll('.question-button');
const commonQuestions = document.getElementById('commonQuestions');

// Toggle chatbox open/close
chatToggleBtn.addEventListener('click', () => {
  openChatbox();
});

// Function to open chatbox
function openChatbox() {
  chatbox.style.display = 'flex';
  chatToggleBtn.style.display = 'none'; // Hide toggle button when chatbox is open
}

// Function to close chatbox
function closeChatbox() {
  chatbox.style.display = 'none';
  chatToggleBtn.style.display = 'flex'; // Show toggle button when chatbox is closed
}

// Add toggle button for common questions and close button to header
window.addEventListener('DOMContentLoaded', () => {
  const timestampElement = document.getElementById('timeStamp');
  if (timestampElement) {
    timestampElement.textContent = getTimestamp();
  }

  // Add close button to chat header
  const chatHeader = document.getElementById('chatHeader');
  if (chatHeader) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-chat-btn';
    closeBtn.innerHTML = '<span class="material-icons">close</span>';
    closeBtn.title = 'Close Chat';
    closeBtn.addEventListener('click', closeChatbox);
    chatHeader.appendChild(closeBtn);
  }

  // Create toggle button for common questions
  if (commonQuestions) {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'toggle-questions-btn';
    toggleBtn.innerHTML = '<span class="material-icons">expand_more</span>';
    toggleBtn.title = 'Show/Hide Common Questions';
    
    const questionTitle = commonQuestions.querySelector('p');
    if (questionTitle) {
      questionTitle.style.display = 'flex';
      questionTitle.style.justifyContent = 'space-between';
      questionTitle.style.alignItems = 'center';
      questionTitle.style.cursor = 'pointer';
      questionTitle.appendChild(toggleBtn);
      
      // Make entire title clickable
      questionTitle.addEventListener('click', () => {
        toggleCommonQuestions();
      });
    }
  }
});

// Toggle common questions visibility
function toggleCommonQuestions() {
  const questionsDiv = commonQuestions.querySelector('div');
  const toggleBtn = commonQuestions.querySelector('.toggle-questions-btn');
  const icon = toggleBtn.querySelector('.material-icons');
  
  if (questionsDiv.style.display === 'none') {
    questionsDiv.style.display = 'flex';
    icon.textContent = 'expand_more';
    icon.style.transform = 'rotate(0deg)';
  } else {
    questionsDiv.style.display = 'none';
    icon.textContent = 'expand_more';
    icon.style.transform = 'rotate(-90deg)';
  }
}

// Handle common question buttons
questionButtons.forEach(button => {
  button.addEventListener('click', () => {
    const questionText = button.textContent;
    chatText.value = questionText;
    sendMessage();
  });
});

// Get current timestamp
function getTimestamp() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Display a message in the chat
function displayMessage(text, isUser = false) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${isUser ? 'user' : 'assistant'}`;
  
  const timestamp = document.createElement('span');
  timestamp.className = 'timestamp';
  timestamp.textContent = getTimestamp();
  
  const sender = document.createElement('strong');
  sender.textContent = isUser ? 'You' : 'Assistant';
  
  const content = document.createElement('span');
  content.textContent = text;
  
  msgDiv.appendChild(sender);
  msgDiv.appendChild(timestamp);
  msgDiv.appendChild(document.createElement('br'));
  msgDiv.appendChild(content);
  
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show typing indicator
function showTypingIndicator() {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message assistant typing-indicator';
  typingDiv.id = 'typing-indicator';
  typingDiv.innerHTML = '<strong>Assistant</strong> <span class="timestamp">' + getTimestamp() + '</span><br><span class="dots"><span>.</span><span>.</span><span>.</span></span>';
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
  const typingDiv = document.getElementById('typing-indicator');
  if (typingDiv) {
    typingDiv.remove();
  }
}

// Send message to chatbot
async function sendMessage() {
  const text = chatText.value.trim();
  if (text === '') return;

  // Display user message
  displayMessage(text, true);
  
  // Clear input
  chatText.value = '';
  chatText.focus();

  // Show typing indicator
  showTypingIndicator();

  try {
    console.log('Sending message to server:', text);

    const response = await fetch('http://localhost:3000/api/chatbot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: text }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Remove typing indicator
    removeTypingIndicator();
    
    // Display chatbot response
    displayMessage(data.reply);

  } catch (error) {
    console.error('Error:', error);
    
    // Remove typing indicator
    removeTypingIndicator();
    
    // Display error message
    displayMessage('Sorry, I\'m having trouble connecting right now. Please try again later or contact us directly at (02) 8839-0432.');
  }
}

// Allow pressing Enter to send a message
chatText.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendMessage();
  }
});