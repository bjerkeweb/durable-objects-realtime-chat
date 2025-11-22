import { Hono } from 'hono';

const api = new Hono<{ Bindings: Env }>();

api.get('/api/hello', (c) => {
  return c.json({ message: 'Hello' });
});

// websocket endpoint
api.get('/api/ws/:room?', (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return c.text('Expected websocket', 400);
  }

  const room = c.req.param('room') || 'general';

  const id = c.env.CHAT_SERVER.idFromName(`chat-room-${room}`);
  const stub = c.env.CHAT_SERVER.get(id);

  return stub.fetch(c.req.raw);
});

api.get('/api/:room/check-username', async (c) => {
  const room = c.req.param('room');
  const username = c.req.query('username');

  if (!room) {
    return c.json({ error: 'Mission room name' }, 400);
  }

  if (!username) {
    return c.json({ error: 'Missing username query param' }, 400);
  }

  const id = c.env.CHAT_SERVER.idFromName(`chat-room-${room}`);
  const stub = c.env.CHAT_SERVER.get(id);

  const doUrl = new URL(c.req.url); // start with req URL
  doUrl.pathname = '/check-username'; // change to match DO internal path
  doUrl.searchParams.set('username', username);

  const response = await stub.fetch(
    new Request(doUrl.toString(), { method: 'GET' }),
  );

  return response;
});

export default api;
