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
import { useRef } from 'react';

const UsernamePrompt: React.FC<{ roomName: string; hasError: boolean }> = ({
  roomName,
  hasError,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Form method="post" onSubmit={() => inputRef.current?.blur()}>
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
                ref={inputRef}
                id="username"
                name="username"
                placeholder="Your username"
                className={hasError ? 'border-destructive' : ''}
              />
              {hasError && (
                <p className="text-xs text-destructive">
                  Username already taken
                </p>
              )}
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
