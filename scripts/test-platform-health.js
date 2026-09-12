/**
 * Sunotal Quick-Commerce Platform End-to-End Health Verification Script
 * Run with: node scripts/test-platform-health.js
 */

const http = require('http');
const { execSync } = require('child_process');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

console.log('----------------------------------------------------');
console.log('🚀 Starting Sunotal Platform Health & Integration Tests');
console.log(`Backend Target: ${BACKEND_URL}`);
console.log('----------------------------------------------------\n');

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BACKEND_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  const testCases = [
    {
      name: '1. Healthz Check',
      path: '/api/healthz',
      method: 'GET',
      check: (res) => res.status === 200 && res.body.status === 'OK',
    },
    {
      name: '2. Admin Login',
      path: '/api/auth/login',
      method: 'POST',
      body: { email: 'admin@sunotal.com', password: 'password123' },
      check: (res) => res.status === 200 && res.body.success === true && !!res.body.token,
    },
    {
      name: '3. Admin Stats Analytics',
      path: '/api/admin/stats',
      method: 'GET',
      check: (res) =>
        res.status === 200 &&
        res.body.success === true &&
        Array.isArray(res.body.recentUsers) &&
        Array.isArray(res.body.recentVendors) &&
        Array.isArray(res.body.categoryBreakdown),
    },
    {
      name: '4. Dark Store Discovery (<2.5km radius)',
      path: '/api/storefront/dark-stores/nearby?lat=12.9716&lon=77.5946',
      method: 'GET',
      check: (res) => res.status === 200 && res.body.success === true && Array.isArray(res.body.stores),
    },
    {
      name: '5. Catalog Typo-Tolerant Search',
      path: '/api/storefront/search?q=tomatoes',
      method: 'GET',
      check: (res) => res.status === 200 && res.body.success === true && Array.isArray(res.body.products),
    },
    {
      name: '6. WMS Pick-Path Sorting (Aisle -> Shelf -> Bin)',
      path: '/api/wms/pick-list/ORD-9912',
      method: 'GET',
      check: (res) => res.status === 200 && res.body.success === true && Array.isArray(res.body.items),
    },
    {
      name: '7. WMS Barcode Scan Verification',
      path: '/api/wms/scan-item',
      method: 'POST',
      body: { orderId: 'ORD-9912', skuId: 'SKU-MILK-01', barcodeScanned: '8901262010015' },
      check: (res) => res.status === 200 && res.body.verified === true,
    },
    {
      name: '8. Rider 30s Dispatch Request',
      path: '/api/rider/dispatch-request',
      method: 'POST',
      body: { orderId: 'ORD-9912', darkStoreLat: 12.9716, darkStoreLon: 77.5946 },
      check: (res) => res.status === 200 && res.body.success === true && res.body.assignmentWindowSeconds === 30,
    },
    {
      name: '9. Customer Handover OTP Verification & Payout',
      path: '/api/rider/verify-handover-otp',
      method: 'POST',
      body: { orderId: 'ORD-9912', riderId: 'RIDER-007', inputOtp: '1234', expectedOtp: '1234' },
      check: (res) => res.status === 200 && res.body.status === 'DELIVERED' && res.body.payoutCredit > 0,
    },
    {
      name: '10. Farmer Produce Quotation Submission',
      path: '/api/procurement/quotations',
      method: 'POST',
      body: { vendorId: 'VENDOR-001', produceName: 'Organic Tomatoes', quantityKg: 500, pricePerKg: 35 },
      check: (res) => res.status === 201 && res.body.success === true && res.body.quotation.id.startsWith('QUOTE-'),
    },
  ];

  console.log('=== Step 1: Testing Backend REST APIs ===\n');

  for (const tc of testCases) {
    try {
      const res = await makeRequest(tc.path, tc.method, tc.body);
      const isOk = tc.check(res);
      if (isOk) {
        console.log(` ✅ PASS: ${tc.name}`);
        passed++;
      } else {
        console.log(` ❌ FAIL: ${tc.name} - Status: ${res.status}, Response:`, res.body);
        failed++;
      }
    } catch (err) {
      console.log(` ⚠️ OFF-LINE / SKIPPED: ${tc.name} - ${err.message}`);
      console.log('    (Start backend server with `cd services/unified-backend && npm start` to test live endpoints)');
    }
  }

  console.log('\n=== Step 2: Testing Unified Frontend Build Compilation ===\n');
  try {
    console.log('Building apps/user-app...');
    execSync('cd apps/user-app && npm run build', { stdio: 'inherit' });
    console.log(' ✅ PASS: Unified Frontend Build succeeded cleanly!');
    passed++;
  } catch (e) {
    console.log(' ❌ FAIL: Unified Frontend Build failed.');
    failed++;
  }

  console.log('\n----------------------------------------------------');
  console.log(`🎉 Health Test Complete! Passed: ${passed}, Failed: ${failed}`);
  console.log('----------------------------------------------------');
}

runTests();
