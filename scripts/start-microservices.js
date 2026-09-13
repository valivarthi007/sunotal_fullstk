const { fork } = require('child_process');
const path = require('path');

const services = [
  { name: 'auth-service', path: 'services/auth-service/dist/index.js', port: 5001 },
  { name: 'catalog-service', path: 'services/catalog-service/dist/index.js', port: 5002 },
  { name: 'order-service', path: 'services/order-service/dist/index.js', port: 5003 },
  { name: 'delivery-service', path: 'services/delivery-service/dist/index.js', port: 5004 },
  { name: 'vendor-service', path: 'services/vendor-service/dist/index.js', port: 5005 },
  { name: 'notification-service', path: 'services/notification-service/dist/index.js', port: 5006 },
  { name: 'api-gateway', path: 'services/api-gateway/dist/index.js', port: 5000 },
];

console.log('🚀 Starting Sunotal Microservices Cluster (7 Processes)...');

services.forEach((s) => {
  const p = fork(path.resolve(s.path), [], { env: { ...process.env, PORT: s.port } });
  console.log(` ✅ Launched ${s.name} on port ${s.port} (PID: ${p.pid})`);
});
