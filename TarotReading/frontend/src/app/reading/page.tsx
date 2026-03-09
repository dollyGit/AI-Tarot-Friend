/**
 * Reading Page
 * Main user flow: input → session → reading → interpretation
 */

'use client';

import React, { useState } from 'react';
import { useSession } from '../../contexts/SessionContext';
import { apiClient } from '../../services/api-client';
import { ChatInput } from '../../components/ChatInput';
import { SpreadLayout } from '../../components/SpreadLayout';
import { InterpretationDisplay } from '../../components/InterpretationDisplay';
import { CrisisModal } from '../../components/CrisisModal';
import type { Reading, SpreadType, CreateReadingRequest } from '@tarot/shared';

type ReadingState = 'input' | 'selecting-spread' | 'drawing' | 'complete';

export default function ReadingPage() {
  const { currentSession, createSession, getCrisisResources } = useSession();
  const [state, setState] = useState<ReadingState>('input');
  const [selectedSpread, setSelectedSpread] = useState<SpreadType | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCrisisModal, setShowCrisisModal] = useState(false);

  /**
   * Handle user input submission
   * Creates session with sentiment analysis
   */
  const handleInputSubmit = async (input: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const session = await createSession('web', input);

      // Check for crisis resources
      const crisisResources = getCrisisResources();
      if (crisisResources) {
        setShowCrisisModal(true);
      }

      // Move to spread selection
      setState('selecting-spread');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle spread selection
   * Draws cards and generates interpretation
   */
  const handleSpreadSelect = async (spreadType: SpreadType) => {
    if (!currentSession) {
      setError('No active session');
      return;
    }

    setSelectedSpread(spreadType);
    setState('drawing');
    setIsLoading(true);
    setError(null);

    try {
      const request: CreateReadingRequest = {
        session_id: currentSession.id,
        spread_type: spreadType,
        context: '', // Could add context field to session
      };

      const newReading = await apiClient.createReading(request);
      setReading(newReading);
      setState('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reading');
      setState('selecting-spread'); // Go back to spread selection
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Start new reading
   */
  const handleNewReading = () => {
    setState('input');
    setSelectedSpread(null);
    setReading(null);
    setError(null);
  };

  const crisisResources = getCrisisResources();

  return (
    <div className="reading-page">
      <div className="page-container">
        {/* Header */}
        <header className="page-header">
          <h1 className="page-title">AI Tarot Friend</h1>
          <p className="page-subtitle">
            Your compassionate companion for reflection and guidance
          </p>
        </header>

        {/* Error Display */}
        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
            <button onClick={() => setError(null)} className="dismiss-button">
              ×
            </button>
          </div>
        )}

        {/* Main Content */}
        <main className="page-content">
          {state === 'input' && (
            <div className="input-stage">
              <ChatInput
                onSubmit={handleInputSubmit}
                placeholder="Share what's on your mind... What would you like guidance on today?"
                disabled={isLoading}
              />
            </div>
          )}

          {state === 'selecting-spread' && (
            <div className="spread-selection-stage">
              <h2 className="stage-title">Choose Your Spread</h2>
              <p className="stage-description">
                Select a spread type based on the depth of insight you seek
              </p>

              <div className="spread-options">
                <SpreadOption
                  type="1-card"
                  title="Single Card"
                  description="Quick, focused guidance"
                  duration="1-2 min"
                  isPremium={false}
                  onSelect={handleSpreadSelect}
                />

                <SpreadOption
                  type="3-card"
                  title="Three Card"
                  description="Past, Present, Future"
                  duration="3-5 min"
                  isPremium={false}
                  onSelect={handleSpreadSelect}
                />

                <SpreadOption
                  type="7-card"
                  title="Seven Card"
                  description="Comprehensive insight"
                  duration="8-10 min"
                  isPremium={true}
                  onSelect={handleSpreadSelect}
                />

                <SpreadOption
                  type="celtic-cross"
                  title="Celtic Cross"
                  description="Deep, detailed analysis"
                  duration="10-15 min"
                  isPremium={true}
                  onSelect={handleSpreadSelect}
                />
              </div>
            </div>
          )}

          {state === 'drawing' && selectedSpread && (
            <div className="drawing-stage">
              <h2 className="stage-title">Drawing Your Cards...</h2>
              <SpreadLayout
                spreadType={selectedSpread}
                cards={[]}
                isLoading={true}
                size="medium"
              />
            </div>
          )}

          {state === 'complete' && reading && (
            <div className="complete-stage">
              <SpreadLayout
                spreadType={reading.spread_type}
                cards={reading.cards}
                isLoading={false}
                autoFlip={true}
                size="medium"
              />

              <div className="interpretation-section">
                <InterpretationDisplay
                  interpretation={reading.interpretation}
                  isLoading={false}
                />
              </div>

              <div className="actions-section">
                <button className="new-reading-button" onClick={handleNewReading}>
                  Start New Reading
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Crisis Modal */}
        <CrisisModal
          isOpen={showCrisisModal}
          resources={crisisResources}
          onClose={() => setShowCrisisModal(false)}
        />
      </div>

      <style jsx>{`
        .reading-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }

        .page-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .page-header {
          text-align: center;
          margin-bottom: 48px;
        }

        .page-title {
          font-size: 48px;
          font-weight: 800;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 12px 0;
        }

        .page-subtitle {
          font-size: 18px;
          color: #6b7280;
          margin: 0;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: #fef2f2;
          border: 2px solid #ef4444;
          border-radius: 12px;
          margin-bottom: 24px;
          animation: slideDown 0.3s ease-out;
        }

        .error-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .error-banner p {
          flex: 1;
          color: #991b1b;
          margin: 0;
        }

        .dismiss-button {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          font-size: 28px;
          color: #ef4444;
          cursor: pointer;
          flex-shrink: 0;
        }

        .page-content {
          max-width: 1200px;
          margin: 0 auto;
        }

        .input-stage,
        .spread-selection-stage,
        .drawing-stage,
        .complete-stage {
          animation: fadeIn 0.5s ease-out;
        }

        .stage-title {
          font-size: 32px;
          font-weight: 700;
          color: #1f2937;
          text-align: center;
          margin: 0 0 12px 0;
        }

        .stage-description {
          font-size: 16px;
          color: #6b7280;
          text-align: center;
          margin: 0 0 32px 0;
        }

        .spread-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          max-width: 900px;
          margin: 0 auto;
        }

        .interpretation-section {
          margin-top: 48px;
        }

        .actions-section {
          margin-top: 32px;
          display: flex;
          justify-content: center;
        }

        .new-reading-button {
          padding: 14px 32px;
          background: #8b5cf6;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .new-reading-button:hover {
          background: #7c3aed;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(139, 92, 246, 0.4);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 768px) {
          .page-container {
            padding: 24px 16px;
          }

          .page-title {
            font-size: 36px;
          }

          .page-subtitle {
            font-size: 16px;
          }

          .stage-title {
            font-size: 28px;
          }

          .spread-options {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

// ==========================================
// Spread Option Component
// ==========================================

interface SpreadOptionProps {
  type: SpreadType;
  title: string;
  description: string;
  duration: string;
  isPremium: boolean;
  onSelect: (type: SpreadType) => void;
}

function SpreadOption({
  type,
  title,
  description,
  duration,
  isPremium,
  onSelect,
}: SpreadOptionProps) {
  return (
    <button className="spread-option" onClick={() => onSelect(type)}>
      <div className="option-header">
        <h3 className="option-title">{title}</h3>
        {isPremium && <span className="premium-badge">Premium</span>}
      </div>

      <p className="option-description">{description}</p>

      <div className="option-footer">
        <span className="duration">⏱ {duration}</span>
      </div>

      <style jsx>{`
        .spread-option {
          padding: 24px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 16px;
          text-align: left;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .spread-option:hover {
          border-color: #8b5cf6;
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(139, 92, 246, 0.2);
        }

        .option-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .option-title {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .premium-badge {
          padding: 4px 12px;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: white;
          font-size: 12px;
          font-weight: 600;
          border-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .option-description {
          font-size: 14px;
          color: #6b7280;
          margin: 0 0 16px 0;
          line-height: 1.5;
        }

        .option-footer {
          display: flex;
          justify-content: flex-end;
        }

        .duration {
          font-size: 13px;
          color: #9ca3af;
        }
      `}</style>
    </button>
  );
}
