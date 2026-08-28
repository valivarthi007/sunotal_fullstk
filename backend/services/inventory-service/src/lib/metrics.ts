import client from "prom-client";
import { Request, Response, NextFunction } from "express";

// Initialize default Node.js process metrics collection
client.collectDefaultMetrics({ prefix: "sunotal_" });

// HTTP Request Duration Histogram (p50, p90, p99 API latencies)
export const httpRequestDurationSeconds = new client.Histogram({
  name: "sunotal_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code", "service"],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// Total HTTP Requests Counter
export const httpRequestsTotal = new client.Counter({
  name: "sunotal_http_requests_total",
  help: "Total number of HTTP requests processed",
  labelNames: ["method", "route", "status_code", "service"],
});

// Database Query Timing Gauge
export const dbQueryDurationSeconds = new client.Histogram({
  name: "sunotal_db_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["query_type", "table"],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 2.5],
});

/**
 * Express middleware to automatically track Prometheus metrics per HTTP request
 */
export function metricsMiddleware(serviceName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const end = httpRequestDurationSeconds.startTimer();
    res.on("finish", () => {
      const route = req.route ? req.route.path : req.path || "unknown";
      const labels = {
        method: req.method,
        route,
        status_code: res.statusCode.toString(),
        service: serviceName,
      };
      end(labels);
      httpRequestsTotal.inc(labels);
    });
    next();
  };
}

/**
 * Endpoint handler to serve Prometheus metrics at GET /metrics
 */
export async function metricsHandler(req: Request, res: Response) {
  try {
    res.set("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
}
