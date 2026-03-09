/**
 * Interpretation Display Component
 * Shows tarot reading interpretation with TL;DR, key points, advice, and warnings
 */

'use client';

import React, { useState } from 'react';
import type { Interpretation } from '@tarot/shared';

interface InterpretationDisplayProps {
  interpretation: Interpretation;
  isLoading?: boolean;
}

export function InterpretationDisplay({
  interpretation,
  isLoading = false,
}: InterpretationDisplayProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  if (isLoading) {
    return <InterpretationPlaceholder />;
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="interpretation-display">
      {/* TL;DR Section */}
      <div className="tldr-section">
        <div className="section-icon">✨</div>
        <h3 className="section-title">Your Reading</h3>
        <p className="tldr-text">{interpretation.tldr}</p>
      </div>

      {/* Key Points Section */}
      <div className="key-points-section">
        <h4 className="subsection-title">
          <span className="icon">🔑</span>
          Key Insights
        </h4>
        <ul className="key-points-list">
          {interpretation.key_points.map((point, index) => (
            <li key={index} className="key-point" style={{ animationDelay: `${index * 100}ms` }}>
              <span className="point-number">{index + 1}</span>
              <span className="point-text">{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Advice Section */}
      <div className="advice-section">
        <h4 className="subsection-title">
          <span className="icon">💫</span>
          Guidance & Next Steps
        </h4>

        <div className="advice-timeline">
          <AdviceCard
            title="Short Term"
            subtitle="This Week"
            content={interpretation.advice.short_term}
            color="#10b981"
            isExpanded={expandedSection === 'short'}
            onToggle={() => toggleSection('short')}
          />

          <AdviceCard
            title="Medium Term"
            subtitle="This Month"
            content={interpretation.advice.medium_term}
            color="#3b82f6"
            isExpanded={expandedSection === 'medium'}
            onToggle={() => toggleSection('medium')}
          />

          <AdviceCard
            title="Long Term"
            subtitle="Coming Months"
            content={interpretation.advice.long_term}
            color="#8b5cf6"
            isExpanded={expandedSection === 'long'}
            onToggle={() => toggleSection('long')}
          />
        </div>
      </div>

      {/* Warnings Section */}
      {interpretation.warnings && (
        <div className="warnings-section">
          <div className="warning-icon">⚠️</div>
          <div className="warning-content">
            <h4 className="warning-title">Things to Consider</h4>
            <p className="warning-text">{interpretation.warnings}</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .interpretation-display {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .tldr-section {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 32px;
          border-radius: 16px;
          text-align: center;
          box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
        }

        .section-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .section-title {
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 16px 0;
        }

        .tldr-text {
          font-size: 18px;
          line-height: 1.6;
          margin: 0;
          opacity: 0.95;
        }

        .key-points-section,
        .advice-section,
        .warnings-section {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .subsection-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 20px 0;
        }

        .subsection-title .icon {
          font-size: 24px;
        }

        .key-points-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .key-point {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
          animation: slideInLeft 0.4s ease-out;
          animation-fill-mode: both;
        }

        .point-number {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: #8b5cf6;
          color: white;
          border-radius: 50%;
          font-weight: 600;
          font-size: 14px;
          flex-shrink: 0;
        }

        .point-text {
          flex: 1;
          font-size: 16px;
          line-height: 1.6;
          color: #374151;
        }

        .advice-timeline {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .warnings-section {
          display: flex;
          gap: 16px;
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
        }

        .warning-icon {
          font-size: 32px;
          flex-shrink: 0;
        }

        .warning-content {
          flex: 1;
        }

        .warning-title {
          font-size: 18px;
          font-weight: 600;
          color: #92400e;
          margin: 0 0 8px 0;
        }

        .warning-text {
          font-size: 15px;
          line-height: 1.6;
          color: #78350f;
          margin: 0;
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @media (max-width: 640px) {
          .tldr-section {
            padding: 24px;
          }

          .section-icon {
            font-size: 36px;
          }

          .section-title {
            font-size: 20px;
          }

          .tldr-text {
            font-size: 16px;
          }

          .key-points-section,
          .advice-section,
          .warnings-section {
            padding: 20px;
          }

          .subsection-title {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
}

// ==========================================
// Advice Card Component
// ==========================================

interface AdviceCardProps {
  title: string;
  subtitle: string;
  content: string;
  color: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function AdviceCard({ title, subtitle, content, color, isExpanded, onToggle }: AdviceCardProps) {
  return (
    <div className="advice-card" style={{ borderLeftColor: color }}>
      <button className="advice-header" onClick={onToggle} aria-expanded={isExpanded}>
        <div className="advice-title-group">
          <span className="advice-dot" style={{ background: color }} />
          <div>
            <h5 className="advice-title">{title}</h5>
            <p className="advice-subtitle">{subtitle}</p>
          </div>
        </div>
        <span className="expand-icon">{isExpanded ? '−' : '+'}</span>
      </button>

      {isExpanded && (
        <div className="advice-content">
          <p>{content}</p>
        </div>
      )}

      <style jsx>{`
        .advice-card {
          background: #f9fafb;
          border-left: 4px solid;
          border-radius: 8px;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .advice-card:hover {
          background: #f3f4f6;
        }

        .advice-header {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
        }

        .advice-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .advice-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .advice-title {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .advice-subtitle {
          font-size: 13px;
          color: #6b7280;
          margin: 4px 0 0 0;
        }

        .expand-icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: white;
          color: #6b7280;
          font-size: 20px;
          font-weight: 400;
          flex-shrink: 0;
        }

        .advice-content {
          padding: 0 16px 16px 16px;
          animation: slideDown 0.3s ease-out;
        }

        .advice-content p {
          font-size: 15px;
          line-height: 1.6;
          color: #374151;
          margin: 0;
          padding-left: 24px;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 200px;
          }
        }
      `}</style>
    </div>
  );
}

// ==========================================
// Placeholder Component
// ==========================================

function InterpretationPlaceholder() {
  return (
    <div className="interpretation-placeholder">
      <div className="placeholder-section tldr">
        <div className="shimmer" />
      </div>

      <div className="placeholder-section key-points">
        <div className="shimmer" />
      </div>

      <div className="placeholder-section advice">
        <div className="shimmer" />
      </div>

      <style jsx>{`
        .interpretation-placeholder {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .placeholder-section {
          position: relative;
          overflow: hidden;
          border-radius: 12px;
          background: #e5e7eb;
        }

        .placeholder-section.tldr {
          height: 200px;
        }

        .placeholder-section.key-points {
          height: 250px;
        }

        .placeholder-section.advice {
          height: 300px;
        }

        .shimmer {
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
