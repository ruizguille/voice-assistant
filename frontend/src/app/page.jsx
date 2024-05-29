'use client';

import { useState, useRef } from 'react';


export default function Home() {
  const [transcription, setTranscription] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const socketRef = useRef(null);

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
        setTranscription(prev => [...prev, data.text]);
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
        {transcription.map((message, idx) => (
          <p key={idx}>{message}</p>
        ))}
      </div>
    </div>
  );
}
