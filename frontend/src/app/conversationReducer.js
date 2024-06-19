function conversationReducer(state, action) {
  switch(action.type) {
    // Reset the conversation state to its initial values
    case 'reset': {
      return { messages: [], finalTranscripts: [], interimTranscript: '' };
    }
    // Update the interim transcript with the latest content
    case 'transcript_interim': {
      return {
        ...state,
        interimTranscript: action.content
      };
    }
    // Append the final transcript to the list of final transcripts
    // and reset the interim transcript
    case 'transcript_final': {
      return {
        ...state,
        finalTranscripts: [...state.finalTranscripts, action.content],
        interimTranscript: ''
      };
    }
    // Add the user message (joining the previous final transcripts) and the
    // assistant message to the list of messages
    case 'assistant': {
      const newMessages = [];
      if (state.finalTranscripts.length > 0) {
        newMessages.push({ role: 'user', content: state.finalTranscripts.join(' ') });
      }
      newMessages.push({ role: 'assistant', content: action.content });
      return {
        ...state,
        messages: [...state.messages, ...newMessages],
        finalTranscripts: [],
        interimTranscript: ''
      };
    }
    default: {
      return state;
    }
  }
}

export default conversationReducer;