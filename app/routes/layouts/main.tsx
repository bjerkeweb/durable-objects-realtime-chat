import { Outlet } from 'react-router';

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Outlet />
    </div>
  );
}
