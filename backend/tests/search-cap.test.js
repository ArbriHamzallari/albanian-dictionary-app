const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const queries = [];
let nextCount = 0;
let stubCount = 0;

const stubPool = {
  async query(sql, params) {
    queries.push({ sql, params });
    return { rows: [{ count: stubCount }] };
  },
};

const dbPath = require.resolve('../src/utils/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: stubPool,
};

const { enforceDailySearchLimit } = require('../src/middleware/entitlements');

function makeReq({ isPremium = false } = {}) {
  return {
    entitlement: { isPremium },
    user: { uuid: '00000000-0000-0000-0000-000000000001' },
    ip: '127.0.0.1',
  };
}

function makeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function next() {
  nextCount += 1;
}

beforeEach(() => {
  queries.length = 0;
  nextCount = 0;
  stubCount = 0;
});

test('lets free users search when their daily successful count is below five', async () => {
  stubCount = 4;
  const res = makeRes();

  await enforceDailySearchLimit(makeReq(), res, next);

  assert.equal(nextCount, 1);
  assert.equal(res.statusCode, null);
  assert.equal(queries.length, 1);
});

test('caps free users when their daily successful count is five', async () => {
  stubCount = 5;
  const res = makeRes();

  await enforceDailySearchLimit(makeReq(), res, next);

  assert.equal(nextCount, 0);
  assert.equal(res.statusCode, 402);
  assert.equal(res.body.code, 'DAILY_SEARCH_LIMIT_REACHED');
});

test('does not cap premium users at the sixth daily search', async () => {
  stubCount = 5;
  const res = makeRes();

  await enforceDailySearchLimit(makeReq({ isPremium: true }), res, next);

  assert.equal(nextCount, 1);
  assert.equal(res.statusCode, null);
  assert.equal(queries.length, 0);
});
