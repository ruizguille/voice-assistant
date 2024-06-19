'use client';

import { useState, useReducer, useRef, useLayoutEffect } from 'react';
import Image from 'next/image';
import conversationReducer from './conversationReducer';
import micIcon from '../../public/mic.svg';
import micOffIcon from '../../public/mic-off.svg';

const initialConversation = { messages: [], finalTranscripts: [], interimTranscript: '' };

function VoiceAssistant() {
  const [conversation, dispatch] = useReducer(conversationReducer, initialConversation);
  const [isRunning, setIsRunning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const audioElementRef = useRef(null);
  const audioDataRef = useRef([]);
  const messagesEndRef = useRef(null);

  // Automatically scroll to bottom message
  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation]);

  function openWebSocketConnection() {
    wsRef.current = new WebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_URL);
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
        endConversation();
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

    wsRef.current.onclose = () => {
      endConversation();
    }
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
    mediaSourceRef.current = getMediaSource();
    if (!mediaSourceRef.current) {
      return;
    }
    
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
      audioElementRef.current.currentTime = buffered.end(buffered.length - 1);
    }
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
    try {
      openWebSocketConnection();
      await startMicrophone();
      startAudioPlayer();
      setIsRunning(true);
      setIsListening(true);
    } catch (err) {
      console.log('Error starting conversation:', err);
      endConversation();
    }
  }

  function endConversation() {
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

  const currentTranscript = [...conversation.finalTranscripts, conversation.interimTranscript].join(' ');

  return (
    <div className='flex flex-col h-svh pt-14 pb-4'>
      <div className='flex flex-col justify-center items-center'>
        <div className={`wave ${isRunning ? 'running' : ''}`} />
        <p className='mt-14 text-[13px] text-primary-orange'>
          {isRunning
            ? 'You can also end the conversation by saying "bye" or "goodbye"'
            : 'Click here to start a voice conversation with the assistant'
          }
        </p>
        <div className='flex items-center mt-3 gap-6'>
          <button
            className='w-48 border border-primary-orange text-primary-orange font-semibold px-4 py-2 rounded-2xl hover:bg-primary-orange/5'
            onClick={isRunning ? endConversation : startConversation}
          >
            {isRunning ? 'End conversation' : 'Start conversation'}
          </button>
          <button
            className='h-9 w-9 flex justify-center items-center bg-primary-orange rounded-full shadow-lg hover:opacity-70 disabled:opacity-70'
            onClick={toggleListening}
            disabled={!isRunning}
          >
            <Image src={isListening ? micIcon : micOffIcon} height={21} width={21} alt='microphone' />
          </button>
        </div>
      </div>
      <div className='w-full max-w-[600px] mt-6 mx-auto overflow-y-auto'>
        <div className='flex flex-col items-start p-4 rounded-lg space-y-3'>
          {conversation.messages.map(({ role, content }, idx) => (
            <div key={idx} className={role === 'user' ? 'user-bubble' : 'assistant-bubble'}>
              {content}
            </div>
          ))}
          {currentTranscript && (
            <div className='user-bubble'>{currentTranscript}</div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}

function getMediaSource() {
  if ('MediaSource' in window) {
    return new MediaSource();
  } else if ('ManagedMediaSource' in window) {
    // Use ManagedMediaSource if available in iPhone
    return new ManagedMediaSource();
  } else {
    console.log('No MediaSource API available');
    return null;
  }
}

export default VoiceAssistant;