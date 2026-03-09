/**
 * Spread Layout Component
 * Positions tarot cards based on spread type
 * Supports 1-card, 3-card, 7-card, and celtic-cross spreads
 */

'use client';

import React from 'react';
import { TarotCard, TarotCardPlaceholder } from './TarotCard';
import type { DrawnCard, SpreadType } from '@tarot/shared';

interface SpreadLayoutProps {
  spreadType: SpreadType;
  cards: DrawnCard[];
  isLoading?: boolean;
  autoFlip?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function SpreadLayout({
  spreadType,
  cards,
  isLoading = false,
  autoFlip = true,
  size = 'medium',
}: SpreadLayoutProps) {
  if (isLoading) {
    return <SpreadPlaceholder spreadType={spreadType} size={size} />;
  }

  const renderLayout = () => {
    switch (spreadType) {
      case '1-card':
        return <SingleCardLayout cards={cards} autoFlip={autoFlip} size={size} />;
      case '3-card':
        return <ThreeCardLayout cards={cards} autoFlip={autoFlip} size={size} />;
      case '7-card':
        return <SevenCardLayout cards={cards} autoFlip={autoFlip} size={size} />;
      case 'celtic-cross':
        return <CelticCrossLayout cards={cards} autoFlip={autoFlip} size={size} />;
      default:
        return <div>Unknown spread type</div>;
    }
  };

  return (
    <div className="spread-layout">
      <div className="spread-header">
        <h2 className="spread-title">{getSpreadName(spreadType)}</h2>
        <p className="spread-description">{getSpreadDescription(spreadType)}</p>
      </div>

      <div className="spread-container">{renderLayout()}</div>

      <style jsx>{`
        .spread-layout {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
        }

        .spread-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .spread-title {
          font-size: 28px;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 8px 0;
        }

        .spread-description {
          font-size: 16px;
          color: #6b7280;
          margin: 0;
        }

        .spread-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
        }

        @media (max-width: 768px) {
          .spread-title {
            font-size: 24px;
          }

          .spread-description {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}

// ==========================================
// Layout Components
// ==========================================

interface LayoutProps {
  cards: DrawnCard[];
  autoFlip: boolean;
  size: 'small' | 'medium' | 'large';
}

function SingleCardLayout({ cards, autoFlip, size }: LayoutProps) {
  if (cards.length === 0) return null;

  return (
    <div className="single-card-layout">
      <TarotCard card={cards[0]} autoFlip={autoFlip} flipDelay={300} size={size} />

      <style jsx>{`
        .single-card-layout {
          display: flex;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}

function ThreeCardLayout({ cards, autoFlip, size }: LayoutProps) {
  if (cards.length < 3) return null;

  const positions = ['Past', 'Present', 'Future'];

  return (
    <div className="three-card-layout">
      {cards.map((card, index) => (
        <div key={card.card_id} className="card-slot">
          <div className="position-label">{positions[index]}</div>
          <TarotCard
            card={card}
            autoFlip={autoFlip}
            flipDelay={300 + index * 400}
            size={size}
          />
        </div>
      ))}

      <style jsx>{`
        .three-card-layout {
          display: flex;
          gap: 24px;
          justify-content: center;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .card-slot {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
        }

        .position-label {
          font-size: 14px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        @media (max-width: 640px) {
          .three-card-layout {
            gap: 16px;
          }

          .position-label {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}

function SevenCardLayout({ cards, autoFlip, size }: LayoutProps) {
  if (cards.length < 7) return null;

  const positions = [
    'Self',
    'Challenge',
    'Past',
    'Future',
    'Strengths',
    'External',
    'Outcome',
  ];

  return (
    <div className="seven-card-layout">
      <div className="row row-top">
        {cards.slice(0, 3).map((card, index) => (
          <div key={card.card_id} className="card-slot">
            <div className="position-label">{positions[index]}</div>
            <TarotCard
              card={card}
              autoFlip={autoFlip}
              flipDelay={300 + index * 300}
              size={size}
            />
          </div>
        ))}
      </div>

      <div className="row row-middle">
        <div className="card-slot center-card">
          <div className="position-label">{positions[3]}</div>
          <TarotCard
            card={cards[3]}
            autoFlip={autoFlip}
            flipDelay={300 + 3 * 300}
            size={size}
          />
        </div>
      </div>

      <div className="row row-bottom">
        {cards.slice(4, 7).map((card, index) => (
          <div key={card.card_id} className="card-slot">
            <div className="position-label">{positions[4 + index]}</div>
            <TarotCard
              card={card}
              autoFlip={autoFlip}
              flipDelay={300 + (4 + index) * 300}
              size={size}
            />
          </div>
        ))}
      </div>

      <style jsx>{`
        .seven-card-layout {
          display: flex;
          flex-direction: column;
          gap: 24px;
          align-items: center;
        }

        .row {
          display: flex;
          gap: 20px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .row-middle {
          padding: 0 40px;
        }

        .card-slot {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
        }

        .position-label {
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        @media (max-width: 768px) {
          .row {
            gap: 12px;
          }

          .position-label {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
}

function CelticCrossLayout({ cards, autoFlip, size }: LayoutProps) {
  if (cards.length < 10) return null;

  const positions = [
    'Present',
    'Challenge',
    'Foundation',
    'Past',
    'Crown',
    'Future',
    'Self',
    'Environment',
    'Hopes/Fears',
    'Outcome',
  ];

  return (
    <div className="celtic-cross-layout">
      <div className="cross-section">
        <div className="cross-center">
          <TarotCard card={cards[0]} autoFlip={autoFlip} flipDelay={300} size="small" />
          <div className="crossing-card">
            <TarotCard card={cards[1]} autoFlip={autoFlip} flipDelay={600} size="small" />
          </div>
        </div>

        <div className="cross-top">
          <div className="position-label">{positions[4]}</div>
          <TarotCard card={cards[4]} autoFlip={autoFlip} flipDelay={1200} size="small" />
        </div>

        <div className="cross-bottom">
          <div className="position-label">{positions[2]}</div>
          <TarotCard card={cards[2]} autoFlip={autoFlip} flipDelay={900} size="small" />
        </div>

        <div className="cross-left">
          <div className="position-label">{positions[3]}</div>
          <TarotCard card={cards[3]} autoFlip={autoFlip} flipDelay={1500} size="small" />
        </div>

        <div className="cross-right">
          <div className="position-label">{positions[5]}</div>
          <TarotCard card={cards[5]} autoFlip={autoFlip} flipDelay={1800} size="small" />
        </div>
      </div>

      <div className="staff-section">
        {cards.slice(6, 10).map((card, index) => (
          <div key={card.card_id} className="staff-card">
            <div className="position-label">{positions[6 + index]}</div>
            <TarotCard
              card={card}
              autoFlip={autoFlip}
              flipDelay={2100 + index * 300}
              size="small"
            />
          </div>
        ))}
      </div>

      <style jsx>{`
        .celtic-cross-layout {
          display: flex;
          gap: 48px;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
        }

        .cross-section {
          position: relative;
          width: 400px;
          height: 400px;
        }

        .cross-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .crossing-card {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(90deg);
        }

        .cross-top,
        .cross-bottom,
        .cross-left,
        .cross-right {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .cross-top {
          top: 0;
          left: 50%;
          transform: translateX(-50%);
        }

        .cross-bottom {
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
        }

        .cross-left {
          left: 0;
          top: 50%;
          transform: translateY(-50%);
        }

        .cross-right {
          right: 0;
          top: 50%;
          transform: translateY(-50%);
        }

        .staff-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .staff-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;
        }

        .position-label {
          font-size: 11px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        @media (max-width: 1024px) {
          .celtic-cross-layout {
            flex-direction: column;
            gap: 32px;
          }

          .cross-section {
            width: 320px;
            height: 320px;
          }
        }
      `}</style>
    </div>
  );
}

// ==========================================
// Placeholder Component
// ==========================================

function SpreadPlaceholder({
  spreadType,
  size,
}: {
  spreadType: SpreadType;
  size: 'small' | 'medium' | 'large';
}) {
  const getCardCount = (type: SpreadType): number => {
    switch (type) {
      case '1-card':
        return 1;
      case '3-card':
        return 3;
      case '7-card':
        return 7;
      case 'celtic-cross':
        return 10;
      default:
        return 1;
    }
  };

  const cardCount = getCardCount(spreadType);

  return (
    <div className="spread-placeholder">
      {Array.from({ length: cardCount }).map((_, index) => (
        <TarotCardPlaceholder key={index} size={size} />
      ))}

      <style jsx>{`
        .spread-placeholder {
          display: flex;
          gap: 20px;
          justify-content: center;
          flex-wrap: wrap;
        }
      `}</style>
    </div>
  );
}

// ==========================================
// Utility Functions
// ==========================================

function getSpreadName(spreadType: SpreadType): string {
  switch (spreadType) {
    case '1-card':
      return 'Single Card Reading';
    case '3-card':
      return 'Three Card Spread';
    case '7-card':
      return 'Seven Card Spread';
    case 'celtic-cross':
      return 'Celtic Cross Spread';
    default:
      return 'Tarot Reading';
  }
}

function getSpreadDescription(spreadType: SpreadType): string {
  switch (spreadType) {
    case '1-card':
      return 'A focused answer to your question';
    case '3-card':
      return 'Past, Present, and Future guidance';
    case '7-card':
      return 'Comprehensive insight into your situation';
    case 'celtic-cross':
      return 'Deep dive into your question with complete context';
    default:
      return '';
  }
}
