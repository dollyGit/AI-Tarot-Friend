import { logger } from '../lib/logger';

export type ModelProvider = 'openai' | 'anthropic';
export type ModelName = 'gpt-4o-mini' | 'gpt-4' | 'claude-3-haiku' | 'claude-3-sonnet';

export interface ModelSelection {
  provider: ModelProvider;
  model: ModelName;
  maxTokens: number;
}

/**
 * Smart model router for cost optimization
 * Constitution Principle IV: Small model priority
 */
export class ModelRouter {
  /**
   * Select appropriate model based on task complexity
   */
  public selectModel(
    taskType: 'interpretation' | 'crisis' | 'summary',
    userTier: 'free' | 'premium' = 'free'
  ): ModelSelection {
    // Small model first (constitution principle)
    if (taskType === 'interpretation') {
      return {
        provider: 'openai',
        model: 'gpt-4o-mini',
        maxTokens: 500,
      };
    }

    // Crisis detection needs higher accuracy
    if (taskType === 'crisis') {
      return {
        provider: 'anthropic',
        model: 'claude-3-haiku',
        maxTokens: 300,
      };
    }

    // Summaries can use smallest model
    return {
      provider: 'openai',
      model: 'gpt-4o-mini',
      maxTokens: 200,
    };
  }

  /**
   * Get fallback model if primary fails
   */
  public getFallback(primary: ModelSelection): ModelSelection {
    if (primary.provider === 'openai') {
      return {
        provider: 'anthropic',
        model: 'claude-3-haiku',
        maxTokens: primary.maxTokens,
      };
    }

    return {
      provider: 'openai',
      model: 'gpt-4o-mini',
      maxTokens: primary.maxTokens,
    };
  }
}
