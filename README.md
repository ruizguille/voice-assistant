# AI Voice Assistant using Groq, Llama 3 and Deepgram

This repository contains an AI Voice Assistant application built with Python and React, utilizing Deepgram for speech-to-text and text-to-speech functionality, and Llama 3 with Groq for natural language processing.

You can access a live demo of the AI Voice Assistant application [in this link](https://demos.codeawake.com/voice-assistant).

For a detailed walkthrough of the code and the technologies used, check out our blog post series:
- [Part 1: A local Python voice assistant app](https://codeawake.com/blog/ai-voice-assistant-1).
- [Part 2: A Python backend with FastAPI & WebSockets](https://codeawake.com/blog/ai-voice-assistant-2).
- [Part 3: An interactive React user interface](https://codeawake.com/blog/ai-voice-assistant-3).

<br/>

This project was developed by [CodeAwake](https://codeawake.com), and is licensed under the [MIT License](LICENSE).

## Structure

The repository is organized into two main folders:

- `backend/`: Contains the Python FastAPI backend code and a simple local Python assistant.
- `frontend/`: Contains the React Next.js frontend code.

## Installation

### Prerequisites ✅

- Python 3.11 or higher
- Node.js 18.17 or higher
- Poetry (Python package manager)

### Backend

1. Navigate to the backend folder and install the Python dependencies using Poetry:

    ```bash
    cd backend
    poetry install
    ```

2. Create a `.env` file in the backend folder copying the `.env.example` file provided and set the required environment variables:
    - `GROQ_API_KEY`: Your Groq API key.
    - `DEEPGRAM_API_KEY`: Your Deepgram API key.

### Frontend

1. Navigate to the frontend folder and install the JavaScript dependencies:

    ```bash
    cd frontend
    npm install
    ```

2. Create a `.env` file in the frontend folder copying the `.env.example` file provided that includes the required environment variable:
    - `NEXT_PUBLIC_WEBSOCKET_URL`: The WebSocket URL to connect to the backend API.


## Running the Application

### Local Python Assistant

You can run the local Python assistant script using the provided Poetry script:

```bash
cd backend
poetry run local-assistant
```

### Full-Stack Web Application

To run the full-stack web application:

1. Activate the virtual environment for the backend and start the backend server:

    ```bash
    cd backend
    poetry shell
    fastapi dev app/main.py
    ```

2. In a separate terminal, start the frontend server:

    ```bash
    cd frontend
    npm run dev
    ```

3. Open your web browser and visit `http://localhost:3000` to access the application.