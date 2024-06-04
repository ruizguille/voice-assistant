function conversationReducer(state, action) {
  switch(action.type) {
    case 'reset': {
      return { messages: [], finalTranscripts: [], interimTranscript: '' };
    }
    case 'transcript_interim': {
      return {
        ...state,
        interimTranscript: action.content
      };
    }
    case 'transcript_final': {
      return {
        ...state,
        finalTranscripts: [...state.finalTranscripts, action.content],
        interimTranscript: ''
      };
    }
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