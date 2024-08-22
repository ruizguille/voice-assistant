import VoiceAssistant from './VoiceAssistant';

export const metadata = {
  title: "AI Voice Assistant | CodeAwake",
  description: "Real-time AI Voice Assistant powered by Groq's inference technology, Deepgram's AI voice models and Meta Llama 3.",
  openGraph: {
    title: "AI Voice Assistant | CodeAwake",
    description: "Real-time AI Voice Assistant powered by Groq's inference technology, Deepgram's AI voice models and Meta Llama 3.",
    url : "https://voice-assistant.codeawake.com",
    siteName: "CodeAwake",
    type: "website",
  },
};


function App() {
  return <VoiceAssistant />;
}

export default App;