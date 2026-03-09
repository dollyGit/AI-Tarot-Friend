import { logger } from '../lib/logger';

export type SentimentLabel = 'negative' | 'neutral' | 'positive';
export type CrisisLevel = 'none' | 'moderate' | 'high' | 'immediate';

export interface SentimentResult {
  score: number; // -1 to 1
  label: SentimentLabel;
  confidence: number; // 0 to 1
  crisis_level: CrisisLevel;
}

/**
 * Simple rule-based sentiment analyzer
 * In production, this would use OpenAI/Anthropic sentiment analysis
 */
export class SentimentAnalyzer {
  private negativeKeywords = [
    'worried',
    'anxious',
    'stressed',
    'confused',
    'lost',
    'stuck',
    'hopeless',
    'depressed',
    'sad',
    'afraid',
    'fear',
    'concern',
    '擔心',
    '焦慮',
    '困惑',
    '迷茫',
    '壓力',
    '害怕',
    '恐懼',
    '難過',
    '沮喪',
  ];

  private positiveKeywords = [
    'excited',
    'happy',
    'hopeful',
    'optimistic',
    'confident',
    'grateful',
    'motivated',
    '開心',
    '希望',
    '樂觀',
    '自信',
    '感激',
    '有動力',
  ];

  /**
   * Analyze sentiment from user input
   */
  public async analyze(text: string): Promise<SentimentResult> {
    try {
      const lowerText = text.toLowerCase();

      // Count keywords
      const negativeCount = this.negativeKeywords.filter((kw) =>
        lowerText.includes(kw.toLowerCase())
      ).length;

      const positiveCount = this.positiveKeywords.filter((kw) =>
        lowerText.includes(kw.toLowerCase())
      ).length;

      // Calculate sentiment score (-1 to 1)
      const totalKeywords = negativeCount + positiveCount || 1;
      const score = (positiveCount - negativeCount) / totalKeywords;

      // Normalize to -1 to 1 range
      const normalizedScore = Math.max(-1, Math.min(1, score));

      // Determine label
      let label: SentimentLabel;
      if (normalizedScore < -0.3) {
        label = 'negative';
      } else if (normalizedScore > 0.3) {
        label = 'positive';
      } else {
        label = 'neutral';
      }

      // Calculate confidence based on keyword count
      const confidence = Math.min(0.95, (negativeCount + positiveCount) * 0.2 + 0.5);

      // Determine crisis level (will be enhanced by crisis detector)
      const crisis_level: CrisisLevel = 'none'; // Default, crisis detector will override

      return {
        score: parseFloat(normalizedScore.toFixed(2)),
        label,
        confidence: parseFloat(confidence.toFixed(2)),
        crisis_level,
      };
    } catch (err) {
      logger.error({ err, text }, 'Sentiment analysis failed');

      // Return neutral sentiment on error
      return {
        score: 0,
        label: 'neutral',
        confidence: 0.5,
        crisis_level: 'none',
      };
    }
  }

  /**
   * Suggest spread based on sentiment and context
   */
  public suggestSpread(
    sentiment: SentimentResult,
    isPremium: boolean = false
  ): '1-card' | '3-card' | '7-card' {
    // Negative sentiment → deeper spread for more guidance
    if (sentiment.label === 'negative') {
      return isPremium ? '7-card' : '3-card';
    }

    // Neutral or positive → lighter spread
    if (sentiment.label === 'positive') {
      return '1-card';
    }

    return '3-card';
  }
}
