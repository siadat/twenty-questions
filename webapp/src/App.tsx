import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import confetti from "canvas-confetti"
import './App.css';

const HOST = "http://hetzner:8000"

interface Message {
  text: string;
  sender: 'user' | 'server';
}

type GameState = 'playing' | 'completed';


function App() {
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const lastMessageRef = useRef<HTMLLIElement | null>(null);
  const [gameState, setGameState] = useState<GameState>('playing');

  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);


  const sendMessage = async () => {
    if (input.trim() === '') return;

    const request_data = { text: input };
    setMessages(messages => [...messages, { ...request_data, sender: 'user' }]);
    setInput('');

    try {
      const response = await axios.post(`${HOST}/guess`, request_data);
      let message_received = { ...response.data, sender: 'server' };
      setMessages(messages => [...messages, message_received]);
      setErrorMessage("")
      if (is_found(message_received.text)) {
        setGameState('completed')
        show_confetti()
      }
    } catch (error) {
      let message_received = error;

      if (axios.isAxiosError(error)) {
        message_received = error.message;
      }

      setErrorMessage(`Something went wrong: ${message_received}`)
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      sendMessage();
    }
  };

  const items = messages.map((message, index) => {
    let classes = ["message", `message-from-${message.sender}`]
    if (message.sender === "server" && message.text !== "No.") {
      classes.push("interesting-message")
    }
    console.log(message.text, message.sender, message.text.match(new RegExp("correct, well done", "i")));
    if (message.sender === "server" && is_found(message.text)) {
      classes.push("message-well-done")
    }
    let sender = message.sender === 'user' ? 'player' : message.sender;
    return <li key={index} className={classes.join(" ")} ref={index === messages.length - 1 ? lastMessageRef : null}>
      <b>{sender}</b>: {message.text}
    </li>
  })

  const errorContainer =
    errorMessage ?
    <div className="error">
      {errorMessage}
    </div>
    : null;

  return <>
    { errorContainer }
    <div className="game-container">
      <div className="description">
        <h1>
          Twenty Questions
        </h1>
      </div>
      <div className="middle-row">
        <ul className="messages">
          {items}
        </ul>
      </div>
      <div className="dock-bottom">
        <div className="input-container">
        { gameState === 'playing' ?
            <>
              <input
                style={{ width: '100%' }}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question or make a guess..."
                autoFocus={true}
              />
              <button onClick={sendMessage}>Send</button>
            </>
        :
          <>
          Completed!
          </>
        }
        </div>
      </div>
    </div>
  </>;
}

function show_confetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
}

function is_found(message: string) {
  return message.match(new RegExp("correct, well done", "i"))
}

export default App;
