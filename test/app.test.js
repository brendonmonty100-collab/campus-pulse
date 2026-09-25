const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../app');

beforeEach(() => {
  app.resetForTests();
});

test('GET /health returns ok status', async () => {
  const server = app.listen(0);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const res = await fetch(`${base}/health`);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.status, 'ok');
  } finally {
    server.close();
  }
});

test('POST /feedback adds a new entry and it appears in /api/feedback', async () => {
  const server = app.listen(0);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;

    const res = await fetch(`${base}/feedback`, {
      method: 'POST',
      body: new URLSearchParams({
        category: 'Mess',
        mood: 'Bad',
        message: 'Food quality has dropped this week',
      }),
      redirect: 'manual',
    });

    assert.equal(res.status, 302);

    const list = await (await fetch(`${base}/api/feedback`)).json();
    assert.equal(list.length, 1);
    assert.equal(list[0].category, 'Mess');
    assert.equal(list[0].mood, 'Bad');
    assert.equal(list[0].status, 'unresolved');
  } finally {
    server.close();
  }
});

test('POST /feedback rejects a request missing required fields', async () => {
  const server = app.listen(0);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;

    const res = await fetch(`${base}/feedback`, {
      method: 'POST',
      body: new URLSearchParams({ category: 'Hostel' }), // missing mood, message
    });

    assert.equal(res.status, 400);
  } finally {
    server.close();
  }
});

test('POST /feedback rejects an invalid mood value', async () => {
  const server = app.listen(0);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;

    const res = await fetch(`${base}/feedback`, {
      method: 'POST',
      body: new URLSearchParams({
        category: 'Hostel',
        mood: 'Furious', // not a valid mood
        message: 'Water supply is irregular',
      }),
    });

    assert.equal(res.status, 400);
  } finally {
    server.close();
  }
});

test('POST /feedback/:id/address marks an entry as addressed', async () => {
  const server = app.listen(0);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;

    await fetch(`${base}/feedback`, {
      method: 'POST',
      body: new URLSearchParams({
        category: 'Transport',
        mood: 'Okay',
        message: 'Bus was 10 minutes late',
      }),
    });

    const list = await (await fetch(`${base}/api/feedback`)).json();
    const entryId = list[0].id;

    const addressRes = await fetch(`${base}/feedback/${entryId}/address`, {
      method: 'POST',
      redirect: 'manual',
    });
    assert.equal(addressRes.status, 302);

    const updated = await (await fetch(`${base}/api/feedback`)).json();
    assert.equal(updated[0].status, 'addressed');
  } finally {
    server.close();
  }
});