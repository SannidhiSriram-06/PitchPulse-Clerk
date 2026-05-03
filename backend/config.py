import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-in-prod")

    # JWT
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-change-in-prod")
    JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "24"))

    # Database
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///pitchpulse.db")
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # External APIs
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

    # Rate limiting (free tier)
    FREE_TIER_HOURLY_LIMIT = 3

    @classmethod
    def validate(cls):
        """Raise if any required env var is missing."""
        missing = []
        if not cls.GROQ_API_KEY:
            missing.append("GROQ_API_KEY")
        if not cls.TAVILY_API_KEY:
            missing.append("TAVILY_API_KEY")
        if not cls.JWT_SECRET_KEY or cls.JWT_SECRET_KEY == "dev-jwt-secret-change-in-prod":
            # warn but don't hard-fail in dev
            print("WARNING: JWT_SECRET_KEY is not set or using dev default. Set it in .env before production.")
        if missing:
            raise EnvironmentError(f"Missing required environment variables: {', '.join(missing)}")