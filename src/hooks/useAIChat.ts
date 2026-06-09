/**
 * useAIChat — Universal hook for all 3 AI agents.
 * Replaces: chatbot.service.ts logic, aiChat.service.ts, chatHistory.service.ts
 *
 * Frontend responsibilities (ONLY):
 * - Render messages
 * - Send message to backend
 * - Receive and display response
 * - Load/clear history
 *
 * Backend handles everything else.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { aiGatewayService, AgentType } from '../services/ai/aiGateway.service';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  /** Parsed ToolResult from toolResultJson — for USER_CHAT UI cards */
  toolResult?: unknown;
  isLoading?: boolean;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

export interface UseAIChatOptions {
  agentType: AgentType;
  welcomeMessage: string;
}

export interface UseAIChatReturn {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isLoading: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  historyLoaded: boolean;
}

export function useAIChat({ agentType, welcomeMessage }: UseAIChatOptions): UseAIChatReturn {
  const makeWelcome = (): ChatMessage => ({
    id: 'welcome',
    role: 'assistant',
    content: welcomeMessage,
    timestamp: new Date(),
  });

  const [messages, setMessages] = useState<ChatMessage[]>([makeWelcome()]);
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const sessionId = useRef<string>(`${agentType}_${Date.now()}`);

  // Load history on mount
  useEffect(() => {
    if (historyLoaded) return;
    aiGatewayService
      .getHistory(agentType)
      .then((records) => {
        if (records.length > 0) {
          const loaded: ChatMessage[] = records.map((r) => ({
            id: String(r.id),
            role: r.role,
            content: r.content,
            timestamp: new Date(r.createdAt),
            toolResult: r.toolResultJson ? safeParseJson(r.toolResultJson) : undefined,
          }));
          setMessages((prev) => [prev[0], ...loaded]);
        }
        setHistoryLoaded(true);
      })
      .catch(() => setHistoryLoaded(true));
  }, [agentType, historyLoaded]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: ChatMessage = {
        id: uid(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      };
      const loadingMsg: ChatMessage = {
        id: uid(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setIsLoading(true);

      try {
        // Single API call — backend does everything
        const response = await aiGatewayService.sendMessage({
          agentType,
          message: text,
          sessionId: sessionId.current,
        });

        const assistantMsg: ChatMessage = {
          id: uid(),
          role: 'assistant',
          content: response.text,
          timestamp: new Date(),
          toolResult: response.toolResultJson
            ? safeParseJson(response.toolResultJson)
            : undefined,
        };

        setMessages((prev) =>
          prev.map((m) => (m.isLoading ? assistantMsg : m))
        );
      } catch (err) {
        const errorText =
          err instanceof Error
            ? `Lỗi: ${err.message.slice(0, 150)}`
            : 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.';

        setMessages((prev) =>
          prev.map((m) =>
            m.isLoading ? { ...m, content: errorText, isLoading: false } : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [agentType, isLoading]
  );

  const clearHistory = useCallback(async () => {
    await aiGatewayService.clearHistory(agentType).catch(() => {});
    setMessages([makeWelcome()]);
    setHistoryLoaded(false);
  }, [agentType, welcomeMessage]);

  return { messages, setMessages, isLoading, sendMessage, clearHistory, historyLoaded };
}

function safeParseJson(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}
