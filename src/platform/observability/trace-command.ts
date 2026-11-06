import { SpanStatusCode, trace, type Attributes } from '@opentelemetry/api'
import type { CommandHandler } from '#/shared-kernel/command-handler.ts'
import { Result } from '#/shared-kernel/result.ts'

const tracer = trace.getTracer('events-api.commands')

export function traceCommand<Command, Output extends Result<unknown, Error>>(
  name: string,
  handler: CommandHandler<Command, Output>,
  attributes: (command: Command) => Attributes,
): void {
  const execute = handler.execute.bind(handler)
  handler.execute = (command) =>
    tracer.startActiveSpan(
      name,
      { attributes: attributes(command) },
      async (span) => {
        try {
          const output = await execute(command)
          const result: Result<unknown, Error> = output
          if (Result.isFailure(result)) {
            span.setAttributes({
              'booking.command.outcome': 'rejected',
              'booking.rejection.reason': result.error.constructor.name,
            })
          } else {
            span.setAttribute('booking.command.outcome', 'success')
          }
          return output
        } catch (error) {
          span.recordException(error as Error)
          span.setStatus({ code: SpanStatusCode.ERROR })
          throw error
        } finally {
          span.end()
        }
      },
    )
}