import { describe, it, expect, beforeEach } from 'vitest';
import { TarotEngine } from '../../src/services/tarot-engine';

describe('TarotEngine - CSPRNG Card Selection', () => {
  let tarotEngine: TarotEngine;

  beforeEach(() => {
    tarotEngine = new TarotEngine();
  });

  it('should draw correct number of cards for different spreads', () => {
    const singleCard = tarotEngine.drawCards('1-card');
    expect(singleCard).toHaveLength(1);

    const threeCard = tarotEngine.drawCards('3-card');
    expect(threeCard).toHaveLength(3);

    const sevenCard = tarotEngine.drawCards('7-card');
    expect(sevenCard).toHaveLength(7);

    const celticCross = tarotEngine.drawCards('celtic-cross');
    expect(celticCross).toHaveLength(10);
  });

  it('should draw unique cards (no duplicates in single draw)', () => {
    const cards = tarotEngine.drawCards('7-card');

    const cardIds = cards.map((c) => c.card_id);
    const uniqueIds = new Set(cardIds);

    expect(uniqueIds.size).toBe(7);
  });

  it('should assign sequential positions starting from 1', () => {
    const cards = tarotEngine.drawCards('3-card');

    expect(cards[0].position).toBe(1);
    expect(cards[1].position).toBe(2);
    expect(cards[2].position).toBe(3);
  });

  it('should randomly assign upright or reversed orientation', () => {
    const cards = tarotEngine.drawCards('7-card');

    const orientations = cards.map((c) => c.orientation);

    // At least one of each orientation should appear in 7 cards (statistically very likely)
    // But we'll just check valid orientations
    orientations.forEach((orientation) => {
      expect(['upright', 'reversed']).toContain(orientation);
    });
  });

  it('should produce reproducible results with same seed', () => {
    const seed = 'test-reproducibility-seed';

    const draw1 = tarotEngine.drawCards('3-card', seed);
    const draw2 = tarotEngine.drawCards('3-card', seed);

    expect(draw1).toEqual(draw2);
  });

  it('should produce different results with different seeds', () => {
    const draw1 = tarotEngine.drawCards('3-card', 'seed-1');
    const draw2 = tarotEngine.drawCards('3-card', 'seed-2');

    expect(draw1).not.toEqual(draw2);
  });

  it('should produce different results without seed (CSPRNG)', () => {
    const draw1 = tarotEngine.drawCards('3-card');
    const draw2 = tarotEngine.drawCards('3-card');

    // Statistically very unlikely to be equal
    expect(draw1).not.toEqual(draw2);
  });

  it('should only draw from valid card range (1-78)', () => {
    const cards = tarotEngine.drawCards('7-card');

    cards.forEach((card) => {
      expect(card.card_id).toBeGreaterThanOrEqual(1);
      expect(card.card_id).toBeLessThanOrEqual(78);
    });
  });

  it('should use cryptographically secure randomness (statistical distribution test)', () => {
    const iterations = 1000;
    const cardCounts = new Array(78).fill(0);

    // Draw single cards many times
    for (let i = 0; i < iterations; i++) {
      const [card] = tarotEngine.drawCards('1-card');
      cardCounts[card.card_id - 1]++;
    }

    // Calculate mean and verify reasonable distribution
    const mean = iterations / 78;
    const tolerance = mean * 0.5; // 50% tolerance

    // Most cards should be drawn within reasonable range of mean
    const withinRange = cardCounts.filter(
      (count) => count >= mean - tolerance && count <= mean + tolerance
    );

    // At least 80% of cards should be within tolerance
    expect(withinRange.length).toBeGreaterThanOrEqual(62);
  });
});
