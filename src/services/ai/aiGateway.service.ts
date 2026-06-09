/**
 * AI Gateway Service — Frontend thin client.
 * All AI logic (Gemini calls, tool execution, prompt building) is now on the backend.
 * Frontend only sends messages and renders responses.
 */
import apiClient from '../apiClient';

export type AgentType = 'USER_CHAT' | 'SHOP_ASSISTANT' | 'ADMIN_ASSISTANT';

export interface AIChatRequest {
  agentType: AgentType;
  message: string;
  sessionId?: string;
}

export interface AIChatResponse {
  text: string;
  /** JSON string of ToolResult — only for USER_CHAT when a tool was executed */
  toolResultJson?: string;
  sessionId: string;
  /** Which Gemini model was used (for debugging) */
  model?: string;
}

export interface AIHistoryItem {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  toolResultJson?: string;
  createdAt: string;
}

export const aiGatewayService = {
  /**
   * Send a message to the AI Gateway.
   * Backend handles: safety check, context building, Gemini call, tool execution.
   */
  sendMessage: async (request: AIChatRequest): Promise<AIChatResponse> => {
    const res = await apiClient.post<{ result: AIChatResponse }>('/ai/chat', request);
    return res.data.result;
  },

  /**
   * Get conversation history for an agent type.
   */
  getHistory: async (agentType: AgentType): Promise<AIHistoryItem[]> => {
    const res = await apiClient.get<{ result: AIHistoryItem[] }>('/ai/history', {
      params: { agentType },
    });
    return res.data.result ?? [];
  },

  /**
   * Clear conversation history for an agent type.
   */
  clearHistory: async (agentType: AgentType): Promise<void> => {
    await apiClient.delete('/ai/history', { params: { agentType } });
  },
};
