// server responses
interface UserSession {
  username: string;
  userId: string;
  joinedAt: number;
}

interface BaseServerEvent {
  timestamp: number;
}

interface UserJoined extends BaseServerEvent {
  type: 'user_joined';
  userId: string;
  username: string;
  users: UserSession[];
}

export interface UserLeft extends BaseServerEvent {
  type: 'user_left';
  userId: string;
  username: string;
  users: UserSession[];
}

export interface ServerUserMessage extends BaseServerEvent {
  type: 'message';
  content: string;
  userId: string;
  username: string;
}

export interface RecentMessages extends BaseServerEvent {
  type: 'recent_messages';
  messages: ServerUserMessage[];
}

export type ServerMessage =
  | UserJoined
  | UserLeft
  | ServerUserMessage
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

export interface ClientLeave extends BaseClientEvent {
  type: 'leave';
}

export interface ClientSendMessage extends BaseClientEvent {
  type: 'message';
  content: string;
}

export type ClientMessage = ClientJoin | ClientLeave | ClientSendMessage;
