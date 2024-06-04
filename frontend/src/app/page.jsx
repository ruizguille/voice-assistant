'use client';

import { useState, useReducer, useRef } from 'react';
import conversationReducer from './conversationReducer';

const initialConversation = { messages: [], finalTranscripts: [], interimTranscript: '' };

function Home() {
  const [conversation, dispatch] = useReducer(conversationReducer, initialConversation);
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

    function handleAudioStream(streamData) {
      audioDataRef.current.push(new Uint8Array(streamData));
      if (sourceBufferRef.current && !sourceBufferRef.current.updating) {
        sourceBufferRef.current.appendBuffer(audioDataRef.current.shift());
      }
    }

    function handleJsonMessage(jsonData) {
      const message = JSON.parse(jsonData);
      if (message.type === 'finish') {
        stopConversation();
      } else {
        // If user interrupts while audio is playing, skip the audio currently playing
        if (message.type === 'transcript_final' && isAudioPlaying()) {
          skipCurrentAudio();
        }
        dispatch(message);
      }
    }
    
    wsRef.current.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        handleAudioStream(event.data);
      } else {
        handleJsonMessage(event.data);
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
    
    mediaSourceRef.current.addEventListener('sourceopen', () => {
      if (!MediaSource.isTypeSupported('audio/mpeg')) return;
      
      sourceBufferRef.current = mediaSourceRef.current.addSourceBuffer('audio/mpeg');
      sourceBufferRef.current.addEventListener('updateend', () => {
        if (audioDataRef.current.length > 0 && !sourceBufferRef.current.updating) {
          sourceBufferRef.current.appendBuffer(audioDataRef.current.shift());
        }
      });
    });

    // Initialize Audio Element
    const audioUrl = URL.createObjectURL(mediaSourceRef.current);
    audioElementRef.current = new Audio(audioUrl);
    audioElementRef.current.play();
  }

  function isAudioPlaying() {
    return audioElementRef.current.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA;
  }

  function skipCurrentAudio() {
    audioDataRef.current = [];
    const buffered = sourceBufferRef.current.buffered;
    if (buffered.length > 0) {
      if (sourceBufferRef.current.updating) {
        sourceBufferRef.current.abort();
      }
    }
    audioElementRef.current.currentTime = buffered.end(buffered.length - 1);
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
    dispatch({ type: 'reset' });
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

  const currentTranscript = conversation.finalTranscripts.join(' ') + ' ' + conversation.interimTranscript;

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
        {conversation.messages.map(({ role, content }, idx) => (
          <div key={idx} className={role === 'user' ? 'text-cyan-600' : 'text-orange-600'}>
            {content}
          </div>
        ))}
        {currentTranscript && (
          <div className='text-cyan-600'>{currentTranscript}</div>
        )}
      </div>
    </div>
  );
}

export default Home;