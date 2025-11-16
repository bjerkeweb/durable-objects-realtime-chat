import { Form, redirect } from 'react-router';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

import type { Route } from './+types/join';

export async function clientAction({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const username = formData.get('username');
  const room = formData.get('room');

  // store username
  sessionStorage.setItem(
    'chat-user',
    JSON.stringify({
      username,
      userId: crypto.randomUUID(),
    }),
  );

  // navigate to room
  return redirect(`/room/${encodeURIComponent(String(room))}`);
}

export default function Join() {
  return (
    <Form method="post">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Join or Create a Room</CardTitle>
          <CardDescription>
            Enter your details to start chatting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                placeholder="Your username"
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="roomName">Room Name</Label>
              <Input id="roomName" name="room" placeholder="Name of the room" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="submit">Submit</Button>
        </CardFooter>
      </Card>
    </Form>
  );
}
