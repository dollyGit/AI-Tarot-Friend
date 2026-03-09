"""
CaringService — Configuration via Pydantic Settings
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Service
    SERVICE_NAME: str = "caring"
    PORT: int = 3020
    ENV: str = "development"
    LOG_LEVEL: str = "DEBUG"

    # Database (PostgreSQL)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/caring_db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Kafka
    KAFKA_BROKERS: str = "localhost:9092"

    # DAL gRPC
    DAL_GRPC_HOST: str = "localhost:4000"

    # Auth
    JWT_SECRET: str = "dev-secret-change-in-production"
    SERVICE_AUTH_SECRET: str = "dev-service-secret"

    model_config = {"env_prefix": "", "case_sensitive": True}


settings = Settings()
