import { useEffect, useRef, useState } from 'react';
import Chat from '~/components/Chat';

import type { Route } from './+types/room';
import UsernamePrompt from '~/components/UsernamePrompt';
import type { UsernameCheckResponse } from './join';

export async function clientAction({
  request,
  params,
}: Route.ClientActionArgs) {
  const formData = await request.formData();
  const username = formData.get('username');
  const room = params.room;

  const response = await fetch(
    `/api/${room}/check-username?username=${username}`,
    {
      method: 'GET',
    },
  );
  const json = (await response.json()) as UsernameCheckResponse;

  if (json.exists) {
    return { error: true };
  }

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

export default function Room({
  params,
  loaderData,
  actionData,
}: Route.ComponentProps) {
  if (!loaderData.user) {
    return (
      <UsernamePrompt hasError={!!actionData?.error} roomName={params.room} />
    );
  }

  return (
    <Chat
      username={loaderData.user.username}
      userId={loaderData.user.userId}
      roomName={params.room}
    />
  );
}
