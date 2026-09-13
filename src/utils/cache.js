const { LRUCache } = require('lru-cache');

const cache = new LRUCache({ max: 200, ttl: 1000 * 60 });

// Separate from `cache` so per-user auth entries can't evict feed/discover
// entries. Short TTL: a deleted or edited user is stale for at most 30s on
// any path that doesn't invalidate explicitly.
const userCache = new LRUCache({ max: 500, ttl: 1000 * 30 });

module.exports = { cache, userCache };
