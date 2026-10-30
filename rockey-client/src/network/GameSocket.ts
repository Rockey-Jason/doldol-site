export type GameMessage = Record<string, unknown> & { type: string };

const MAX_OUTBOUND_BYTES = 64 * 1024;
const AUTH_TIMEOUT_MS = 10_000;

export class GameSocket {
  private socket: WebSocket | null = null;
  private listeners = new Set<(message: GameMessage) => void>();
  connected = false;

  onMessage(listener: (message: GameMessage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(message: GameMessage) {
    for (const listener of this.listeners) {
      try { listener(message); }
      catch (error) { console.error('ROCKEY socket listener failed', error); }
    }
  }

  connect(url: string, accessToken: string): Promise<void> {
    if (!url || !/^wss?:\/\//i.test(url)) {
      return Promise.reject(new Error('INVALID_GAME_SERVER_URL'));
    }
    if (!accessToken) return Promise.reject(new Error('MISSING_ACCESS_TOKEN'));

    // Replacing an old socket first prevents duplicate authenticated sessions.
    const previous = this.socket;
    this.socket = null;
    this.connected = false;
    if (previous && previous.readyState < WebSocket.CLOSING) {
      previous.close(1000, 'Replacing connection');
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      let timeout = 0;
      let socket: WebSocket;
      try {
        socket = new WebSocket(url);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('GAME_SERVER_UNREACHABLE'));
        return;
      }
      this.socket = socket;

      const clearAuthTimeout = () => {
        if (timeout) window.clearTimeout(timeout);
        timeout = 0;
      };
      const fail = (reason: string) => {
        if (settled) return;
        settled = true;
        clearAuthTimeout();
        if (this.socket === socket) {
          this.socket = null;
          this.connected = false;
        }
        try { socket.close(1008, reason.slice(0, 100)); } catch { /* already closed */ }
        reject(new Error(reason));
      };

      timeout = window.setTimeout(() => fail('GAME_SERVER_TIMEOUT'), AUTH_TIMEOUT_MS);

      socket.addEventListener('open', () => {
        if (this.socket !== socket) return;
        try {
          socket.send(JSON.stringify({ type: 'auth', accessToken }));
        } catch {
          fail('GAME_SERVER_AUTH_SEND_FAILED');
        }
      });

      socket.addEventListener('message', event => {
        if (this.socket !== socket) return;
        let message: GameMessage;
        try {
          const parsed: unknown = JSON.parse(String(event.data));
          if (!parsed || typeof parsed !== 'object' || typeof (parsed as {type?:unknown}).type !== 'string') return;
          message = parsed as GameMessage;
        } catch { return; }

        this.emit(message);
        if (message.type === 'auth.ok' && !settled) {
          settled = true;
          clearAuthTimeout();
          this.connected = true;
          resolve();
        } else if (message.type === 'auth.error' && !settled) {
          fail(String(message.reason || 'AUTH_FAILED'));
        }
      });

      socket.addEventListener('close', () => {
        const isCurrent = this.socket === socket;
        if (isCurrent) {
          this.socket = null;
          this.connected = false;
        }
        if (!settled) {
          settled = true;
          clearAuthTimeout();
          reject(new Error('GAME_SERVER_CLOSED'));
        }
        if (isCurrent) this.emit({ type: 'network.closed' });
      });

      socket.addEventListener('error', () => {
        if (!settled) fail('GAME_SERVER_UNREACHABLE');
      });
    });
  }

  send(message: GameMessage): boolean {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    let payload: string;
    try { payload = JSON.stringify(message); }
    catch { return false; }
    if (new TextEncoder().encode(payload).byteLength > MAX_OUTBOUND_BYTES) return false;
    try {
      socket.send(payload);
      return true;
    } catch {
      this.connected = false;
      return false;
    }
  }

  close(): void {
    const socket = this.socket;
    this.socket = null;
    this.connected = false;
    if (socket && socket.readyState < WebSocket.CLOSING) {
      socket.close(1000, 'Client exit');
    }
  }
}
