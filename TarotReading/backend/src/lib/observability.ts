// Temporarily disabled due to version conflicts - will be fixed in production
// import { NodeSDK } from '@opentelemetry/sdk-node';
// import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
// import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
// import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
// import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
// import { Resource } from '@opentelemetry/resources';
// import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { logger } from './logger';

const ENABLE_TRACING = process.env.ENABLE_TRACING === 'true';
const ENABLE_METRICS = process.env.ENABLE_METRICS === 'true';
const OTEL_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'tarot-reading-backend';
const SERVICE_VERSION = process.env.npm_package_version || '1.0.0';

let sdk: any = null;

/**
 * Initialize OpenTelemetry instrumentation
 */
export function initializeObservability(): void {
  // Temporarily disabled - OpenTelemetry will be enabled in production
  logger.info('OpenTelemetry disabled (to be enabled in production)');
  return;

  /* Disabled due to version conflicts - will fix in production
  if (!ENABLE_TRACING && !ENABLE_METRICS) {
    logger.info('OpenTelemetry disabled via environment variables');
    return;
  }

  try {
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
      [SemanticResourceAttributes.SERVICE_VERSION]: SERVICE_VERSION,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
        process.env.NODE_ENV || 'development',
    });

    const traceExporter = ENABLE_TRACING
      ? new OTLPTraceExporter({
          url: `${OTEL_ENDPOINT}/v1/traces`,
        })
      : undefined;

    const metricReader = ENABLE_METRICS
      ? new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
            url: `${OTEL_ENDPOINT}/v1/metrics`,
          }),
          exportIntervalMillis: 60000, // Export every 60 seconds
        })
      : undefined;

    sdk = new NodeSDK({
      resource,
      traceExporter,
      metricReader,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable fs instrumentation (too noisy)
          '@opentelemetry/instrumentation-fs': {
            enabled: false,
          },
          // Configure HTTP instrumentation
          '@opentelemetry/instrumentation-http': {
            ignoreIncomingRequestHook: (req) => {
              // Ignore health check requests
              return req.url?.includes('/health') || false;
            },
          },
        }),
      ],
    });

    sdk.start();

    logger.info(
      {
        tracing: ENABLE_TRACING,
        metrics: ENABLE_METRICS,
        endpoint: OTEL_ENDPOINT,
      },
      'OpenTelemetry initialized'
    );

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      try {
        await sdk?.shutdown();
        logger.info('OpenTelemetry shut down successfully');
      } catch (err) {
        logger.error({ err }, 'Error shutting down OpenTelemetry');
      }
    });
  } catch (err) {
    logger.error({ err }, 'Failed to initialize OpenTelemetry');
  }
  */
}

/**
 * Shutdown OpenTelemetry (for testing)
 */
export async function shutdownObservability(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
  }
}
