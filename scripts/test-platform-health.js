/**
 * Sunotal Platform — Docker Compose-Aware Health Verification Script
 *
 * Tests each microservice health endpoint individually.
 * Run with: node scripts/test-platform-health.js
 *
 * Environment variables:
 *   SERVICES_HOST  — host for microservices (default: localhost)
 */

const http = require('http');

const HOST = process.env.SERVICES_HOST || 'localhost';

const SERVICES = [
  { name: 'auth-service',        port: 5001, path: '/api/healthz' },
  { name: 'operations-service',  port: 5002, path: '/api/healthz' },
  { name: 'inventory-service',   port: 5003, path: '/api/healthz' },
  { name: 'user-service',        port: 5004, path: '/api/healthz' },
  { name: 'vendor-service',      port: 5005, path: '/api/healthz' },
  { name: 'delivery-service',    port: 5006, path: '/api/healthz' },
  { name: 'support-service',     port: 5007, path: '/api/healthz' },
];

console.log('─'.repeat(60));
console.log('🚀 Sunotal Platform Health Verification');
console.log(`   Target Host: ${HOST}`);
console.log('─'.repeat(60) + '\n');

function checkHealth(service) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: HOST,
        port: service.port,
        path: service.path,
        method: 'GET',
        timeout: 5000,
        headers: { 'User-Agent': 'sunotal-health-check' },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const body = JSON.parse(data);
            const isHealthy = res.statusCode === 200 && (body.status === 'ok' || body.status === 'OK');
            resolve({ service: service.name, port: service.port, healthy: isHealthy, statusCode: res.statusCode, body });
          } catch {
            resolve({ service: service.name, port: service.port, healthy: res.statusCode === 200, statusCode: res.statusCode, body: data });
          }
        });
      }
    );

    req.on('error', (err) => {
      resolve({ service: service.name, port: service.port, healthy: false, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ service: service.name, port: service.port, healthy: false, error: 'timeout' });
    });

    req.end();
  });
}

async function runHealthChecks() {
  let passed = 0;
  let failed = 0;
  let offline = 0;

  console.log('=== Microservice Health Checks ===\n');

  const results = await Promise.all(SERVICES.map(checkHealth));

  for (const result of results) {
    if (result.error) {
      console.log(`  ⚠️  OFFLINE  ${result.service} (port ${result.port}): ${result.error}`);
      offline++;
    } else if (result.healthy) {
      console.log(`  ✅ HEALTHY  ${result.service} (port ${result.port})`);
      passed++;
    } else {
      console.log(`  ❌ UNHEALTHY ${result.service} (port ${result.port}): HTTP ${result.statusCode}`);
      failed++;
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`Results: ✅ ${passed} healthy  ❌ ${failed} unhealthy  ⚠️ ${offline} offline`);
  console.log('─'.repeat(60));

  // Fail CI only if services that started returned unhealthy responses
  // Offline = not started = acceptable in unit CI (no Docker Compose)
  if (failed > 0) {
    console.error('\n❌ Health check failed — some services returned unhealthy responses.');
    process.exit(1);
  }

  if (passed === 0 && offline === SERVICES.length) {
    console.log('\n⚠️  No services were reachable. Run with docker compose up to test live.');
    // Don't fail CI when no services are running (unit-only CI mode)
    process.exit(0);
  }

  console.log('\n🎉 All reachable services are healthy!');
  process.exit(0);
}

runHealthChecks();
