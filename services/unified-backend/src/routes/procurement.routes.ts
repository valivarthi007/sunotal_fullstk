import { Router, Request, Response } from 'express';

const router = Router();

// In-memory Procurement Store
const quotationsStore: any[] = [
  {
    id: 'QUOTE-101',
    vendorId: 'VENDOR-001',
    vendorName: 'Farmer Ramesh Kumar',
    produceName: 'Organic Fresh Tomatoes',
    quantityKg: 500,
    expectedHarvestDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    pricePerKg: 35,
    status: 'ACCEPTED',
    submittedAt: new Date(Date.now() - 86400000).toISOString()
  }
];

// 1. Submit Produce Harvest Quotation
router.post('/quotations', (req: Request, res: Response) => {
  const { vendorId, produceName, quantityKg, expectedHarvestDate, pricePerKg } = req.body;
  
  const quotation = {
    id: `QUOTE-${Date.now().toString().slice(-6)}`,
    vendorId: vendorId || 'VENDOR-001',
    produceName: produceName || 'Organic Fresh Tomatoes',
    quantityKg: Number(quantityKg) || 500,
    expectedHarvestDate: expectedHarvestDate || new Date(Date.now() + 86400000 * 2).toISOString(),
    pricePerKg: Number(pricePerKg) || 35,
    status: 'PENDING_HUB_REVIEW',
    submittedAt: new Date().toISOString()
  };

  quotationsStore.push(quotation);
  return res.status(201).json({ success: true, quotation });
});

// 2. Get Vendor Quotation History & QC Slips
router.get('/quotations', (req: Request, res: Response) => {
  return res.json({ success: true, quotations: quotationsStore });
});

// 3. Approve / Reject Quotation
router.patch('/quotations/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const quote = quotationsStore.find(q => q.id === id);
  if (quote) {
    quote.status = status || 'ACCEPTED';
  }

  return res.json({ success: true, message: `Quotation ${id} status updated to ${status || 'ACCEPTED'}`, quotation: quote });
});

// 4. Batch Labeling & Expiry Generator (Lot ID & Expiry Date)
router.post('/batch-label', (req: Request, res: Response) => {
  const { skuId, produceName, harvestDate, shelfLifeDays } = req.body;
  const days = Number(shelfLifeDays) || 7;
  const expiryDate = new Date(Date.now() + 86400000 * days).toISOString();
  
  const batchLabel = {
    lotId: `LOT-${Math.floor(100000 + Math.random() * 900000)}`,
    skuId: skuId || 'SKU-TOMATO-01',
    produceName: produceName || 'Organic Tomatoes',
    harvestDate: harvestDate || new Date().toISOString(),
    expiryDate,
    barcode: `890${Math.floor(1000000009 + Math.random() * 900000000)}`,
    qcStatus: 'PASSED_GRADE_A'
  };

  return res.json({ success: true, batchLabel });
});

export default router;
