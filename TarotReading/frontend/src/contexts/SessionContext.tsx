/**
 * Session Context Provider
 * Manages global session state across the app
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiClient } from '../services/api-client';
import type {
  Session,
  CreateSessionRequest,
  Channel,
  Sentiment,
  CrisisResources,
} from '@tarot/shared';

interface SessionState {
  currentSession: Session | null;
  isLoading: boolean;
  error: string | null;
}

interface SessionContextValue extends SessionState {
  createSession: (channel: Channel, userInput?: string) => Promise<Session>;
  clearSession: () => void;
  getSentiment: () => Sentiment | null;
  getCrisisResources: () => CrisisResources | null;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [state, setState] = useState<SessionState>({
    currentSession: null,
    isLoading: false,
    error: null,
  });

  /**
   * Load session from localStorage on mount (for persistence)
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedSession = localStorage.getItem('current_session');
    if (savedSession) {
      try {
        const session: Session = JSON.parse(savedSession);
        setState((prev) => ({ ...prev, currentSession: session }));
      } catch (err) {
        console.error('Failed to parse saved session:', err);
        localStorage.removeItem('current_session');
      }
    }
  }, []);

  /**
   * Save session to localStorage whenever it changes
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (state.currentSession) {
      localStorage.setItem('current_session', JSON.stringify(state.currentSession));
    } else {
      localStorage.removeItem('current_session');
    }
  }, [state.currentSession]);

  /**
   * Create new session
   */
  const createSession = useCallback(
    async (channel: Channel, userInput?: string): Promise<Session> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const request: CreateSessionRequest = {
          channel,
          user_input: userInput,
        };

        const session = await apiClient.createSession(request);

        setState({
          currentSession: session,
          isLoading: false,
          error: null,
        });

        return session;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create session';

        setState({
          currentSession: null,
          isLoading: false,
          error: errorMessage,
        });

        throw err;
      }
    },
    []
  );

  /**
   * Clear current session
   */
  const clearSession = useCallback(() => {
    setState({
      currentSession: null,
      isLoading: false,
      error: null,
    });
  }, []);

  /**
   * Get sentiment from current session
   */
  const getSentiment = useCallback((): Sentiment | null => {
    return state.currentSession?.sentiment || null;
  }, [state.currentSession]);

  /**
   * Get crisis resources from current session
   */
  const getCrisisResources = useCallback((): CrisisResources | null => {
    return state.currentSession?.crisis_resources || null;
  }, [state.currentSession]);

  const value: SessionContextValue = {
    ...state,
    createSession,
    clearSession,
    getSentiment,
    getCrisisResources,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/**
 * Hook to use session context
 */
export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);

  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }

  return context;
}
