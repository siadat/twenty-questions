import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

const HOST = "http://hetzner:8000"

interface Message {
  text: string;
  sender: 'user' | 'server';
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');

  const sendMessage = async () => {
    if (input.trim() === '') return;

    const message = { text: input };
    setMessages(messages => [...messages, { ...message, sender: 'user' }]);
    setInput('');

    try {
      const response = await axios.post(`${HOST}/guess`, message);
      setMessages(messages => [...messages, { ...response.data, sender: 'server' }]);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: 'auto', padding: '20px' }}>
      <div>
        {messages.map((message, index) => (
          <div key={index} style={{ textAlign: message.sender === 'user' ? 'right' : 'left' }}>
            <p>{message.text}</p>
          </div>
        ))}
      </div>
      <div>
        <input
          style={{ width: '100%' }}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default App;
