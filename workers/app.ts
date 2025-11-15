import { createRequestHandler } from 'react-router';
import api from './hono';

export { ChatWebSocketServer } from './chat-durable-object';

declare module 'react-router' {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env, ctx) {
    // conditional routing
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api')) {
      return api.fetch(request, env, ctx);
    }

    // otherwise let react router handle it
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<Env>;
