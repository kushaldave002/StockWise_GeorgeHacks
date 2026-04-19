function resolveChatIdentity(body = {}, user = null) {
  return {
    role: body.role || user?.role || null,
    storeId: body.storeId || user?.storeId || null
  };
}

module.exports = { resolveChatIdentity };
