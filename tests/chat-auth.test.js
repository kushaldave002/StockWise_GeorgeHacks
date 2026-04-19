const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveChatIdentity } = require('../utils/chat-auth');

test('resolveChatIdentity prefers explicit request values', () => {
  const identity = resolveChatIdentity(
    { role: 'owner', storeId: 'store-123' },
    { role: 'customer', storeId: 'store-999' }
  );

  assert.deepEqual(identity, { role: 'owner', storeId: 'store-123' });
});

test('resolveChatIdentity falls back to JWT user when body omits role and storeId', () => {
  const identity = resolveChatIdentity(
    { message: 'insights' },
    { role: 'owner', storeId: 'store-123' }
  );

  assert.deepEqual(identity, { role: 'owner', storeId: 'store-123' });
});

test('resolveChatIdentity preserves missing storeId for customers', () => {
  const identity = resolveChatIdentity(
    { message: 'where can I find bananas?' },
    { role: 'customer', ward: 7 }
  );

  assert.deepEqual(identity, { role: 'customer', storeId: null });
});
