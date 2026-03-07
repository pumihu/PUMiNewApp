from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=None)

    PORT: int = 8000

    # Database (Railway Postgres or Supabase direct)
    DATABASE_URL: str | None = None
    SUPABASE_DB_URL: str | None = None

    # Supabase (for auth verification)
    SUPABASE_URL: str | None = None
    SUPABASE_SERVICE_ROLE_KEY: str | None = None
    SUPABASE_JWT_SECRET: str | None = None

    # Anthropic
    ANTHROPIC_API_KEY: str | None = None

    # ElevenLabs TTS
    ELEVENLABS_API_KEY: str | None = None
    ELEVENLABS_DEFAULT_VOICE_ID: str = "EXAVITQu4vr4xnSDxMaL"

    # Feature flags
    MENTOR_MODEL: str = "claude-3-haiku-20240307"
    CREATIVE_MODEL: str = "claude-3-haiku-20240307"


settings = Settings()
