"""
Hybrid Retrieval — Industry-Standard RAG
- Semantic search via FAISS (Cloudflare AI embeddings)
- BM25 keyword search over stored documents
- Reciprocal Rank Fusion (RRF) merge
- Returns top-k chunks with timestamp metadata
"""
import os
import numpy as np
from typing import List, Dict
from rank_bm25 import BM25Okapi
import requests

from .ingestion import (
    embed_texts_cloudflare,
    load_faiss_index,
    is_indexed,
    CF_ACCOUNT_ID,
    CF_API_TOKEN,
    CF_EMBED_MODEL,
)


def embed_query(query: str) -> np.ndarray:
    """Embed a single query using Cloudflare AI."""
    import faiss
    embeddings = embed_texts_cloudflare([query])
    vec = np.array(embeddings, dtype=np.float32)
    faiss.normalize_L2(vec)
    return vec


def semantic_search(video_id: str, query: str, top_k: int = 8) -> List[Dict]:
    """Semantic similarity search via FAISS."""
    index, store = load_faiss_index(video_id)
    chunks = store["chunks"]

    query_vec = embed_query(query)
    k = min(top_k, index.ntotal)
    scores, indices = index.search(query_vec, k)

    hits = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < 0:
            continue
        chunk = chunks[idx]
        hits.append({
            "text": chunk["text"],
            "start_time": chunk.get("start_time", 0),
            "timestamp_label": chunk.get("timestamp_label", "0:00"),
            "score": float(score),
            "source": "semantic",
        })
    return hits


def bm25_search(video_id: str, query: str, top_k: int = 8) -> List[Dict]:
    """BM25 keyword search over all stored chunks."""
    _, store = load_faiss_index(video_id)
    chunks = store["chunks"]

    if not chunks:
        return []

    tokenized_corpus = [c["text"].lower().split() for c in chunks]
    bm25 = BM25Okapi(tokenized_corpus)
    tokenized_query = query.lower().split()
    scores = bm25.get_scores(tokenized_query)

    indexed_scores = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)[:top_k]
    hits = []
    for idx, score in indexed_scores:
        if score > 0:
            chunk = chunks[idx]
            hits.append({
                "text": chunk["text"],
                "start_time": chunk.get("start_time", 0),
                "timestamp_label": chunk.get("timestamp_label", "0:00"),
                "score": float(score),
                "source": "bm25",
            })
    return hits


def reciprocal_rank_fusion(
    semantic_hits: List[Dict],
    bm25_hits: List[Dict],
    k: int = 60,
) -> List[Dict]:
    """Merge semantic and BM25 results using RRF."""
    doc_scores: Dict[str, float] = {}
    doc_data: Dict[str, Dict] = {}

    def rrf_score(rank: int) -> float:
        return 1.0 / (k + rank + 1)

    for rank, hit in enumerate(semantic_hits):
        key = hit["text"][:120]
        doc_scores[key] = doc_scores.get(key, 0) + rrf_score(rank)
        doc_data[key] = hit

    for rank, hit in enumerate(bm25_hits):
        key = hit["text"][:120]
        doc_scores[key] = doc_scores.get(key, 0) + rrf_score(rank)
        if key not in doc_data:
            doc_data[key] = hit

    merged = sorted(doc_scores.items(), key=lambda x: x[1], reverse=True)
    return [doc_data[key] for key, _ in merged]


def rerank(query: str, candidates: List[Dict], top_k: int = 4) -> List[Dict]:
    """
    Lightweight reranking by query term overlap + position score.
    Replace with Cohere Rerank or cross-encoder for production.
    """
    query_terms = set(query.lower().split())
    scored = []
    for c in candidates:
        text_lower = c["text"].lower()
        match_count = sum(1 for t in query_terms if t in text_lower)
        recency_bonus = 1.0 / (1.0 + c.get("start_time", 0) / 3600.0)
        final_score = c.get("score", 0) * 0.7 + match_count * 0.2 + recency_bonus * 0.1
        scored.append({**c, "final_score": final_score})

    scored.sort(key=lambda x: x["final_score"], reverse=True)
    return scored[:top_k]


def retrieve(video_id: str, query: str, top_k: int = 4) -> List[Dict]:
    """
    Full retrieval: semantic + BM25 → RRF → rerank.
    """
    semantic_hits = semantic_search(video_id, query, top_k=8)
    bm25_hits = bm25_search(video_id, query, top_k=8)
    merged = reciprocal_rank_fusion(semantic_hits, bm25_hits)
    return rerank(query, merged, top_k=top_k)
