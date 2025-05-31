from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    ENVIRONMENT: str = 'development'
    ALLOW_ORIGINS: str = '*'
    GROQ_API_KEY: str
    DEEPGRAM_API_KEY: str
    LLM: str = 'llama-3.1-8b-instant'

    model_config = SettingsConfigDict(env_file='.env')

settings = Settings()