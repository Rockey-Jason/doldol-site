export type GameMessage = Record<string, unknown> & { type: string };

export class GameSocket {
  private socket: WebSocket | null = null;
  private listeners = new Set<(message: GameMessage) => void>();
  connected = false;

  onMessage(listener: (message: GameMessage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  connect(url: string, accessToken: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const socket = new WebSocket(url);
      this.socket = socket;
      const timeout = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          socket.close();
          reject(new Error('GAME_SERVER_TIMEOUT'));
        }
      }, 10000);

      socket.addEventListener('open', () => {
        socket.send(JSON.stringify({ type: 'auth', accessToken }));
      });
      socket.addEventListener('message', event => {
        let message: GameMessage;
        try { message = JSON.parse(String(event.data)) as GameMessage; }
        catch { return; }
        for (const listener of this.listeners) listener(message);
        if (message.type === 'auth.ok' && !settled) {
          settled = true;
          clearTimeout(timeout);
          this.connected = true;
          resolve();
        }
        if (message.type === 'auth.error' && !settled) {
          settled = true;
          clearTimeout(timeout);
          reject(new Error(String(message.reason || 'AUTH_FAILED')));
        }
      });
      socket.addEventListener('close', () => {
        const isCurrent = this.socket === socket;
        if (isCurrent) {
          this.connected = false;
          this.socket = null;
        }
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(new Error('GAME_SERVER_CLOSED'));
        }
        if (isCurrent) {
          for (const listener of this.listeners) listener({ type: 'network.closed' });
        }
      });
      socket.addEventListener('error', () => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(new Error('GAME_SERVER_UNREACHABLE'));
        }
      });
    });
  }

  send(message: GameMessage): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(message));
    return true;
  }

  close(): void {
    this.socket?.close(1000, 'Client exit');
    this.socket = null;
    this.connected = false;
  }
}