import { DurableObject } from 'cloudflare:workers';
import type { ClientMessage } from 'types/types';

interface UserSession {
  username: string;
  userId: string;
  joinedAt: number;
}

type MessageType = 'message' | 'join' | 'leave';

interface Message {
  type: MessageType;
  content?: string;
  timestamp: number;
  userId?: string;
  userName?: string;
}

export class ChatWebSocketServer extends DurableObject<Env> {
  sessions: Map<WebSocket, UserSession>;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sessions = new Map();

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
        this.handleJoinRoom(ws, messageData);
        break;
      case 'leave':
        this.handleLeaveRoom(ws, messageData);
        break;
      case 'message':
        this.broadcastMessage(messageData);
        break;
      default:
        console.log('default');
        return;
    }
  }

  private handleLeaveRoom(ws: WebSocket, data: any) {
    const session = this.sessions.get(ws);
    if (!session) {
      return;
    }
    const { username, userId } = session;
    console.log('leave room', { username, userId });

    // remove session
    this.sessions.delete(ws);

    const leaveMessage = {
      type: 'user_left',
      username,
      userId,
      timestamp: Date.now(),
      users: Array.from(this.sessions.values()),
    };

    this.broadcastMessage(leaveMessage);
  }

  private handleJoinRoom(ws: WebSocket, data: ClientMessage) {
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

    const joinMessage = {
      type: 'user_joined',
      username,
      userId,
      timestamp: Date.now(),
      users: Array.from(this.sessions.values()),
    };

    // notify all users that someone joined
    this.broadcastMessage(joinMessage);
  }

  private broadcastMessage(message: any) {
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
