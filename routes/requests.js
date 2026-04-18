const router = require('express').Router();
const Request = require('../models/Request');
const Store = require('../models/Store');
const Listing = require('../models/Listing');

router.post('/', async (req, res) => {
  const { customerName, item, ward } = req.body;
  const regex = new RegExp(item, 'i');

  // Search ALL stores
  const allStores = await Store.find({
    'inventory.item': regex
  }).then(stores => stores.filter(s =>
    s.inventory.some(inv => regex.test(inv.item) && inv.qty > 0)
  ));

  // Split into same ward vs other wards
  const sameWard = allStores.filter(s => s.ward === ward);
  const otherWards = allStores.filter(s => s.ward !== ward);

  // Find customer's closest store in their ward (for transfer destination)
  const localStores = await Store.find({ ward });

  // Check marketplace listings
  const listings = await Listing.find({
    item: regex,
    claimed: false,
    expiry: { $gt: new Date() }
  }).populate('store', 'name address ward');

  let fulfillment, sourceStore, destinationStore, status, estimatedReady;
  const now = new Date();

  if (sameWard.length > 0) {
    // TIER 1: Same ward — pickup
    fulfillment = 'pickup';
    sourceStore = sameWard[0]._id;
    status = 'reserved';
    estimatedReady = now; // ready now
  } else if (otherWards.length > 0) {
    // TIER 2: Different ward — transfer to customer's local store
    fulfillment = 'transfer';
    sourceStore = otherWards[0]._id;
    destinationStore = localStores.length > 0 ? localStores[0]._id : undefined;
    status = 'pending';
    // Next delivery run — estimate tomorrow
    estimatedReady = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  } else {
    // TIER 3: Nobody has it — DCCK request
    fulfillment = 'dcck';
    destinationStore = localStores.length > 0 ? localStores[0]._id : undefined;
    status = 'pending';
    // DCCK delivery cycle — estimate within a week
    estimatedReady = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  }

  const request = await Request.create({
    customerName, item, ward,
    matched: fulfillment !== 'dcck',
    fulfillment, sourceStore, destinationStore,
    status, estimatedReady
  });

  // Populate store names for response
  await request.populate('sourceStore', 'name address ward');
  await request.populate('destinationStore', 'name address ward');

  res.json({
    success: true,
    fulfillment,
    request: {
      id: request._id,
      status: request.status,
      estimatedReady: request.estimatedReady
    },
    sameWardStores: sameWard.map(s => ({
      name: s.name,
      address: s.address,
      ward: s.ward,
      stock: s.inventory.find(inv => regex.test(inv.item))
    })),
    otherWardStores: otherWards.map(s => ({
      name: s.name,
      address: s.address,
      ward: s.ward,
      stock: s.inventory.find(inv => regex.test(inv.item))
    })),
    destinationStore: request.destinationStore ? {
      name: request.destinationStore.name,
      address: request.destinationStore.address,
      ward: request.destinationStore.ward
    } : null,
    listings: listings.map(l => ({
      store: l.store.name,
      address: l.store.address,
      ward: l.store.ward,
      qty: l.qty,
      price: l.price,
      expiry: l.expiry
    }))
  });
});

// Get recent requests
router.get('/', async (req, res) => {
  const requests = await Request.find()
    .sort({ timestamp: -1 })
    .limit(20)
    .populate('sourceStore', 'name')
    .populate('destinationStore', 'name');
  res.json(requests);
});

// Update request status (for store owners / DCCK)
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const request = await Request.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  ).populate('sourceStore', 'name').populate('destinationStore', 'name');
  if (!request) return res.status(404).json({ error: 'Request not found' });
  res.json(request);
});

module.exports = router;
