import React, { useState, CSSProperties } from 'react';
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

  const items = messages.map((message, index) => {
    const s: CSSProperties = {
      textAlign: message.sender === 'user' ? 'right' : 'left',
      backgroundColor: message.sender !== "user" && message.text !== "No." ? "#fa0" : "transparent",
    }
    return <li key={index} style={s}>
      <p>{message.text}</p>
    </li>
  })

  return (
    <div style={{ maxWidth: '800px', margin: 'auto', padding: '20px' }}>
      <div>
        <h1>
          Twenty Questions
        </h1>
        <p>
          Let's play a game! Here are the rules:
          <li>I have something in mind.</li>
          <li>You can ask me 20 questions to guess what I have in mind.</li>
          <li>I will answer with Yes or No.</li>
        </p>
        Start by asking me a question!
        <ol>
          {items}
        </ol>
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
