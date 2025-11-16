import { DurableObject } from 'cloudflare:workers';

type MessageType = 'message' | 'join' | 'leave';

interface Message {
  type: MessageType;
  content?: string;
  timestamp: number;
  userId?: string;
  userName?: string;
}

export class ChatWebSocketServer extends DurableObject<Env> {
  sessions: Map<WebSocket, { [key: string]: string }>;

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

    // generate random ID
    const id = crypto.randomUUID();

    // attach id to ws and serialize it
    server.serializeAttachment({ id });

    // add to active sessions
    this.sessions.set(server, { id });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    // Convert ArrayBuffer to string if necessary
    const messageString =
      typeof message === 'string' ? message : new TextDecoder().decode(message);

    let messageData: Message;
    try {
      messageData = JSON.parse(messageString);
    } catch {
      messageData = {
        type: 'message',
        content: messageString,
        timestamp: Date.now(),
      };
    }

    // handle different message types
    switch (messageData.type) {
      case 'message':
        console.log('broadcast');
        this.broadcastMessage(ws, message);
        return;
      default:
        console.log('default');
        return;
    }
  }

  private broadcastMessage(
    originatingWs: WebSocket,
    message: string | ArrayBuffer,
  ) {
    for (const [ws, session] of this.sessions) {
      // if (originatingWs !== ws) {
      //   ws.send(message);
      // }
      ws.send(message);
    }
  }

  async webSocketClose(ws: WebSocket, code: number) {
    this.sessions.delete(ws);
    ws.close(code, 'Durable Object is closing WebSocket');
  }
}
