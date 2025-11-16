import {
  type RouteConfig,
  index,
  layout,
  route,
} from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  layout('routes/layouts/main.tsx', [
    route('/chat/:room', 'routes/chat.tsx'),
    route('/join', 'routes/join.tsx'),
  ]),
] satisfies RouteConfig;
