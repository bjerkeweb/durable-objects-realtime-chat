// server responses
interface UserSession {
  username: string;
  userId: string;
  joinedAt: number;
}

interface BaseServerEvent {
  timestamp: number;
  userId: string;
  username: string;
}

interface UserJoined extends BaseServerEvent {
  type: 'user_joined';
  users: UserSession[];
}

interface UserLeft extends BaseServerEvent {
  type: 'user_left';
  users: UserSession[];
}

interface UserMessage extends BaseServerEvent {
  type: 'message';
  content?: string;
}

interface RecentMessages extends BaseServerEvent {
  type: 'recent_messages';
  messages: ServerMessage[];
}

export type ServerMessage =
  | UserJoined
  | UserLeft
  | UserMessage
  | RecentMessages;

// client messages
interface BaseClientEvent {
  username: string;
  userId: string;
  timestamp: number;
  messageId?: string;
}

interface ClientJoin extends BaseClientEvent {
  type: 'join';
}

interface ClientLeave extends BaseClientEvent {
  type: 'leave';
}

interface ClientSendMessage extends BaseClientEvent {
  type: 'message';
  content: string;
}

export type ClientMessage = ClientJoin | ClientLeave | ClientSendMessage;
