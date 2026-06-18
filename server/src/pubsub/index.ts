import { PubSub } from 'graphql-subscriptions';
import { WebSocketServer, WebSocket } from 'ws';

class SubscriptionManager {
  private subscriptions: Map<string, Set<WebSocket>> = new Map();
  private connectionSubscriptions: Map<string, Set<string>> = new Map();
  private pubsub: PubSub;
  private wsServer: WebSocketServer | null = null;

  constructor() {
    this.pubsub = new PubSub();
  }

  setWebSocketServer(server: WebSocketServer) {
    this.wsServer = server;
    this.wsServer.on('connection', (ws: any) => {
      const connectionId = this.generateConnectionId();
      ws.connectionId = connectionId;
      this.connectionSubscriptions.set(connectionId, new Set());
      
      ws.on('close', () => {
        this.cleanupConnection(connectionId);
      });
    });
  }

  private generateConnectionId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  getPubSub(): PubSub {
    return this.pubsub;
  }

  registerSubscription(connectionId: string, eventName: string) {
    if (!this.connectionSubscriptions.has(connectionId)) {
      this.connectionSubscriptions.set(connectionId, new Set());
    }
    this.connectionSubscriptions.get(connectionId)!.add(eventName);

    if (!this.subscriptions.has(eventName)) {
      this.subscriptions.set(eventName, new Set());
    }
  }

  unregisterSubscription(connectionId: string, eventName: string) {
    const connSubs = this.connectionSubscriptions.get(connectionId);
    if (connSubs) {
      connSubs.delete(eventName);
    }
  }

  cleanupConnection(connectionId: string) {
    const connSubs = this.connectionSubscriptions.get(connectionId);
    if (connSubs) {
      connSubs.forEach(eventName => {
        const eventSubs = this.subscriptions.get(eventName);
        if (eventSubs) {
          this.wsServer?.clients.forEach((client: any) => {
            if (client.connectionId === connectionId) {
              eventSubs.delete(client);
            }
          });
        }
      });
      this.connectionSubscriptions.delete(connectionId);
      console.log(`Cleaned up subscriptions for connection ${connectionId}`);
    }
  }

  publish(eventName: string, payload: any) {
    this.pubsub.publish(eventName, payload);
  }

  asyncIterator<T>(events: string | string[]) {
    return this.pubsub.asyncIterator<T>(events);
  }

  getActiveConnections(): number {
    return this.connectionSubscriptions.size;
  }

  getTotalSubscriptions(): number {
    let total = 0;
    this.connectionSubscriptions.forEach(subs => {
      total += subs.size;
    });
    return total;
  }

  shutdown() {
    this.connectionSubscriptions.forEach((_, connectionId) => {
      this.cleanupConnection(connectionId);
    });
    this.pubsub = new PubSub();
  }
}

export const subscriptionManager = new SubscriptionManager();
export const pubsub = subscriptionManager.getPubSub();
