# VoiceMarket Ghana

AI-powered voice marketplace for Ghanaian smallholder farmers. Speak in Twi/Ga/etc. to check market prices, list produce, or get farming advice.

## Tech Stack
- **Frontend**: Next.js 15 + TypeScript + Tailwind
- **Backend**: FastAPI (Python)
- **Voice**: GhanaNLP ASR + TTS + Translation APIs
- **Theme**: Moving Ghana Forward – Agriculture + Business Growth

## Quick Start

### Backend
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000