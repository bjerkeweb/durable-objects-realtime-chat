import { DurableObject } from 'cloudflare:workers';
import type {
  ClientLeave,
  ClientMessage,
  ClientSendMessage,
  RecentMessages,
  ServerMessage,
  ServerUserMessage,
  UserLeft,
} from 'types/types';

interface UserSession {
  username: string;
  userId: string;
  joinedAt: number;
}

const MAX_MESSAGES = 20;
const MESSAGE_STORAGE_PREFIX = 'message_';

export class ChatWebSocketServer extends DurableObject<Env> {
  private sessions: Map<WebSocket, UserSession>;
  private recentMessages: ServerUserMessage[] = []; // store recent messages in memory
  private alarmPeriod: number;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sessions = new Map();

    this.alarmPeriod = 24 * 60 * 60 * 1000; // 24 hours

    this.ensureAlarmScheduled();

    // wake up any hibernating WebSockets and place them back in sessions Map
    this.ctx.getWebSockets().forEach((ws) => {
      // check for previously attached state
      const attachment = ws.deserializeAttachment();
      if (attachment) {
        this.sessions.set(ws, { ...attachment });
      }
    });

    // sets an app level auto response that doesn't wake hibernated websockets
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('ping', 'pong'),
    );

    // fetch recent messages when on wake up
    this.initializeRecentMessages();
  }

  private async ensureAlarmScheduled() {
    const currentAlarm = this.ctx.storage.getAlarm();
    if (currentAlarm !== null) {
      await this.ctx.storage.setAlarm(Date.now() + this.alarmPeriod);
      console.log('initial alarm scheduled');
    }
  }

  async alarm() {
    console.log('alarm fired, deleting old storage');

    const allKeys = await this.ctx.storage.list();
    for (const [key, value] of allKeys) {
      await this.ctx.storage.delete(key);
      console.log('deleted msg', value);
    }

    // After deletion, reschedule the alarm for the next period
    await this.ctx.storage.setAlarm(Date.now() + this.alarmPeriod);
    console.log('Next alarm scheduled.');
  }

  private async initializeRecentMessages() {
    // get all keys that start with our message prefix
    const messageKeys = await this.ctx.storage.list({
      prefix: MESSAGE_STORAGE_PREFIX,
      limit: MAX_MESSAGES,
      reverse: true, // get most recent first
    });

    const messages: ServerUserMessage[] = [];
    for (const [key, value] of messageKeys) {
      messages.push(value as ServerUserMessage);
    }

    // sort by timestamp in ascending order to have oldest first
    this.recentMessages = messages.sort((a, b) => a.timestamp - b.timestamp);

    // Send the recent messages to any new client connecting
    // This part will be handled when a client connects in `handleJoinRoom`
    // to ensure the messages are sent to the correct client.
  }

  async fetch(): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // calling this.ctx.acceptWebSocket() instead of ws.accept() informs the runtime
    // that the socket is hibernatable and can be reconstructed after sleep
    this.ctx.acceptWebSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    // Convert ArrayBuffer to string if necessary
    const messageString =
      typeof message === 'string' ? message : new TextDecoder().decode(message);

    let messageData: ClientMessage;
    try {
      messageData = JSON.parse(messageString);
    } catch {
      throw new Error('message parse error');
    }

    // handle different message types
    switch (messageData.type) {
      case 'join':
        await this.handleJoinRoom(ws, messageData);
        break;
      case 'leave':
        this.handleLeaveRoom(ws, messageData);
        break;
      case 'message':
        this.storeAndBroadCastMessage(messageData);
        break;
      default:
        console.log('default');
        return;
    }
  }

  private handleLeaveRoom(ws: WebSocket, data: ClientLeave) {
    const session = this.sessions.get(ws);
    if (!session) {
      return;
    }
    const { username, userId } = session;
    console.log('leave room', { username, userId });

    // remove session
    this.sessions.delete(ws);

    const leaveMessage: UserLeft = {
      type: 'user_left',
      username,
      userId,
      timestamp: Date.now(),
      users: Array.from(this.sessions.values()),
    };

    this.broadcastMessage(leaveMessage);
  }

  private async handleJoinRoom(ws: WebSocket, data: ClientMessage) {
    const { username, userId } = data;
    console.log('join room', { username, userId });

    // store user session
    this.sessions.set(ws, {
      username,
      userId,
      joinedAt: Date.now(),
    });

    ws.serializeAttachment({
      username,
      userId,
      joinedAt: Date.now(),
    });

    // send recent messages to newly joined client
    if (this.recentMessages.length > 0) {
      const recentMessagesEvent: RecentMessages = {
        type: 'recent_messages',
        timestamp: Date.now(),
        messages: this.recentMessages,
      };
      ws.send(JSON.stringify(recentMessagesEvent));
    }
    ``;
    const joinMessage: ServerMessage = {
      type: 'user_joined',
      username,
      userId,
      timestamp: Date.now(),
      users: Array.from(this.sessions.values()),
    };

    // notify all users that someone joined
    this.broadcastMessage(joinMessage);
  }

  private async storeAndBroadCastMessage(clientMessage: ClientSendMessage) {
    const storedMessage: ServerUserMessage = {
      type: 'message',
      userId: clientMessage.userId,
      username: clientMessage.username,
      content: clientMessage.content,
      timestamp: Date.now(),
    };

    // Store the message in Durable Object storage
    // We'll use a prefix + timestamp + messageId for the key to allow
    // efficient listing of recent messages.
    const messageId = clientMessage.messageId || crypto.randomUUID();
    const storageKey = `${MESSAGE_STORAGE_PREFIX}${storedMessage.timestamp}_${messageId}`;
    await this.ctx.storage.put(storageKey, storedMessage);

    // Update the in-memory recent messages
    this.recentMessages.push(storedMessage);
    if (this.recentMessages.length > MAX_MESSAGES) {
      // Remove the oldest message from memory
      this.recentMessages.shift();

      // Optionally, you could also clean up older messages from storage here
      // This is more complex as you'd need to identify and delete the oldest key.
      // For now, let's just keep the in-memory array capped.
    }

    // Broadcast the message to all connected clients
    this.broadcastMessage(storedMessage);
  }

  private broadcastMessage(message: ServerMessage) {
    for (const [ws] of this.sessions) {
      try {
        ws.send(JSON.stringify(message));
      } catch (e) {
        console.error('failed to send message to socket', e);
        this.sessions.delete(ws);
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number) {
    this.sessions.delete(ws);
    ws.close(code, 'Durable Object is closing WebSocket');
  }
}
