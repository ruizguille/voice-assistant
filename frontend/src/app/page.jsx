'use client';

import { useState, useRef } from 'react';

function Home() {
  const [messages, setMessages] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const audioElementRef = useRef(null);
  const audioDataRef = useRef([]);

  function openWebSocketConnection() {
    wsRef.current = new WebSocket('ws://localhost:8000/listen');
    wsRef.current.binaryType = 'arraybuffer';

    function handleUserMessage({ type, content }) {
      const newMessage = { role: 'user', content, final: type === 'transcript_final' };
      setMessages(prevMessages => {
        const newMessages = [...prevMessages];
        const lastMessage = newMessages?.[newMessages.length - 1];
        if (!lastMessage?.final && lastMessage?.role === 'user') {
          newMessages[newMessages.length - 1] = newMessage;
        } else {
          newMessages.push(newMessage);
        }
        return newMessages;
      });
    };
  
    function handleAssistantMessage({ content }) {
      const newMessage = { role: 'assistant', content };
      setMessages(prevMessages => [...prevMessages, newMessage]);
    }

    function handleAudioStream(streamData) {
      audioDataRef.current.push(new Uint8Array(streamData));
      if (sourceBufferRef.current && !sourceBufferRef.current.updating) {
        sourceBufferRef.current.appendBuffer(audioDataRef.current.shift());
      }
    }

    const messageTypeHandlers = {
      'assistant': handleAssistantMessage,
      'transcript_interim': handleUserMessage,
      'transcript_final': handleUserMessage,
      'finish': stopConversation
    }
    
    wsRef.current.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        handleAudioStream(event.data);
      } else {
        const message = JSON.parse(event.data);
        messageTypeHandlers[message.type](message);
      }
    };
  }

  function closeWebSocketConnection() {
    if (wsRef.current) {
      wsRef.current.close();
    }
  }

  async function startMicrophone() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    mediaRecorderRef.current.addEventListener('dataavailable', e => {
      if (e.data.size > 0 && wsRef.current.readyState == WebSocket.OPEN) {
        wsRef.current.send(e.data);
      }
    });
    mediaRecorderRef.current.start(250);
  }

  function stopMicrophone() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  }

  function startAudioPlayer() {
    // Initialize MediaSource and event listeners
    mediaSourceRef.current = new MediaSource();
    
    function handleUpdateEnd() {
      if (audioDataRef.current.length > 0 && !sourceBufferRef.current.updating) {
        sourceBufferRef.current.appendBuffer(audioDataRef.current.shift());
      }
    }
    
    function handleSourceOpen() {
      if (MediaSource.isTypeSupported('audio/mpeg')) {
        sourceBufferRef.current = mediaSourceRef.current.addSourceBuffer('audio/mpeg');
        sourceBufferRef.current.addEventListener('updateend', handleUpdateEnd);
      }
    }
    
    mediaSourceRef.current.addEventListener('sourceopen', handleSourceOpen);
    
    // Initialize Audio Element
    const audioUrl = URL.createObjectURL(mediaSourceRef.current);
    audioElementRef.current = new Audio(audioUrl);
    audioElementRef.current.play();
  }

  function stopAudioPlayer() {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      URL.revokeObjectURL(audioElementRef.current.src);
      audioElementRef.current = null;
    }

    if (mediaSourceRef.current) {
      if (sourceBufferRef.current) {
        mediaSourceRef.current.removeSourceBuffer(sourceBufferRef.current);
        sourceBufferRef.current = null;
      }
      mediaSourceRef.current = null;
    }

    audioDataRef.current = [];
  }

  async function startConversation() {
    setMessages([]);
    openWebSocketConnection();
    await startMicrophone();
    startAudioPlayer();
    setIsRunning(true);
    setIsListening(true);
  }

  function stopConversation() {
    closeWebSocketConnection();
    stopMicrophone();
    stopAudioPlayer();
    setIsRunning(false);
    setIsListening(false);
  }

  function toggleListening() {
    if (isListening) {
      mediaRecorderRef.current.pause();
    } else {
      mediaRecorderRef.current.resume();
    }
    setIsListening(!isListening);
  }

  return (
    <div className='p-6'>
      <div className='flex gap-4'>
        <button
          className='border border-slate-400 px-4 py-1 rounded-md'
          onClick={isRunning ? stopConversation : startConversation}
        >
          {isRunning ? 'Stop conversation' : 'Start conversation'}
        </button>
        <button
          className='border border-slate-400 px-4 py-1 rounded-md'
          onClick={toggleListening}
          disabled={!isRunning}
        >
          {isListening ? 'Stop listening' : 'Listen'}
        </button>
      </div>
      <div>
        {messages.map(({ role, content }, idx) => (
          <p key={idx} className={role === 'user' ? 'text-cyan-600' : 'text-orange-600'}>
            {content}
          </p>
        ))}
      </div>
    </div>
  );
}

export default Home;