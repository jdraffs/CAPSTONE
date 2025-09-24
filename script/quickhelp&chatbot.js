const chatToggleBtn = document.getElementById('chatToggleBtn');
const chatbox = document.getElementById('chatbox');
const chatIcon = document.getElementById('chatIcon');
const chatMessages = document.getElementById('chatMessages');
const chatText = document.getElementById('chatText');

chatToggleBtn.addEventListener('click', () => {
  const isOpen = chatbox.style.display === 'flex';
  chatbox.style.display = isOpen ? 'none' : 'flex';
  if (!isOpen && chatMessages.childElementCount === 0) {
    const welcomeMsgDiv = document.createElement('div');
    welcomeMsgDiv.className = 'message assistant';
    welcomeMsgDiv.textContent = 'Assistant: Welcome to PUP Parañaque chatbot! How can I help you today?';
    chatMessages.appendChild(welcomeMsgDiv);
  }
  
  chatIcon.textContent = isOpen ? 'chat_bubble_outline' : 'close';
});

function sendMessage() {
  const text = chatText.value.trim();
  if (text === '') return;

  // Display user message
  const userMsgDiv = document.createElement('div');
  userMsgDiv.className = 'message user';
  userMsgDiv.textContent = 'You: ' + text;
  chatMessages.appendChild(userMsgDiv);

  chatText.value = '';
  chatText.focus();

  // Call the backend server
  console.log('Sending message to server:', text);

  fetch('http://localhost:3000/api/chatbot', { // Ensure this matches your backend URL
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: text }),
  })
  
    .then(response => {
      console.log('Got response:', response);
      if (!response.ok) {
        throw new Error('Failed to fetch');
      }
      return response.json();
    })
    .then(data => {
      // Display chatbot response
      const botMsgDiv = document.createElement('div');
      botMsgDiv.className = 'message assistant';
      botMsgDiv.textContent = 'Assistant: ' + data.reply;
      chatMessages.appendChild(botMsgDiv);

      // Scroll to the latest message
      chatMessages.scrollTop = chatMessages.scrollHeight;
    })
    .catch(error => {
      console.error('Error:', error);
      const errorMsgDiv = document.createElement('div');
      errorMsgDiv.className = 'message assistant';
      errorMsgDiv.textContent = 'Assistant: Sorry, something went wrong.';
      chatMessages.appendChild(errorMsgDiv);
    });
}


// Allow pressing Enter to send a message
chatText.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});