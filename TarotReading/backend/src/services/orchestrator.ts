import { SentimentAnalyzer, SentimentResult } from './sentiment-analyzer';
import { CrisisDetector } from './crisis-detector';
import { TarotEngine, SpreadType } from './tarot-engine';
import { InterpretationGenerator, Interpretation } from './interpretation-generator';
import { logger } from '../lib/logger';

export interface ReadingRequest {
  user_input?: string;
  spread_type: SpreadType;
  context?: string;
  seed?: string;
  locale?: string;
}

export interface ReadingResult {
  cards: any[];
  interpretation: Interpretation;
  sentiment?: SentimentResult;
  crisis_resources?: any;
}

/**
 * Conversation orchestrator - Linear state machine
 * Flow: input → analysis → selection → drawing → interpretation → storage
 */
export class Orchestrator {
  private sentimentAnalyzer: SentimentAnalyzer;
  private crisisDetector: CrisisDetector;
  private tarotEngine: TarotEngine;
  private interpretationGenerator: InterpretationGenerator;

  constructor() {
    this.sentimentAnalyzer = new SentimentAnalyzer();
    this.crisisDetector = new CrisisDetector();
    this.tarotEngine = new TarotEngine();
    this.interpretationGenerator = new InterpretationGenerator();
  }

  /**
   * Analyze user input and return sentiment
   */
  public async analyzeSentiment(userInput: string): Promise<{
    sentiment: SentimentResult;
    crisis_resources?: any;
  }> {
    logger.info({ input_length: userInput.length }, 'Analyzing sentiment');

    // Step 1: Sentiment analysis
    const sentiment = await this.sentimentAnalyzer.analyze(userInput);

    // Step 2: Crisis detection
    const crisisLevel = this.crisisDetector.detect(userInput, sentiment);

    // Update sentiment with crisis level
    sentiment.crisis_level = crisisLevel;

    // Step 3: Get resources if needed
    const result: any = { sentiment };

    if (this.crisisDetector.shouldShowResources(crisisLevel)) {
      result.crisis_resources = this.crisisDetector.getResources();
    }

    return result;
  }

  /**
   * Execute complete reading flow
   */
  public async executeReading(request: ReadingRequest): Promise<ReadingResult> {
    const { spread_type, context, seed, locale = 'en' } = request;

    logger.info({ spread_type, has_seed: !!seed }, 'Executing reading');

    // Step 1: Analyze sentiment (if user input provided)
    let sentiment: SentimentResult | undefined;
    let crisisLevel: string | undefined;

    if (request.user_input) {
      const analysis = await this.analyzeSentiment(request.user_input);
      sentiment = analysis.sentiment;
      crisisLevel = sentiment.crisis_level;
    }

    // Step 2: Draw cards
    const cards = await this.tarotEngine.drawCardsWithDetails(
      spread_type,
      seed,
      locale
    );

    logger.info({ card_count: cards.length }, 'Cards drawn');

    // Step 3: Generate interpretation
    const interpretation = await this.interpretationGenerator.generate(
      cards,
      context || request.user_input || 'General guidance',
      crisisLevel
    );

    logger.info('Interpretation generated');

    // Step 4: Return result
    const result: ReadingResult = {
      cards,
      interpretation,
    };

    if (sentiment) {
      result.sentiment = sentiment;
    }

    if (crisisLevel && this.crisisDetector.shouldShowResources(crisisLevel as any)) {
      result.crisis_resources = this.crisisDetector.getResources(locale);
    }

    return result;
  }

  /**
   * Suggest spread based on sentiment
   */
  public suggestSpread(sentiment: SentimentResult, isPremium: boolean = false): SpreadType {
    return this.sentimentAnalyzer.suggestSpread(sentiment, isPremium);
  }
}
