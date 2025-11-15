import { Hono } from 'hono';

const api = new Hono<{ Bindings: Env }>();

api.get('/api/hello', (c) => {
  return c.json({ message: 'Hello' });
});

export default api;
