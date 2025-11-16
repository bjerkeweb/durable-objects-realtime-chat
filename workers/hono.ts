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

export default api;
