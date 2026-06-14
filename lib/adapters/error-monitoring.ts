/**
 * ErrorMonitoringProvider: Sentry in production, console mock otherwise.
 */
import { env } from "@/lib/env";

export interface ErrorMonitoringProvider {
  readonly name: string;
  captureException(error: unknown, context?: Record<string, unknown>): void;
}

class ConsoleErrorProvider implements ErrorMonitoringProvider {
  readonly name = "console-mock";
  captureException(error: unknown, context?: Record<string, unknown>) {
    console.error("[error-monitoring]", error, context ?? "");
  }
}

class SentryProvider implements ErrorMonitoringProvider {
  readonly name = "sentry";
  captureException(error: unknown, context?: Record<string, unknown>) {
    // TODO(production): install @sentry/nextjs and initialize with SENTRY_DSN.
    // Console fallback keeps errors visible until then.
    console.error("[sentry-pending]", error, context ?? "");
  }
}

export function getErrorMonitoring(): ErrorMonitoringProvider {
  return env.sentryDsn ? new SentryProvider() : new ConsoleErrorProvider();
}
