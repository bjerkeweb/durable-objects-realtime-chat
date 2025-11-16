import { Label } from '@radix-ui/react-label';
import { Form } from 'react-router';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';

const UsernamePrompt: React.FC<{ roomName: string }> = ({ roomName }) => {
  return (
    <Form method="post">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Join #{roomName}</CardTitle>
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
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="submit">Join Room</Button>
        </CardFooter>
      </Card>
    </Form>
  );
};

export default UsernamePrompt;
