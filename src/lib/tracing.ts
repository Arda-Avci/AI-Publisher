import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor, type SpanProcessor } from '@opentelemetry/sdk-trace-base';
import { trace, type TracerProvider } from '@opentelemetry/api';
import { Logger } from './logger.js';

interface ProviderWithProcessor extends TracerProvider {
  addSpanProcessor?(processor: SpanProcessor): void;
}

export function initTracing() {
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!otlpEndpoint) {
    Logger.debug('[OTEL] OTEL_EXPORTER_OTLP_ENDPOINT not set, OTLP tracing disabled');
    return;
  }

  try {
    const provider = trace.getTracerProvider() as ProviderWithProcessor;
    if (provider?.addSpanProcessor) {
      const exporter = new OTLPTraceExporter({ url: otlpEndpoint });
      provider.addSpanProcessor(new BatchSpanProcessor(exporter));
      Logger.info(`[OTEL] OTLP tracing → ${otlpEndpoint}`);
    } else {
      Logger.warn('[OTEL] TracerProvider does not support addSpanProcessor');
    }
  } catch (err) {
    Logger.warn('[OTEL] OTLP tracing init failed', err);
  }
}
