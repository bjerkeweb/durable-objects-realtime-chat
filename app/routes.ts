import {
  type RouteConfig,
  index,
  layout,
  route,
} from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  layout('routes/layouts/main.tsx', [
    route('/room/:room', 'routes/room.tsx'),
    route('/join', 'routes/join.tsx'),
  ]),
] satisfies RouteConfig;
