import { useCallback, useEffect, useRef, useState } from 'react';
import useWebSocket from '~/hooks/useWebSocket';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import type { ServerMessage } from 'types/types';

interface ChatProps {
  username: string;
  userId: string;
  roomName: string;
}

interface User {
  username: string;
  userId: string;
  joinedAt: number;
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString();
};

const Chat: React.FC<ChatProps> = ({ username, userId, roomName }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ServerMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMessage = useCallback(
    (msg: ServerMessage) => {
      if (msg.type === 'recent_messages') {
        setMessages((prev) => [...prev, ...msg.messages]);
        return;
      }

      if (msg.type === 'user_joined' || msg.type === 'user_left') {
        setUsers(msg.users || []);
      }

      if (msg.type === 'typing_update') {
        setTypingUsers(msg.usersTyping.filter((u) => u !== username));
        return;
      }

      setMessages((prev) => [...prev, msg]);
    },
    [username],
  );

  const { sendEvent, isConnected } = useWebSocket({
    room: roomName,
    handleMessage,
    onConnect: () =>
      sendEvent({
        type: 'join',
        username,
        userId,
        timestamp: Date.now(),
      }),
    onClose: () => {
      sendEvent({
        type: 'leave',
        username,
        userId,
        timestamp: Date.now(),
      });
      if (isTypingRef.current) {
        sendEvent({
          type: 'stopped_typing',
          username,
          userId,
          timestamp: Date.now(),
        });
        isTypingRef.current = false;
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      }
    },
  });

  const [inputMessage, setInputMessage] = useState('');

  const sendTypingEvent = useCallback(() => {
    if (!isConnected) {
      return;
    }
    if (!isTypingRef.current) {
      sendEvent({
        type: 'typing',
        username,
        userId,
        timestamp: Date.now(),
      });
      isTypingRef.current = true;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // if user stops typing for 2 seconds, send stopped_typing
    typingTimeoutRef.current = setTimeout(() => {
      sendEvent({
        type: 'stopped_typing',
        username,
        userId,
        timestamp: Date.now(),
      });
      isTypingRef.current = false;
    }, 2000);
  }, [isConnected, username, userId, sendEvent]);

  const sendMessage = () => {
    if (!inputMessage.trim()) {
      return;
    }

    sendEvent({
      type: 'message',
      content: inputMessage.trim(),
      timestamp: Date.now(),
      username,
      userId,
    });
    setInputMessage('');

    if (isTypingRef.current) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      sendEvent({
        type: 'stopped_typing',
        username,
        userId,
        timestamp: Date.now(),
      });
      isTypingRef.current = false;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    sendTypingEvent();

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    sendTypingEvent();
  };

  const renderMessage = (message: ServerMessage, index: number) => {
    if (message.type === 'typing_update') {
      return null;
    }
    if (message.type === 'user_joined') {
      return (
        <div key={index} className="text-center">
          <div className="inline-block bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm mb-2">
            {message.userId === userId ? 'You' : message.username} joined the
            room
          </div>
        </div>
      );
    }

    if (message.type === 'user_left') {
      return (
        <div key={index} className="text-center">
          <div className="inline-block bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-3 py-1 rounded-full text-sm mb-2">
            {message.username} left the room
          </div>
        </div>
      );
    }

    if (message.type === 'message' && message.content) {
      return (
        <div
          key={index}
          className={`flex flex-col mb-4 ${
            message.username === username ? 'items-end' : 'items-start'
          }`}
        >
          <div
            className={`max-w-[70%] py-1.5 px-3 rounded-lg ${
              message.username === username
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-800'
            }`}
          >
            <p className="text-sm">{message.content}</p>
          </div>
          <div
            className={`text-xs mt-1 ${
              message.username === username
                ? 'text-gray-500 dark:text-gray-400 text-right'
                : 'text-gray-500 dark:text-gray-400 text-left'
            }`}
          >
            {message.username === username ? 'You' : message.username} at{' '}
            {formatTime(message.timestamp)}
          </div>
        </div>
      );
    }
  };

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) {
      return null;
    }

    const typingText =
      typingUsers.length === 1
        ? `${typingUsers[0]} is typing...`
        : `${typingUsers.slice(0, -1).join(', ')} and ${
            typingUsers[typingUsers.length - 1]
          } are typing...`;

    return (
      <div className="p-2 pl-5 text-xs text-gray-500 dark:text-gray-400 italic">
        {typingText}
      </div>
    );
  };

  return (
    <div className="flex grow h-[600px] max-w-4xl border rounded-lg overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Room Title Area */}
        <div className="p-4 border-b flex justify-between">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold">#{roomName}</h2>
            <span className="text-xs">{users.length} users online</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 dark:text-gray-400">
              {isConnected ? 'Online' : 'Disconnected'}
            </span>
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
          </div>
        </div>
        {/* This is the div that will hold your messages and allow them to scroll */}
        {/* It takes up all available space and applies its own vertical scrolling */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((message, idx) => renderMessage(message, idx))}
          <div ref={messagesEndRef}></div>
        </div>

        {renderTypingIndicator()}

        {/* Input area remains fixed at the bottom */}
        <div className="flex p-4 border-t gap-2">
          <Input
            placeholder="Type your message..."
            className="flex-1"
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
          />
          <Button onClick={sendMessage} disabled={inputMessage.length === 0}>
            Send
          </Button>
        </div>
      </div>

      {/* Online Users Sidebar */}
      <div className="w-64 border-l bg-gray-100 dark:bg-gray-800 p-4 flex flex-col">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-50">
          Users
        </h3>
        <ScrollArea className="flex-1">
          {users.map((user) => (
            <div key={user.userId} className="flex items-center gap-3 mb-3">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {user.username} {user.username === username ? '(You)' : ''}
              </span>
              <span className="h-2 w-2 rounded-full bg-green-500 ml-auto"></span>{' '}
              {/* Online indicator */}
            </div>
          ))}
        </ScrollArea>
      </div>
    </div>
  );
};

export default Chat;
