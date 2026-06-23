import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';
import { AmqplibInstrumentation } from '@opentelemetry/instrumentation-amqplib';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { metrics } from '@opentelemetry/api';
import type { IncomingMessage, ServerResponse } from 'http';
import type { SpanExporter } from '@opentelemetry/sdk-trace-base';
import { Logger } from './logger.js';
import { initTracing } from './tracing.js';

const enabled = process.env.OTEL_ENABLED !== 'false';
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

let _metricsHandler: ((req: IncomingMessage, res: ServerResponse) => void) | null = null;
let _sdk: NodeSDK | null = null;

const prometheusExporter = new PrometheusExporter({
  preventServerStart: !enabled,
  endpoint: '/metrics',
});

if (enabled) {
  try {
    const sdkConfig: Record<string, any> = {
      serviceName: 'ai-publisher',
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-http': {
            ignoreIncomingRequestHook: (req) => {
              const url = (req as any).url ?? '';
              return url === '/metrics' || url.startsWith('/health');
            },
          },
          '@opentelemetry/instrumentation-express': {
            ignoreLayers: ['express.static', 'json', 'urlencoded'],
          },
          '@opentelemetry/instrumentation-fs': { enabled: false },
          '@opentelemetry/instrumentation-dns': { enabled: false },
          '@opentelemetry/instrumentation-net': { enabled: false },
        }),
        new PgInstrumentation({
          enhancedDatabaseReporting: process.env.OTEL_PG_ENHANCED === 'true',
        }),
        new IORedisInstrumentation(),
        new AmqplibInstrumentation(),
      ],
      metricReader: prometheusExporter,
    };

    if (otlpEndpoint) {
      const traceExporter: SpanExporter = new OTLPTraceExporter({ url: otlpEndpoint });
      sdkConfig.traceExporter = traceExporter;
      sdkConfig.spanProcessors = [new BatchSpanProcessor(traceExporter)];
      Logger.info(`[OTEL] OTLP tracing enabled → ${otlpEndpoint}`);
    }

    _sdk = new NodeSDK(sdkConfig as any);
    _metricsHandler = (req, res) => prometheusExporter.getMetricsRequestHandler(req, res);
    initTracing();
    Logger.info('[OTEL] OpenTelemetry initialized');
  } catch (err) {
    Logger.error('[OTEL] SDK init failed', err);
  }
} else {
  Logger.info('[OTEL] OpenTelemetry disabled (OTEL_ENABLED=false)');
}

export function getMetricsHandler() {
  return _metricsHandler;
}

const meter = metrics.getMeter('ai-publisher');

export const jobDurationHistogram = meter.createHistogram('ai_publisher_job_duration_seconds', {
  description: 'Video job duration in seconds',
  unit: 's',
});

export const sceneCounter = meter.createCounter('ai_publisher_scenes_total', {
  description: 'Total scenes processed',
});

export const renderTimeHistogram = meter.createHistogram('ai_publisher_render_time_seconds', {
  description: 'Render time per scene in seconds',
  unit: 's',
});

export const activeJobsCounter = meter.createUpDownCounter('ai_publisher_active_jobs', {
  description: 'Currently active video jobs',
});

export const failedJobsCounter = meter.createCounter('ai_publisher_failed_jobs_total', {
  description: 'Total failed jobs',
});

export function recordJobDuration(seconds: number, attrs?: Record<string, string>) {
  jobDurationHistogram.record(seconds, attrs);
}

export function incrementSceneCounter(attrs?: Record<string, string>) {
  sceneCounter.add(1, attrs);
}

export function recordRenderTime(seconds: number, attrs?: Record<string, string>) {
  renderTimeHistogram.record(seconds, attrs);
}

export function incrementFailedJobs(attrs?: Record<string, string>) {
  failedJobsCounter.add(1, attrs);
}

export function jobStarted() { activeJobsCounter.add(1); }
export function jobFinished() { activeJobsCounter.add(-1); }

export function shutdownTelemetry() {
  if (_sdk) {
    try {
      _sdk.shutdown();
      Logger.info('[OTEL] SDK shut down');
    } catch (err) {
      Logger.warn('[OTEL] Shutdown error', err);
    }
  }
}
