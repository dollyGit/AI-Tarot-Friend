/**
 * Service Logger — wraps @tarotfriend/shared createLogger
 */
import { createLogger } from '@tarotfriend/shared';
import { config } from '../config/index.js';

export const logger = createLogger({
  service: config.SERVICE_NAME,
  level: config.LOG_LEVEL,
});
