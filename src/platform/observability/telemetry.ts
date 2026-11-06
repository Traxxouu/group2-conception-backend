import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-proto'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { B3Propagator } from '@opentelemetry/propagator-b3'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions'

export const telemetry = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'events-api',
    [ATTR_SERVICE_VERSION]: '1.0.0',
  }),

  contextManager: new AsyncLocalStorageContextManager(),
  textMapPropagator: new B3Propagator(),
  spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
  metricReaders: [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(),
      exportIntervalMillis: 5_000,
    }),
  ],
  logRecordProcessors: [
    new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() }),
  ],
})

telemetry.start()

// Comme il faut tout justifier je suis passer par la doc de c elien https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
// il y a aussi ça pour les OTLP https://opentelemetry.io/docs/languages/js/exporters/
