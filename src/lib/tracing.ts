import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { trace } from '@opentelemetry/api';
import { Logger } from './logger.js';

export function initTracing() {
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!otlpEndpoint) return;

  try {
    const provider = trace.getTracerProvider() as any;
    if (provider?.addSpanProcessor) {
      const exporter = new OTLPTraceExporter({ url: otlpEndpoint });
      provider.addSpanProcessor(new BatchSpanProcessor(exporter));
      Logger.info(`[OTEL] OTLP tracing → ${otlpEndpoint}`);
    }
  } catch (err) {
    Logger.warn('[OTEL] OTLP tracing init failed', err);
  }
}
