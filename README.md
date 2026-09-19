# YT Chatbot — Full-Stack Web App

A production-grade YouTube chatbot built with **FastAPI + React + ChromaDB**, powered by **Cloudflare AI embeddings** and **OpenRouter (Claude 3.5 Sonnet)**.

## Architecture

```
Frontend (React/Vite) → FastAPI Backend → ChromaDB (vector store)
                                       ↓
                          Cloudflare AI (embeddings)
                          OpenRouter Claude 3.5 Sonnet (generation)
                          YouTube Transcript API (data source)
```

### RAG Pipeline
1. **Ingest**: Fetch YouTube transcript with timestamps → chunk with overlap → embed via Cloudflare AI → store in ChromaDB
2. **Retrieve**: Hybrid search (semantic + BM25) → RRF merge → rerank to top-4
3. **Generate**: Build context prompt with history → stream answer via OpenRouter → SSE to frontend

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Environment Variables (`.env`)
```
GOOGLE_API_KEY=...
CF_ACCOUNT_ID=...
CF_API_TOKEN=...
OPENROUTER_API_KEY=...
```

## Deployment

### Frontend → Cloudflare Pages
```bash
cd frontend
npm run build
# Upload dist/ to Cloudflare Pages
# Set VITE_API_URL to your backend URL in CF Pages env vars
```

### Backend → Any Python host (Render/Railway/VPS)
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```
Set the same 4 environment variables in your hosting platform.
