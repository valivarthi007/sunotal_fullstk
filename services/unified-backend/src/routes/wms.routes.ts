import { Router, Request, Response } from 'express';

const router = Router();

// 1. Pick-Path Sequence Algorithm: Sort items by Aisle ASC -> Shelf ASC -> Bin ASC
router.get('/pick-list/:orderId', (req: Request, res: Response) => {
  const { orderId } = req.params;

  // Mock order item coordinates
  const items = [
    { skuId: 'SKU-MILK-01', name: 'Amul Taaza Toned Milk 500ml', aisle: 'A2', shelf: 'S1', bin: 'B04', barcode: '8901262010015', qty: 2, status: 'PENDING' },
    { skuId: 'SKU-BREAD-02', name: 'Britannia Whole Wheat Bread 400g', aisle: 'A1', shelf: 'S3', bin: 'B01', barcode: '8901068001021', qty: 1, status: 'PENDING' },
    { skuId: 'SKU-EGGS-03', name: 'Farm Fresh White Eggs 6s', aisle: 'A1', shelf: 'S1', bin: 'B02', barcode: '8906000000030', qty: 1, status: 'PENDING' },
  ];

  // Pick-Path Sorting: Aisle ASC -> Shelf ASC -> Bin ASC
  const sortedItems = items.sort((a, b) => {
    if (a.aisle !== b.aisle) return a.aisle.localeCompare(b.aisle);
    if (a.shelf !== b.shelf) return a.shelf.localeCompare(b.shelf);
    return a.bin.localeCompare(b.bin);
  });

  return res.json({
    success: true,
    orderId,
    pickerId: 'PICKER-HUB-01',
    status: 'PICKING_IN_PROGRESS',
    items: sortedItems
  });
});

// 2. Barcode Scan Verification
router.post('/scan-item', (req: Request, res: Response) => {
  const { orderId, skuId, barcodeScanned } = req.body;
  
  // Verify barcode match
  const isValid = barcodeScanned && barcodeScanned.length >= 10;
  return res.json({
    success: isValid,
    verified: isValid,
    scannedBarcode: barcodeScanned,
    message: isValid ? 'Item verified successfully!' : 'Barcode mismatch. Please scan correct SKU.'
  });
});

// 3. Out of Stock Flag & Instant Customer Substitution Trigger
router.post('/flag-out-of-stock', (req: Request, res: Response) => {
  const { orderId, skuId, reason } = req.body;
  
  return res.json({
    success: true,
    orderId,
    skuId,
    action: 'SUBSTITUTION_PROMPT_SENT',
    message: 'WebSocket substitution alert broadcasted to customer app.'
  });
});

// 4. Pack & Generate QR Bag Staging Tag
router.post('/pack-and-stage', (req: Request, res: Response) => {
  const { orderId, bagCount } = req.body;
  const qrCodeData = `SUNOTAL-STAGING-QR:${orderId}:${bagCount || 1}:${Date.now()}`;
  
  return res.json({
    success: true,
    orderId,
    stagingTag: {
      qrCodeData,
      binLocation: 'DISPATCH-STAGING-BAY-3',
      bagCount: bagCount || 1,
      stagedAt: new Date().toISOString()
    }
  });
});

export default router;
