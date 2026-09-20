from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV = Path(__file__).resolve().parents[3] / ".env"


class AISettings(BaseSettings):
    ai_enabled: bool = True
    default_confidence_threshold: float = 0.70
    rag_top_k: int = 5
    max_context_length: int = 12000

    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"

    model_config = SettingsConfigDict(
        env_file=ROOT_ENV,
        env_file_encoding="utf-8",
        extra="ignore",
    )


ai_settings = AISettings()
