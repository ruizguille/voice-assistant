'use client';

import { useState, useEffect, useRef } from 'react';

function Home() {
  const [messages, setMessages] = useState([{ role: 'user', content: '' }]);
  const [isRunning, setIsRunning] = useState(false);
  const startedRef = useRef(false);
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const audioElementRef = useRef(null);
  const audioDataRef = useRef([]);

  /* Initialize WebSocket connection */
  useEffect(() => {
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
    
    wsRef.current.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        handleAudioStream(event.data);
      } else {
        const message = JSON.parse(event.data);
        if (message.type === 'assistant') {
          handleAssistantMessage(message);
        } else {
          handleUserMessage(message);
        }
      }
    };

    // Cleanup
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      
    };
  }, []);

  /* Initialize Microphone */
  useEffect(() => {
    async function initMicrophone() {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current.addEventListener('dataavailable', e => {
        if (e.data.size > 0 && wsRef.current.readyState == WebSocket.OPEN) {
          wsRef.current.send(e.data);
        }
      });
    }

    initMicrophone();

    // Cleanup
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  /* Initialize Audio Player */
  useEffect(() => {
    // Initialize MediaSource and event handlers
    const mediaSource = new MediaSource();
    
    function handleUpdateEnd() {
      if (audioDataRef.current.length > 0 && !sourceBufferRef.current.updating) {
        sourceBufferRef.current.appendBuffer(audioDataRef.current.shift());
      }
    }
    
    function handleSourceOpen() {
      sourceBufferRef.current = mediaSource.addSourceBuffer('audio/mpeg');
      sourceBufferRef.current.addEventListener('updateend', handleUpdateEnd);
    }
    
    mediaSource.addEventListener('sourceopen', handleSourceOpen);
    
    // Initialize Audio Element
    const audioUrl = URL.createObjectURL(mediaSource);
    audioElementRef.current = new Audio(audioUrl);

    // Cleanup
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
        audioElementRef.current = null;
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (mediaSource) {
        mediaSource.removeEventListener('sourceopen', handleSourceOpen);
      }
      if (sourceBufferRef.current) {
        sourceBufferRef.current.removeEventListener('updateend', handleUpdateEnd);
        sourceBufferRef.current = null;
      }
    };
  }, []);

  function toggleConversation() {
    if (isRunning) {
      mediaRecorderRef.current.pause();
    } else {
      if (!startedRef.current) {
        mediaRecorderRef.current.start(250);
        audioElementRef.current.play();
        startedRef.current = true;
      } else {
        mediaRecorderRef.current.resume();
      }
    }
    setIsRunning(!isRunning);
  }

  return (
    <div className='p-6'>
      <button
        className='block border border-slate-400 px-4 py-1 rounded-md'
        onClick={toggleConversation}
      >
        {isRunning ? 'Stop conversation' : 'Start conversation'}
      </button>
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