import { useEffect, useState } from 'react';
import useWebSocket from '~/hooks/useWebSocket';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { ScrollArea } from '~/components/ui/scroll-area';

type MessageType = 'message' | 'join' | 'leave';

interface Message {
  type: MessageType;
  content?: string;
  timestamp: number;
  userId?: string;
  userName?: string;
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString();
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);

  const handleMessage = (e: Message) => {
    setMessages((prev) => [...prev, e]);
  };

  const sendEvent = useWebSocket(handleMessage);

  const [inputMessage, setInputMessage] = useState('');

  const sendMessage = () => {
    if (!inputMessage.trim()) {
      return;
    }

    const message = {
      type: 'message',
      content: inputMessage.trim(),
      timestamp: Date.now(),
    };

    sendEvent(message);
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const onlineUsers = [
    { id: 'u1', name: 'Alice', avatar: '/avatars/alice.jpg' },
    { id: 'u2', name: 'Bob', avatar: '/avatars/bob.jpg' },
    { id: 'u3', name: 'Charlie', avatar: '/avatars/charlie.jpg' },
    { id: 'u4', name: 'Diana', avatar: '/avatars/diana.jpg' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="flex grow h-[600px] max-w-4xl border rounded-lg overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex flex-col flex-1">
          <ScrollArea className="flex-1 p-4">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex flex-col mb-4 ${
                  message.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
                <div
                  className={`text-xs mt-1 ${
                    message.sender === 'user'
                      ? 'text-gray-500 dark:text-gray-400 text-right'
                      : 'text-gray-500 dark:text-gray-400 text-left'
                  }`}
                >
                  {message.sender === 'user' ? 'You' : 'AI'} at{' '}
                  {formatTime(message.timestamp)}
                </div>
              </div>
            ))}
          </ScrollArea>
          <div className="flex p-4 border-t gap-2">
            <Input
              placeholder="Type your message..."
              className="flex-1"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
            />
            <Button onClick={sendMessage}>Send</Button>
          </div>
        </div>

        {/* Online Users Sidebar */}
        <div className="w-64 border-l bg-gray-100 dark:bg-gray-800 p-4 flex flex-col">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-50">
            Online Users
          </h3>
          <ScrollArea className="flex-1">
            {onlineUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-3 mb-3">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {user.name}
                </span>
                <span className="h-2 w-2 rounded-full bg-green-500 ml-auto"></span>{' '}
                {/* Online indicator */}
              </div>
            ))}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
