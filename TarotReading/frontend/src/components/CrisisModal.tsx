/**
 * Crisis Modal Component
 * Displays mental health hotlines and resources when crisis is detected
 */

'use client';

import React, { useEffect, useRef } from 'react';
import type { CrisisResources } from '@tarot/shared';

interface CrisisModalProps {
  isOpen: boolean;
  resources: CrisisResources | null;
  onClose: () => void;
}

export function CrisisModal({ isOpen, resources, onClose }: CrisisModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen || !resources) return null;

  return (
    <div
      className="crisis-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="crisis-modal-title"
    >
      <div className="crisis-modal" ref={modalRef}>
        <button
          className="close-button"
          onClick={onClose}
          aria-label="Close crisis resources"
        >
          ×
        </button>

        <div className="modal-header">
          <div className="header-icon">🫂</div>
          <h2 id="crisis-modal-title" className="modal-title">
            You're Not Alone
          </h2>
          <p className="modal-subtitle">
            If you're experiencing distress, these resources can help
          </p>
        </div>

        <div className="modal-body">
          <div className="hotlines-section">
            <h3 className="section-title">Crisis Hotlines</h3>
            <div className="hotlines-list">
              {resources.hotlines.map((hotline, index) => (
                <div key={index} className="hotline-card">
                  <div className="hotline-name">{hotline.name}</div>
                  <a href={`tel:${hotline.phone}`} className="hotline-phone">
                    📞 {hotline.phone}
                  </a>
                  {hotline.available_hours && (
                    <div className="hotline-hours">
                      <span className="hours-icon">🕐</span>
                      {hotline.available_hours}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {resources.website_url && (
            <div className="website-section">
              <a
                href={resources.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="website-link"
              >
                <span>🌐</span>
                More Resources Online
                <span className="external-icon">↗</span>
              </a>
            </div>
          )}

          <div className="disclaimer">
            <p>
              <strong>Important:</strong> This app provides support and reflection, but
              is not a substitute for professional mental health care. If you're in
              immediate danger, please call emergency services or go to your nearest
              emergency room.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="secondary-button" onClick={onClose}>
            I understand
          </button>
        </div>
      </div>

      <style jsx>{`
        .crisis-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: fadeIn 0.3s ease-out;
          backdrop-filter: blur(4px);
        }

        .crisis-modal {
          background: white;
          border-radius: 20px;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.4s ease-out;
          position: relative;
        }

        .close-button {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 40px;
          height: 40px;
          border: none;
          background: #f3f4f6;
          border-radius: 50%;
          font-size: 28px;
          line-height: 1;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
          z-index: 10;
        }

        .close-button:hover {
          background: #e5e7eb;
          color: #374151;
          transform: scale(1.1);
        }

        .modal-header {
          padding: 40px 40px 24px 40px;
          text-align: center;
          background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
        }

        .header-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .modal-title {
          font-size: 28px;
          font-weight: 700;
          color: #78350f;
          margin: 0 0 8px 0;
        }

        .modal-subtitle {
          font-size: 16px;
          color: #92400e;
          margin: 0;
        }

        .modal-body {
          padding: 32px 40px;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 16px 0;
        }

        .hotlines-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }

        .hotline-card {
          padding: 20px;
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          transition: all 0.2s;
        }

        .hotline-card:hover {
          background: white;
          border-color: #8b5cf6;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);
        }

        .hotline-name {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
        }

        .hotline-phone {
          display: inline-block;
          font-size: 20px;
          font-weight: 600;
          color: #8b5cf6;
          text-decoration: none;
          margin-bottom: 8px;
          transition: color 0.2s;
        }

        .hotline-phone:hover {
          color: #7c3aed;
        }

        .hotline-hours {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: #6b7280;
          margin-top: 8px;
        }

        .hours-icon {
          font-size: 16px;
        }

        .website-section {
          margin-bottom: 24px;
        }

        .website-link {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 16px 24px;
          background: #ede9fe;
          border: 2px solid #8b5cf6;
          border-radius: 12px;
          color: #6d28d9;
          font-size: 16px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
        }

        .website-link:hover {
          background: #ddd6fe;
          transform: translateY(-2px);
        }

        .external-icon {
          font-size: 18px;
        }

        .disclaimer {
          padding: 16px;
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          border-radius: 8px;
        }

        .disclaimer p {
          font-size: 13px;
          line-height: 1.6;
          color: #78350f;
          margin: 0;
        }

        .disclaimer strong {
          color: #92400e;
        }

        .modal-footer {
          padding: 20px 40px 40px 40px;
          display: flex;
          justify-content: center;
        }

        .secondary-button {
          padding: 12px 32px;
          background: #8b5cf6;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .secondary-button:hover {
          background: #7c3aed;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 640px) {
          .modal-header {
            padding: 32px 24px 20px 24px;
          }

          .header-icon {
            font-size: 48px;
          }

          .modal-title {
            font-size: 24px;
          }

          .modal-subtitle {
            font-size: 14px;
          }

          .modal-body {
            padding: 24px;
          }

          .modal-footer {
            padding: 16px 24px 32px 24px;
          }

          .hotline-phone {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
}
