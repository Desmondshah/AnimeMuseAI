import { useState, useEffect, useCallback } from 'react';

interface ChatMessage {
  id: string;
  type: "user" | "ai" | "error" | "analysis" | "guide";
  content: string;
  recommendations?: any[];
  analysis?: any;
  guide?: any;
  feedback?: "up" | "down" | null;
  rawAiResponse?: any[];
  rawAiText?: string;
  actionType?: string;
}

const STORAGE_KEY = 'animuse_chat_history';
const MAX_STORED_MESSAGES = 50; // Limit to prevent localStorage from getting too large

export const usePersistentChatHistory = () => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load chat history from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(STORAGE_KEY);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          setChatHistory(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      // Clear corrupted data
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    if (!isLoaded) return; // Don't save until we've loaded initial data
    
    try {
      // Keep only the most recent messages to prevent storage bloat
      const messagesToStore = chatHistory.slice(-MAX_STORED_MESSAGES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messagesToStore));
    } catch (error) {
      console.error('Failed to save chat history:', error);
      // If storage is full, try to clear old data and save again
      try {
        localStorage.removeItem(STORAGE_KEY);
        const recentMessages = chatHistory.slice(-20); // Keep only last 20 messages
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recentMessages));
      } catch (retryError) {
        console.error('Failed to save even after clearing:', retryError);
      }
    }
  }, [chatHistory, isLoaded]);

  // Enhanced setChatHistory that handles persistence
  const updateChatHistory = useCallback((
    updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])
  ) => {
    setChatHistory(updater);
  }, []);

  // Clear chat history
  const clearChatHistory = useCallback(() => {
    setChatHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear stored chat history:', error);
    }
  }, []);

  // Add a single message
  const addMessage = useCallback((message: ChatMessage) => {
    updateChatHistory(prev => [...prev, message]);
  }, [updateChatHistory]);

  // Update a specific message (for feedback, etc.)
  const updateMessage = useCallback((messageId: string, updates: Partial<ChatMessage>) => {
    updateChatHistory(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    );
  }, [updateChatHistory]);

  return {
    chatHistory,
    setChatHistory: updateChatHistory,
    addMessage,
    updateMessage,
    clearChatHistory,
    isLoaded
  };
};