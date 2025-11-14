import pino, {
  LoggerOptions as PinoOptions,
  TransportSingleOptions
} from "pino";
import { diag, DiagConsoleLogger, DiagLogLevel, trace, context } from "@opentelemetry/api";
import { NodeTracerProvider, BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

export type LoggerConfig = {
  serviceName: string;
  level?: PinoOptions["level"];
  prettyPrint?: boolean;
};

export type TracingConfig = {
  serviceName: string;
  endpoint?: string;
  environment?: string;
};

let tracerProvider: NodeTracerProvider | null = null;

export function createLogger(config: LoggerConfig) {
  const { serviceName, level = process.env.LOG_LEVEL ?? "info", prettyPrint } = config;

  const transport: TransportSingleOptions | undefined =
    prettyPrint ?? process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            singleLine: true
          }
        }
      : undefined;

  return pino({
    level,
    base: {
      service: serviceName,
      env: process.env.NODE_ENV ?? "development"
    },
    transport
  });
}

export function initTracing(config: TracingConfig) {
  if (tracerProvider) {
    return tracerProvider;
  }

  const { serviceName, endpoint, environment } = config;
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment ?? process.env.NODE_ENV ?? "development"
  });

  const exporter = new OTLPTraceExporter({
    url: endpoint ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318/v1/traces"
  });

  tracerProvider = new NodeTracerProvider({ resource });
  tracerProvider.addSpanProcessor(new BatchSpanProcessor(exporter));
  tracerProvider.register();

  return tracerProvider;
}

export function getTracer(serviceName: string) {
  return trace.getTracer(serviceName);
}

export async function withSpan<T>(spanName: string, fn: () => Promise<T>): Promise<T> {
  const tracer = getTracer("telemetry-helper");
  return tracer.startActiveSpan(spanName, async (span) => {
    try {
      const result = await fn();
      span.end();
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: (error as Error).message });
      span.end();
      throw error;
    }
  });
}

export { context, trace };

