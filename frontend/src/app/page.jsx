'use client';

import { useState, useRef } from 'react';


export default function Home() {
  const [messages, setMessages] = useState([{ role: null, text: '' }]);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const socketRef = useRef(null);

  function handleUserMessage({ type, text }) {
    setMessages(prevMessages => {
      const newMessages = [...prevMessages];
      newMessages[newMessages.length - 1] = { role: 'user', text };
      if (type === 'transcript_final') {
        newMessages.push({ role: null, text: '' });
      }
      return newMessages;
    });
  };


  async function startTranscription() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const socket = new WebSocket(`ws://localhost:8000/listen`);

      socket.onopen = () => {
        mediaRecorder.addEventListener('dataavailable', e => {
          if (e.data.size > 0 && socket.readyState == WebSocket.OPEN) {
            socket.send(e.data);
          }
        });
        mediaRecorder.start(250);
        setIsRecording(true);
      };

      socket.onmessage = (message) => {
        const data = JSON.parse(message.data);
        handleUserMessage(data);
      };

      socket.onclose = () => {
        mediaRecorder.stop();
        setIsRecording(false);
      };

      mediaRecorderRef.current = mediaRecorder;
      socketRef.current = socket;
    } catch (error) {
      console.error('Error accessing media devices.', error);
    }
  };

  const stopTranscription = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (socketRef.current) {
      socketRef.current.close();
    }
    setIsRecording(false);
  };

  const handleButtonClick = () => {
    if (isRecording) {
      stopTranscription();
    } else {
      startTranscription();
    }
  };

  return (
    <div className='p-6'>
      <button className='border border-slate-400 px-4 py-1 rounded-md' onClick={handleButtonClick}>
        {isRecording ? 'Stop transcription' : 'Start transcription'}
      </button>
      <div>
        {messages.map(({ role, text }, idx) => (
          <p key={idx}>{text}</p>
        ))}
      </div>
    </div>
  );
}
