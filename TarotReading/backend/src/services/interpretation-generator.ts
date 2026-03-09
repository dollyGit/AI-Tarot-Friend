import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../lib/logger';
import { ModelRouter } from './model-router';
import { buildPrompt } from '../lib/prompts';
import { DrawnCard } from './tarot-engine';

export interface Interpretation {
  tldr: string;
  key_points: string[];
  advice: {
    short_term: string;
    medium_term: string;
    long_term: string;
  };
  warnings: string;
}

/**
 * Interpretation generator using Claude AI
 * Generates empathetic tarot readings using Anthropic's Claude
 */
export class InterpretationGenerator {
  private modelRouter: ModelRouter;
  private useMock: boolean;
  private anthropic: Anthropic | null;

  constructor() {
    this.modelRouter = new ModelRouter();
    this.useMock = process.env.USE_MOCK_LLM === 'true' || process.env.NODE_ENV === 'test';

    // Initialize Anthropic client if API key is available
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey && !this.useMock) {
      this.anthropic = new Anthropic({ apiKey });
    } else {
      this.anthropic = null;
    }
  }

  /**
   * Generate interpretation from cards and context
   */
  public async generate(
    cards: DrawnCard[],
    context: string,
    crisisLevel?: string
  ): Promise<Interpretation> {
    try {
      if (this.useMock) {
        return this.generateMockInterpretation(cards, context);
      }

      // Select model
      const modelSelection = this.modelRouter.selectModel('interpretation');

      // Build prompt
      const cardsWithDetails = cards.map(c => ({
        name: c.name || `Card ${c.card_id}`,
        position: c.position,
        orientation: c.orientation,
        meaning: c.meaning || 'Meaning not available'
      }));
      const prompt = buildPrompt(cardsWithDetails, context, crisisLevel);

      // Call LLM (placeholder - implement based on provider)
      const interpretation = await this.callLLM(prompt, modelSelection);

      return interpretation;
    } catch (err) {
      logger.error({ err, context }, 'Interpretation generation failed');
      return this.generateFallbackInterpretation();
    }
  }

  /**
   * Mock interpretation for testing
   */
  private generateMockInterpretation(cards: DrawnCard[], context: string): Interpretation {
    const cardNames = cards.map((c) => c.name || `Card ${c.card_id}`).join(', ');
    const cardsWithDetails = cards.map(c => ({
      name: c.name || `Card ${c.card_id}`,
      position: c.position,
      orientation: c.orientation,
      meaning: c.meaning || 'Meaning not available'
    }));

    return {
      tldr: `Your reading with ${cardNames} suggests a period of reflection and potential growth related to: ${context}`,
      key_points: [
        'The cards indicate current challenges that offer learning opportunities',
        'Your inner strength and resilience are key resources',
        'Consider multiple perspectives before making decisions',
        'Trust your intuition while remaining grounded',
      ].slice(0, Math.max(3, Math.min(5, cards.length + 1))),
      advice: {
        short_term:
          'Take time this week to journal your thoughts and observe patterns in your situation',
        medium_term:
          'Over the next few weeks, explore new approaches and seek advice from trusted sources',
        long_term:
          'In the coming months, focus on building skills and relationships that align with your values',
      },
      warnings:
        'Be mindful of overthinking or avoiding necessary conversations. Balance reflection with action.',
    };
  }

  /**
   * Fallback interpretation on error
   */
  private generateFallbackInterpretation(): Interpretation {
    return {
      tldr: 'Your reading suggests a time of transition and self-discovery',
      key_points: [
        'Current circumstances offer valuable lessons',
        'Your choices shape your path forward',
        'Support is available when you seek it',
      ],
      advice: {
        short_term: 'Focus on what you can control today',
        medium_term: 'Build habits that support your goals',
        long_term: 'Stay open to growth and new possibilities',
      },
      warnings: 'Remember that tarot is a tool for reflection, not prediction',
    };
  }

  /**
   * Call Claude AI to generate interpretation
   */
  private async callLLM(prompt: string, modelSelection: any): Promise<Interpretation> {
    if (!this.anthropic) {
      logger.warn('Anthropic client not initialized, using fallback');
      return this.generateFallbackInterpretation();
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        temperature: 0.7,
        system: `You are an empathetic tarot reader providing compassionate guidance.
Your interpretations should be:
- Non-fatalistic and empowering
- Focused on personal growth and reflection
- Grounded in traditional tarot meanings but accessible
- Supportive and caring in tone
- Never making absolute predictions

Always respond with valid JSON in this exact format:
{
  "tldr": "A brief 1-2 sentence summary of the reading",
  "key_points": ["point 1", "point 2", "point 3", "point 4"],
  "advice": {
    "short_term": "Guidance for the next few days",
    "medium_term": "Guidance for the next few weeks",
    "long_term": "Guidance for the coming months"
  },
  "warnings": "Gentle cautions or things to be mindful of"
}`,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Extract JSON from response
      const content = response.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const interpretation = JSON.parse(jsonMatch[0]) as Interpretation;

          // Validate structure
          if (
            interpretation.tldr &&
            Array.isArray(interpretation.key_points) &&
            interpretation.advice &&
            interpretation.warnings
          ) {
            return interpretation;
          }
        }
      }

      logger.warn('Failed to parse Claude response, using fallback');
      return this.generateFallbackInterpretation();
    } catch (error) {
      logger.error({ error }, 'Error calling Claude API');
      return this.generateFallbackInterpretation();
    }
  }
}
