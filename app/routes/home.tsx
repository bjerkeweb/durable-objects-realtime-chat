import type { Route } from './+types/home';
import { redirect } from 'react-router';

export async function loader() {
  return redirect('/join');
}
