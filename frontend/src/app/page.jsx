'use client';

import { useState, useRef } from 'react';


export default function Home() {
  const [messages, setMessages] = useState([{ role: 'user', content: '' }]);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const socketRef = useRef(null);

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

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'assistant') {
          handleAssistantMessage(message);
        } else {
          handleUserMessage(message);
        }
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
        {messages.map(({ role, content }, idx) => (
          <p key={idx} className={role === 'user' ? 'text-cyan-600' : 'text-orange-600'}>
            {content}
          </p>
        ))}
      </div>
    </div>
  );
}
