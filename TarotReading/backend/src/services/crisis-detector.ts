import { logger } from '../lib/logger';
import { SentimentResult, CrisisLevel } from './sentiment-analyzer';

export interface CrisisResources {
  hotlines: Array<{
    name: string;
    phone: string;
    locale: string;
  }>;
  message: string;
}

/**
 * Crisis detection service for mental health safety
 */
export class CrisisDetector {
  private crisisKeywords = [
    'suicide',
    'kill myself',
    'end it all',
    'no way out',
    'better off dead',
    'hopeless',
    'can\'t go on',
    'self harm',
    '自殺',
    '結束生命',
    '活不下去',
    '想死',
    '沒希望',
  ];

  private moderateKeywords = [
    'depressed',
    'very sad',
    'can\'t cope',
    'overwhelmed',
    'breaking down',
    'severe anxiety',
    '很憂鬱',
    '崩潰',
    '撐不住',
    '極度焦慮',
  ];

  /**
   * Detect crisis level from user input
   */
  public detect(text: string, sentiment: SentimentResult): CrisisLevel {
    const lowerText = text.toLowerCase();

    // Check for immediate crisis indicators
    const hasImmediateCrisis = this.crisisKeywords.some((keyword) =>
      lowerText.includes(keyword.toLowerCase())
    );

    if (hasImmediateCrisis) {
      logger.warn({ text: text.substring(0, 100) }, 'Immediate crisis detected');
      return 'immediate';
    }

    // Check for moderate crisis indicators
    const hasModerate = this.moderateKeywords.some((keyword) =>
      lowerText.includes(keyword.toLowerCase())
    );

    if (hasModerate && sentiment.score < -0.5) {
      logger.info('Moderate crisis detected');
      return 'high';
    }

    // Check sentiment-based high risk
    if (sentiment.score < -0.7) {
      return 'moderate';
    }

    return 'none';
  }

  /**
   * Get crisis resources based on locale
   */
  public getResources(locale: string = 'en'): CrisisResources {
    const resources: CrisisResources = {
      hotlines: [],
      message: '',
    };

    if (locale.startsWith('zh')) {
      resources.hotlines = [
        {
          name: '台灣自殺防治中心',
          phone: '1925',
          locale: 'zh-TW',
        },
        {
          name: '生命線',
          phone: '1995',
          locale: 'zh-TW',
        },
        {
          name: '張老師',
          phone: '1980',
          locale: 'zh-TW',
        },
      ];
      resources.message =
        '我們察覺到您可能正在經歷困難時刻。請記得，尋求專業協助是一種勇氣的表現。以下是一些可以提供支持的資源：';
    } else {
      resources.hotlines = [
        {
          name: 'National Suicide Prevention Lifeline',
          phone: '988',
          locale: 'en-US',
        },
        {
          name: 'Crisis Text Line',
          phone: 'Text HOME to 741741',
          locale: 'en-US',
        },
        {
          name: 'International Association for Suicide Prevention',
          phone: 'Visit https://www.iasp.info/resources/Crisis_Centres/',
          locale: 'en',
        },
      ];
      resources.message =
        'We\'ve noticed you may be going through a difficult time. Please remember that seeking professional help is a sign of strength. Here are some resources that can provide support:';
    }

    return resources;
  }

  /**
   * Check if crisis resources should be shown
   */
  public shouldShowResources(crisisLevel: CrisisLevel): boolean {
    return crisisLevel === 'high' || crisisLevel === 'immediate';
  }
}
