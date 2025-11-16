import { useEffect, useRef, useState } from 'react';
import Chat from '~/components/Chat';

import type { Route } from './+types/room';
import UsernamePrompt from '~/components/UsernamePrompt';

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const username = formData.get('username');

  const user = {
    username: String(username),
    userId: crypto.randomUUID(),
  };

  sessionStorage.setItem('chat-user', JSON.stringify(user));
  return { user };
}

export function clientLoader() {
  const storedUser = sessionStorage.getItem('chat-user');
  if (storedUser) {
    return { user: JSON.parse(storedUser) };
  }
  return { user: undefined };
}

export default function Room({ params, loaderData }: Route.ComponentProps) {
  if (!loaderData.user) {
    return <UsernamePrompt roomName={params.room} />;
  }

  return (
    <Chat
      username={loaderData.user.username}
      userId={loaderData.user.userId}
      roomName={params.room}
    />
  );
}
