/**
 * Home Page
 * Landing page with link to start reading
 */

'use client';

import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="home-page">
      <div className="container">
        <div className="hero-section">
          <h1 className="hero-title">
            Welcome to
            <br />
            <span className="gradient-text">AI Tarot Friend</span>
          </h1>

          <p className="hero-description">
            Your compassionate companion for reflection and guidance.
            <br />
            Find clarity, explore possibilities, and discover insights through the wisdom of
            tarot.
          </p>

          <Link href="/reading" className="cta-button">
            Start Your Reading
          </Link>

          <div className="features">
            <div className="feature">
              <span className="feature-icon">🔮</span>
              <span className="feature-text">Personalized Readings</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🫂</span>
              <span className="feature-text">Empathetic Guidance</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🌟</span>
              <span className="feature-text">Multiple Spread Types</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .home-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }

        .container {
          max-width: 800px;
          width: 100%;
        }

        .hero-section {
          text-align: center;
          color: white;
        }

        .hero-title {
          font-size: 56px;
          font-weight: 800;
          margin: 0 0 24px 0;
          line-height: 1.2;
        }

        .gradient-text {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-description {
          font-size: 20px;
          line-height: 1.6;
          opacity: 0.95;
          margin: 0 0 48px 0;
        }

        .cta-button {
          display: inline-block;
          padding: 18px 48px;
          background: white;
          color: #7c3aed;
          font-size: 20px;
          font-weight: 700;
          border-radius: 16px;
          text-decoration: none;
          transition: all 0.3s ease;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .cta-button:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.3);
        }

        .features {
          display: flex;
          justify-content: center;
          gap: 32px;
          margin-top: 64px;
          flex-wrap: wrap;
        }

        .feature {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .feature-icon {
          font-size: 36px;
        }

        .feature-text {
          font-size: 14px;
          font-weight: 500;
          opacity: 0.9;
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 40px;
          }

          .hero-description {
            font-size: 18px;
          }

          .cta-button {
            font-size: 18px;
            padding: 16px 40px;
          }

          .features {
            gap: 24px;
          }

          .feature-icon {
            font-size: 28px;
          }

          .feature-text {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}
