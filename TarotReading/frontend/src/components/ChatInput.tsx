/**
 * Chat Input Component
 * Textarea for user input with submit button and loading state
 * Shows sentiment preview after input analysis
 */

'use client';

import React, { useState, FormEvent } from 'react';
import { useSession } from '../contexts/SessionContext';
import type { Sentiment } from '@tarot/shared';

interface ChatInputProps {
  onSubmit: (input: string) => void | Promise<void>;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}

export function ChatInput({
  onSubmit,
  placeholder = 'Share what\'s on your mind...',
  maxLength = 2000,
  disabled = false,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getSentiment, isLoading } = useSession();

  const sentiment = getSentiment();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isSubmitting || disabled) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(input.trim());
      setInput(''); // Clear input after successful submit
    } catch (err) {
      console.error('Failed to submit input:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = disabled || isLoading || isSubmitting;
  const charCount = input.length;
  const isNearLimit = charCount > maxLength * 0.9;

  return (
    <div className="chat-input-container">
      <form onSubmit={handleSubmit} className="chat-input-form">
        <div className="input-wrapper">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={isDisabled}
            className="chat-textarea"
            rows={4}
            aria-label="Chat input"
          />

          <div className="input-footer">
            <div className="char-counter">
              <span className={isNearLimit ? 'text-warning' : ''}>
                {charCount} / {maxLength}
              </span>
            </div>

            <button
              type="submit"
              disabled={!input.trim() || isDisabled}
              className="submit-button"
              aria-label="Submit message"
            >
              {isSubmitting || isLoading ? 'Sending...' : 'Share'}
            </button>
          </div>
        </div>
      </form>

      {sentiment && <SentimentPreview sentiment={sentiment} />}

      <style jsx>{`
        .chat-input-container {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
        }

        .chat-input-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .input-wrapper {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
          transition: border-color 0.2s;
        }

        .input-wrapper:focus-within {
          border-color: #8b5cf6;
        }

        .chat-textarea {
          width: 100%;
          min-height: 100px;
          padding: 0;
          border: none;
          font-size: 16px;
          line-height: 1.5;
          resize: vertical;
          outline: none;
          font-family: inherit;
        }

        .chat-textarea::placeholder {
          color: #9ca3af;
        }

        .chat-textarea:disabled {
          background: transparent;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .input-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 8px;
          border-top: 1px solid #f3f4f6;
        }

        .char-counter {
          font-size: 14px;
          color: #6b7280;
        }

        .char-counter .text-warning {
          color: #f59e0b;
          font-weight: 500;
        }

        .submit-button {
          padding: 10px 24px;
          background: #8b5cf6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .submit-button:hover:not(:disabled) {
          background: #7c3aed;
          transform: translateY(-1px);
        }

        .submit-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-button:disabled {
          background: #d1d5db;
          cursor: not-allowed;
          transform: none;
        }

        @media (max-width: 640px) {
          .chat-textarea {
            font-size: 14px;
          }

          .submit-button {
            padding: 8px 20px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Sentiment Preview Component
 * Shows sentiment analysis result
 */
interface SentimentPreviewProps {
  sentiment: Sentiment;
}

function SentimentPreview({ sentiment }: SentimentPreviewProps) {
  const getSentimentColor = (label: string): string => {
    switch (label) {
      case 'positive':
        return '#10b981';
      case 'neutral':
        return '#6b7280';
      case 'negative':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getSentimentEmoji = (label: string): string => {
    switch (label) {
      case 'positive':
        return '😊';
      case 'neutral':
        return '😐';
      case 'negative':
        return '😔';
      default:
        return '😐';
    }
  };

  const color = getSentimentColor(sentiment.label);
  const emoji = getSentimentEmoji(sentiment.label);

  return (
    <div className="sentiment-preview" style={{ borderLeftColor: color }}>
      <div className="sentiment-header">
        <span className="sentiment-emoji">{emoji}</span>
        <span className="sentiment-label" style={{ color }}>
          {sentiment.label.charAt(0).toUpperCase() + sentiment.label.slice(1)} sentiment
        </span>
      </div>

      {sentiment.crisis_level !== 'none' && (
        <div className="crisis-indicator">
          ⚠️ Crisis support resources available
        </div>
      )}

      <style jsx>{`
        .sentiment-preview {
          margin-top: 12px;
          padding: 12px 16px;
          background: #f9fafb;
          border-left: 4px solid;
          border-radius: 8px;
          animation: slideIn 0.3s ease-out;
        }

        .sentiment-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .sentiment-emoji {
          font-size: 18px;
        }

        .sentiment-label {
          font-weight: 500;
        }

        .crisis-indicator {
          margin-top: 8px;
          padding: 8px 12px;
          background: #fef3c7;
          border-radius: 6px;
          font-size: 13px;
          color: #92400e;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
