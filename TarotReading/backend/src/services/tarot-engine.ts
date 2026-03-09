import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { cache } from '../lib/cache';
import { logger } from '../lib/logger';

export type SpreadType = '1-card' | '3-card' | '7-card' | 'celtic-cross';
export type Orientation = 'upright' | 'reversed';

export interface DrawnCard {
  card_id: number;
  position: number;
  orientation: Orientation;
  name?: string;
  meaning?: string;
}

const SPREAD_CARD_COUNTS: Record<SpreadType, number> = {
  '1-card': 1,
  '3-card': 3,
  '7-card': 7,
  'celtic-cross': 10,
};

export class TarotEngine {
  /**
   * Draw cards for a spread using CSPRNG or seeded RNG
   */
  public drawCards(spreadType: SpreadType, seed?: string): DrawnCard[] {
    const cardCount = this.getCardCount(spreadType);
    const selectedCardIds = this.selectUniqueCards(cardCount, seed);

    return selectedCardIds.map((cardId, index) => ({
      card_id: cardId,
      position: index + 1,
      orientation: this.randomOrientation(seed ? `${seed}-${index}` : undefined),
    }));
  }

  /**
   * Draw cards with full card details from database
   */
  public async drawCardsWithDetails(
    spreadType: SpreadType,
    seed?: string,
    locale: string = 'en'
  ): Promise<DrawnCard[]> {
    const drawnCards = this.drawCards(spreadType, seed);

    // Fetch card details from cache or database
    const cardsWithDetails = await Promise.all(
      drawnCards.map(async (drawn) => {
        const card = await this.getCardDetails(drawn.card_id);

        if (!card) {
          logger.error({ card_id: drawn.card_id }, 'Card not found in database');
          throw new Error(`Card ${drawn.card_id} not found`);
        }

        const name = locale === 'zh-TW' || locale === 'zh' ? card.name_zh : card.name_en;
        const meaning =
          drawn.orientation === 'upright' ? card.upright_meaning : card.reversed_meaning;

        return {
          ...drawn,
          name,
          meaning,
        };
      })
    );

    return cardsWithDetails;
  }

  /**
   * Get card count for spread type
   */
  private getCardCount(spreadType: SpreadType): number {
    const count = SPREAD_CARD_COUNTS[spreadType];
    if (!count) {
      throw new Error(`Invalid spread type: ${spreadType}`);
    }
    return count;
  }

  /**
   * Select unique card IDs using Fisher-Yates shuffle
   */
  private selectUniqueCards(count: number, seed?: string): number[] {
    const totalCards = 78;
    const deck = Array.from({ length: totalCards }, (_, i) => i + 1);

    // Shuffle using Fisher-Yates algorithm
    for (let i = deck.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i + 1, seed ? `${seed}-shuffle-${i}` : undefined);
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck.slice(0, count);
  }

  /**
   * Generate random orientation
   */
  private randomOrientation(seed?: string): Orientation {
    return this.randomInt(0, 2, seed) === 0 ? 'upright' : 'reversed';
  }

  /**
   * Generate cryptographically secure random integer
   * @param min Minimum value (inclusive)
   * @param max Maximum value (exclusive)
   * @param seed Optional seed for reproducibility
   */
  private randomInt(min: number, max: number, seed?: string): number {
    if (seed) {
      // Seeded pseudo-random using hash
      const hash = crypto.createHash('sha256').update(seed).digest();
      const value = hash.readUInt32BE(0) / 0xffffffff; // Normalize to [0, 1)
      return Math.floor(value * (max - min)) + min;
    }

    // CSPRNG for true randomness
    const range = max - min;
    const bytesNeeded = Math.ceil(Math.log2(range) / 8);
    const randomBytes = crypto.randomBytes(bytesNeeded);
    const randomValue = randomBytes.readUIntBE(0, bytesNeeded);
    return (randomValue % range) + min;
  }

  /**
   * Get card details from cache or database
   */
  private async getCardDetails(cardId: number) {
    const cacheKey = `card:${cardId}`;

    // Try cache first
    const cached = await cache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const card = await prisma.card.findFirst({
      where: { order: cardId - 1 }, // Card IDs are 1-indexed, order is 0-indexed
    });

    if (card) {
      // Cache for 24 hours (cards don't change)
      await cache.set(cacheKey, card, 86400);
    }

    return card;
  }
}
