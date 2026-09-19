import { useState, useRef, useCallback } from 'react';
import { streamChat, ingestVideo, getVideoInfo, extractVideoId } from '../api/client';

/**
 * useChat — main hook managing the entire chatbot state:
 * - Video ingestion + metadata
 * - Chat message history
 * - Streaming answer tokens
 * - Session management
 */
export function useChat() {
  const [videoInfo, setVideoInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestError, setIngestError] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [dockMode, setDockMode] = useState('chat'); // 'chat' | 'ingest'
  const streamControllerRef = useRef(null);

  /**
   * Ingest a YouTube video by URL or ID.
   */
  const handleIngest = useCallback(async (input, forceReindex = false) => {
    const videoId = extractVideoId(input);
    if (!videoId) {
      setIngestError('Invalid YouTube URL or video ID.');
      return;
    }

    setIsIngesting(true);
    setIngestError(null);

    try {
      const result = await ingestVideo(videoId, forceReindex);
      setVideoInfo(result);
      setMessages([
        {
          id: 'system-0',
          role: 'assistant',
          content: `I've indexed **"${result.title}"** by ${result.channel}. The transcript has been processed into ${result.chunk_count} searchable chunks${result.already_indexed ? ' (loaded from cache)' : ''}.

What would you like to explore?`,
          timestamp: new Date(),
          sources: [],
        },
      ]);
      setDockMode('chat');
    } catch (err) {
      setIngestError(err.message);
    } finally {
      setIsIngesting(false);
    }
  }, []);

  /**
   * Send a chat message and stream the response.
   */
  const sendMessage = useCallback(async (question) => {
    if (!question.trim() || !videoInfo || isStreaming) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question.trim(),
      timestamp: new Date(),
    };

    const assistantId = `ai-${Date.now()}`;
    const assistantMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      sources: [],
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsStreaming(true);

    // Build history from previous messages (exclude streaming placeholder)
    const history = messages
      .filter((m) => m.role === 'user' || (m.role === 'assistant' && !m.isStreaming && m.content))
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    let fullContent = '';

    streamControllerRef.current = streamChat({
      videoId: videoInfo.video_id,
      question: question.trim(),
      sessionId,
      history,
      onToken: (token) => {
        fullContent += token;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: fullContent } : m
          )
        );
      },
      onSources: (sources) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, sources } : m
          )
        );
      },
      onSessionId: (sid) => {
        setSessionId(sid);
      },
      onDone: () => {
        setIsStreaming(false);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m
          )
        );
        streamControllerRef.current = null;
      },
      onError: (err) => {
        setIsStreaming(false);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${err.message}`, isStreaming: false }
              : m
          )
        );
        streamControllerRef.current = null;
      },
    });
  }, [videoInfo, isStreaming, messages, sessionId]);

  /**
   * Abort any ongoing stream.
   */
  const abortStream = useCallback(() => {
    streamControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  /**
   * Clear video context and start fresh.
   */
  const newSession = useCallback(() => {
    abortStream();
    setVideoInfo(null);
    setMessages([]);
    setSessionId(null);
    setIngestError(null);
    setDockMode('ingest');
  }, [abortStream]);

  return {
    videoInfo,
    messages,
    isIngesting,
    ingestError,
    isStreaming,
    sessionId,
    dockMode,
    setDockMode,
    handleIngest,
    sendMessage,
    abortStream,
    newSession,
  };
}
