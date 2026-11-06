import { SpanKind, SpanStatusCode, metrics, trace } from '@opentelemetry/api'
import {
  ATTR_HTTP_REQUEST_METHOD,
  ATTR_HTTP_RESPONSE_STATUS_CODE,
  ATTR_HTTP_ROUTE,
  METRIC_HTTP_SERVER_REQUEST_DURATION,
} from '@opentelemetry/semantic-conventions'
import { createMiddleware } from 'hono/factory'
import { routePath } from 'hono/route'

const tracer = trace.getTracer('events-api.http')
const meter = metrics.getMeter('events-api.http')

const requestDuration = meter.createHistogram(
  METRIC_HTTP_SERVER_REQUEST_DURATION,
  {
    description: 'Duration of HTTP server requests',
    unit: 's',
    advice: {
      explicitBucketBoundaries: [
        0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5,
      ],
    },
  },
)

export const httpTelemetry = createMiddleware(async (c, next) => {
  const method = c.req.method
  const start = performance.now()
  await tracer.startActiveSpan(
    method,
    { kind: SpanKind.SERVER },
    async (span) => {
      try {
        await next()
      } finally {
        const route = routePath(c, -1)
        const matched = route !== '' && !route.endsWith('*')
        const status = c.res.status
        const attributes = {
          [ATTR_HTTP_REQUEST_METHOD]: method,
          [ATTR_HTTP_RESPONSE_STATUS_CODE]: status,
          ...(matched ? { [ATTR_HTTP_ROUTE]: route } : {}),
        }
        if (matched) {
          span.updateName(`${method} ${route}`)
        }
        span.setAttributes(attributes)
        if (c.error) {
          span.recordException(c.error)
        }
        if (status >= 500) {
          span.setStatus({ code: SpanStatusCode.ERROR })
        }
        span.end()
        requestDuration.record((performance.now() - start) / 1000, attributes)
      }
    },
  )
})

// je ne vais pas donner touts les doc je pense que c le dernier ou j'explique vraiment quel doc est utiliser mais je me suis en grande partie base sur https://opentelemetry.io/docs/languages/js/instrumentation/
// ainsi que https://opentelemetry.io/docs/specs/semconv/http/http-spans/