import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import confetti from "canvas-confetti"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub } from '@fortawesome/free-brands-svg-icons'
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons'
import './App.css';

let BACKEND = "https://twenty-questions-api.vercel.app"

if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  BACKEND = "http://hetzner:8000"
}

interface Message {
  text: string;
  sender: 'user' | 'server';
}

type GameState = 'setup' | 'playing' | 'completed';

function App() {
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [apikey, setAPIKey] = useState<string>('');
  const lastMessageRef = useRef<HTMLLIElement | null>(null);
  const [gameState, setGameState] = useState<GameState>('setup');

  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (input.trim() === '') return;

    const request_data = { text: input, apikey: apikey };
    setMessages(messages => [...messages, { ...request_data, sender: 'user' }]);
    setInput('');

    try {
      const response = await axios.post(`${BACKEND}/guess`, request_data);
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
        message_received = `${error.message}. Please ensure your OpenAI key is valid.`;
        setGameState('setup')
      }

      setErrorMessage(`Something went wrong: ${message_received}`)
      console.error('Error sending message:', error);
    }
  };

  const isAPIKeyValid = () => {
    return apikey.length > 50
  }

  const saveAPIKey = () => {
    if(!isAPIKeyValid()) {
      return
    }
    setGameState("playing")
    setMessages(messages => [...messages, {sender: 'server', text: "Ask questions to try and guess the Answer."}])
  }

  const handleKeyPressMessage = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      sendMessage();
    }
  };

  const handleKeyPressAPIKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      saveAPIKey();
    }
  };

  const conversation_items = messages.map((message, index) => {
    let classes = ["message", `message-from-${message.sender}`]
    if (message.sender === "server" && message.text !== "No.") {
      classes.push("interesting-message")
    }
    console.log(message.text, message.sender, message.text.match(new RegExp("correct, well done", "i")));
    if (message.sender === "server" && is_found(message.text)) {
      classes.push("message-well-done")
    }
    let sender = message.sender === 'user' ? 'you' : message.sender;
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
      <div className="header">
        <h1>
          Twenty Questions
          <div className="links"><a target="_blank" rel="noreferrer" href="https://github.com/siadat/twenty-questions"><FontAwesomeIcon icon={faGithub} /></a></div>
        </h1>
      </div>
      <div className="middle-row">
        <ul className="messages center">
          {conversation_items}
        </ul>
      </div>
      <div className="dock-bottom">
        <div className="input-container center">

        { gameState === 'setup' &&
          <>
              <input
                style={{ width: '100%' }}
                type="text"
                value={apikey}
                onChange={(e) => setAPIKey(e.target.value)}
                onKeyPress={handleKeyPressAPIKey}
                placeholder="Paste your OpenAI API key here"
                autoFocus={true}
              />
              <button disabled={!isAPIKeyValid()} onClick={saveAPIKey}>Start</button>
          </>
        }

        { gameState === 'playing' &&
            <>
              <input
                style={{ width: '100%' }}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPressMessage}
                placeholder="Ask a question or make a guess..."
                autoFocus={true}
              />
              <button onClick={sendMessage}>Send</button>
              <button onClick={() => setGameState("setup")}>⚙️</button>
            </>
        }

        { gameState === 'completed' && <> Completed! </> }
        </div>
        { gameState === 'setup' &&
          <div className="apikey-description center">
            You need an <a target="_blank" rel="noreferrer" href="https://platform.openai.com/account/api-keys">
            OpenAI API key <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
            </a>
          </div>
        }
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
