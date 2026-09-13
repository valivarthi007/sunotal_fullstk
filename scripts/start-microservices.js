/**
 * Sunotal Platform — Microservices Cluster Launcher
 *
 * Correct port assignment matching docker-compose.yml:
 *   5001 — auth-service
 *   5002 — operations-service
 *   5003 — inventory-service
 *   5004 — user-service
 *   5005 — vendor-service
 *   5006 — delivery-service
 *   5007 — support-service
 */

const { fork } = require('child_process');
const path = require('path');

const services = [
  { name: 'auth-service',       path: 'services/auth-service/dist/index.js',       port: 5001 },
  { name: 'operations-service', path: 'services/operations-service/dist/index.js', port: 5002 },
  { name: 'inventory-service',  path: 'services/inventory-service/dist/index.js',  port: 5003 },
  { name: 'user-service',       path: 'services/user-service/dist/index.js',       port: 5004 },
  { name: 'vendor-service',     path: 'services/vendor-service/dist/index.js',     port: 5005 },
  { name: 'delivery-service',   path: 'services/delivery-service/dist/index.js',   port: 5006 },
  { name: 'support-service',    path: 'services/support-service/dist/index.js',    port: 5007 },
];

console.log('🚀 Starting Sunotal Microservices Cluster...');

const processes = [];

services.forEach((s) => {
  const fullPath = path.resolve(s.path);
  const env = { ...process.env, PORT: String(s.port) };

  try {
    const p = fork(fullPath, [], { env, silent: false });
    processes.push(p);
    console.log(`  ✅ Launched ${s.name} on port ${s.port} (PID: ${p.pid})`);

    p.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.warn(`  ⚠️  ${s.name} exited with code ${code}`);
      }
    });
  } catch (err) {
    console.warn(`  ⚠️  Could not launch ${s.name}: ${err.message} (run 'npm run build' first)`);
  }
});

// Graceful shutdown
const shutdown = () => {
  console.log('\n🛑 Shutting down microservices cluster...');
  processes.forEach((p) => p.kill('SIGTERM'));
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
