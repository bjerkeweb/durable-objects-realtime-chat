import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useWebSocket from '~/hooks/useWebSocket';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Menu, X, Users as UsersIcon } from 'lucide-react';
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
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sortedUsers = useMemo(() => {
    const usersCopy = [...users];

    usersCopy.sort((a, b) => {
      const aIsYou = a.userId === userId;
      const bIsYou = b.userId === userId;

      if (aIsYou && !bIsYou) {
        return -1;
      }

      if (!aIsYou && bIsYou) {
        return 1;
      }

      return a.username.localeCompare(b.username);
    });

    return usersCopy;
  }, [users, userId, username]);

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
    const isModifierKey = e.metaKey || e.shiftKey || e.ctrlKey || e.altKey;

    if (!isModifierKey) {
      sendTypingEvent();
    }

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
    if (message.type === 'typing_update') return null;

    if (message.type === 'user_joined') {
      return (
        <div key={index} className="text-center my-2">
          <div className="inline-block bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-xs">
            {message.userId === userId ? 'You' : message.username} joined
          </div>
        </div>
      );
    }

    if (message.type === 'user_left') {
      return (
        <div key={index} className="text-center my-2">
          <div className="inline-block bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-3 py-1 rounded-full text-xs">
            {message.username} left
          </div>
        </div>
      );
    }

    if (message.type === 'message' && message.content) {
      const isMe = message.username === username;
      return (
        <div
          key={index}
          className={`flex flex-col mb-4 ${isMe ? 'items-end' : 'items-start'}`}
        >
          <div
            className={`max-w-[85%] sm:max-w-[70%] py-2 px-3 rounded-2xl ${
              isMe
                ? 'bg-blue-500 text-white rounded-br-none'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none'
            }`}
          >
            <p className="text-sm wrap-break-word">{message.content}</p>
          </div>
          <div
            className={`text-xs mt-1 ${
              isMe
                ? 'text-gray-500 dark:text-gray-400 text-right'
                : 'text-gray-500 dark:text-gray-400 text-left'
            }`}
          >
            {!isMe && (
              <span className="font-medium mr-1">{message.username}</span>
            )}
            {formatTime(message.timestamp)}
          </div>
        </div>
      );
    }
  };

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;

    const typingText =
      typingUsers.length === 1
        ? `${typingUsers[0]} is typing...`
        : `${typingUsers.length} people typing...`;

    return (
      <div className="absolute bottom-2 left-4 z-10 pointer-events-none select-none text-xs text-gray-500 dark:text-gray-400 italic">
        {typingText}
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100dvh-2rem)] md:h-[600px] max-w-4xl w-full border rounded-lg overflow-hidden bg-white dark:bg-slate-950 relative shadow-sm">
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="p-3 md:p-4 border-b flex justify-between items-center bg-white dark:bg-slate-900 z-10">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-semibold truncate max-w-[150px] sm:max-w-xs">
                #{roomName}
              </h2>
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline-block">
              {isConnected ? 'Online' : 'Disconnected'}
            </span>
          </div>

          {/* Mobile Sidebar Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          >
            {showMobileSidebar ? (
              <X className="h-5 w-5" />
            ) : (
              <div className="relative">
                <UsersIcon className="h-5 w-5" />
                <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] px-1.5 rounded-full min-w-[16px] text-center">
                  {users.length}
                </span>
              </div>
            )}
          </Button>

          {/* Desktop User Count */}
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-medium">{users.length} online</span>
          </div>
        </div>

        {/* Messages Area Wrapper */}
        <div className="flex-1 relative min-h-0 bg-gray-50/50 dark:bg-slate-950">
          {/* Scrollable Content */}
          <div className="absolute inset-0 overflow-y-auto p-3 md:p-4 pb-6 md:pb-8">
            {messages.map((message, idx) => renderMessage(message, idx))}
            <div ref={messagesEndRef} />
          </div>

          {/* Floating Indicator */}
          {renderTypingIndicator()}
        </div>

        {/* Input Area */}
        <div className="p-3 md:p-4 border-t bg-white dark:bg-slate-900">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              className="flex-1 text-base" // Keeping text-base here to prevent iOS zooming
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
            />
            <Button
              onClick={sendMessage}
              disabled={inputMessage.length === 0}
              size="default"
            >
              Send
            </Button>
          </div>
        </div>
      </div>

      {/* Users Sidebar */}
      <div
        className={`
          absolute md:relative z-20 top-[60px] md:top-0 bottom-0 right-0
          w-64 bg-gray-100 dark:bg-gray-900 border-l shadow-lg md:shadow-none
          transition-transform duration-300 ease-in-out
          ${
            showMobileSidebar
              ? 'translate-x-0'
              : 'translate-x-full md:translate-x-0'
          }
          flex flex-col
        `}
      >
        <div className="p-4 pb-0 bg-gray-100 dark:bg-gray-900">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Online Users ({users.length})
          </h3>
        </div>
        <ScrollArea className="flex-1 p-4">
          {sortedUsers.map((user) => (
            <div key={user.userId} className="flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 text-sm font-semibold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-900"></span>
              </div>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-[140px]">
                {user.username} {user.username === username ? '(You)' : ''}
              </span>
            </div>
          ))}
        </ScrollArea>
      </div>

      {showMobileSidebar && (
        <div
          className="absolute inset-0 bg-black/20 z-10 md:hidden top-[60px]"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}
    </div>
  );
};

export default Chat;
