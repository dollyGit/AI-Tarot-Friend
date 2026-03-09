/**
 * Tarot Card Component
 * Displays a tarot card with name, orientation, and meaning
 * Includes flip animation for card reveal
 */

'use client';

import React, { useState } from 'react';
import type { DrawnCard, Orientation } from '@tarot/shared';

interface TarotCardProps {
  card: DrawnCard;
  autoFlip?: boolean;
  flipDelay?: number;
  size?: 'small' | 'medium' | 'large';
  showMeaning?: boolean;
  onClick?: () => void;
}

export function TarotCard({
  card,
  autoFlip = false,
  flipDelay = 500,
  size = 'medium',
  showMeaning = true,
  onClick,
}: TarotCardProps) {
  const [isFlipped, setIsFlipped] = useState(!autoFlip);

  React.useEffect(() => {
    if (autoFlip) {
      const timer = setTimeout(() => {
        setIsFlipped(true);
      }, flipDelay);

      return () => clearTimeout(timer);
    }
  }, [autoFlip, flipDelay]);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setIsFlipped(!isFlipped);
    }
  };

  const isReversed = card.orientation === 'reversed';

  return (
    <div className={`tarot-card-container size-${size}`}>
      <div
        className={`tarot-card ${isFlipped ? 'flipped' : ''} ${isReversed ? 'reversed' : ''}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick();
          }
        }}
        aria-label={`${card.name} - ${card.orientation}`}
      >
        {/* Card Back */}
        <div className="card-face card-back">
          <div className="card-pattern">
            <div className="pattern-circle" />
            <div className="pattern-cross" />
          </div>
        </div>

        {/* Card Front */}
        <div className="card-face card-front">
          <div className="card-content">
            <div className="card-header">
              <h3 className="card-name">{card.name}</h3>
              <span className="card-orientation">
                {isReversed && '⤵ '}
                {card.orientation}
              </span>
            </div>

            {showMeaning && (
              <div className="card-meaning">
                <p>{card.meaning}</p>
              </div>
            )}

            <div className="card-position">
              Position {card.position}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .tarot-card-container {
          perspective: 1000px;
          cursor: pointer;
        }

        .tarot-card-container.size-small {
          width: 120px;
          height: 200px;
        }

        .tarot-card-container.size-medium {
          width: 180px;
          height: 300px;
        }

        .tarot-card-container.size-large {
          width: 240px;
          height: 400px;
        }

        .tarot-card {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1);
        }

        .tarot-card.flipped {
          transform: rotateY(180deg);
        }

        .tarot-card.flipped.reversed {
          transform: rotateY(180deg) rotate(180deg);
        }

        .tarot-card:hover {
          transform: translateY(-4px) scale(1.02);
        }

        .tarot-card.flipped:hover {
          transform: rotateY(180deg) translateY(-4px) scale(1.02);
        }

        .tarot-card.flipped.reversed:hover {
          transform: rotateY(180deg) rotate(180deg) translateY(-4px) scale(1.02);
        }

        .card-face {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .card-back {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-pattern {
          position: relative;
          width: 80%;
          height: 80%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pattern-circle {
          position: absolute;
          width: 60%;
          height: 60%;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
        }

        .pattern-cross {
          position: absolute;
          width: 40%;
          height: 40%;
          background: linear-gradient(to right, transparent 45%, rgba(255, 255, 255, 0.3) 45%, rgba(255, 255, 255, 0.3) 55%, transparent 55%),
                      linear-gradient(to bottom, transparent 45%, rgba(255, 255, 255, 0.3) 45%, rgba(255, 255, 255, 0.3) 55%, transparent 55%);
        }

        .card-front {
          background: linear-gradient(to bottom, #fdfbfb 0%, #ebedee 100%);
          transform: rotateY(180deg);
        }

        .card-content {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 20px;
        }

        .card-header {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        .card-name {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .size-small .card-name {
          font-size: 14px;
        }

        .size-large .card-name {
          font-size: 22px;
        }

        .card-orientation {
          font-size: 12px;
          font-weight: 500;
          color: #6b7280;
          text-transform: capitalize;
        }

        .card-meaning {
          flex: 1;
          font-size: 14px;
          line-height: 1.6;
          color: #4b5563;
          overflow-y: auto;
        }

        .size-small .card-meaning {
          font-size: 11px;
        }

        .size-large .card-meaning {
          font-size: 16px;
        }

        .card-meaning p {
          margin: 0;
        }

        .card-position {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #9ca3af;
          text-align: center;
        }

        @media (max-width: 640px) {
          .tarot-card-container.size-medium {
            width: 140px;
            height: 240px;
          }

          .tarot-card-container.size-large {
            width: 180px;
            height: 300px;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Card Placeholder
 * Shown while cards are loading
 */
export function TarotCardPlaceholder({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
  return (
    <div className={`tarot-card-placeholder size-${size}`}>
      <div className="placeholder-shimmer" />

      <style jsx>{`
        .tarot-card-placeholder {
          background: #e5e7eb;
          border-radius: 12px;
          position: relative;
          overflow: hidden;
        }

        .tarot-card-placeholder.size-small {
          width: 120px;
          height: 200px;
        }

        .tarot-card-placeholder.size-medium {
          width: 180px;
          height: 300px;
        }

        .tarot-card-placeholder.size-large {
          width: 240px;
          height: 400px;
        }

        .placeholder-shimmer {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.3) 50%,
            transparent 100%
          );
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }
      `}</style>
    </div>
  );
}
