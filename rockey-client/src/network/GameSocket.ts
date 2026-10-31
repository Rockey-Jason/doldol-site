export type GameMessage = Record<string, unknown> & { type: string };

const MAX_OUTBOUND_BYTES = 64 * 1024;
const AUTH_TIMEOUT_MS = 10_000;

export class GameSocket {
  private socket: WebSocket | null = null;
  private listeners = new Set<(message: GameMessage) => void>();
  connected = false;
  private heartbeatTimer=0;
  private pingSequence=0;
  private pendingPings=new Map<string,number>();
  private simulationProfile:{lossPercent:number;minDelayMs:number;maxDelayMs:number}|null=null;
  private simulationRandomState=0x524f434b;
  private simulationRandom(){this.simulationRandomState=(Math.imul(this.simulationRandomState,1664525)+1013904223)>>>0;return this.simulationRandomState/4294967296;}
  setNetworkSimulation(profile:{lossPercent:number;minDelayMs:number;maxDelayMs:number;seed?:number}|null){
    if(!profile){this.simulationProfile=null;return;}
    const min=Math.max(0,Math.min(3000,profile.minDelayMs));
    const max=Math.max(min,Math.min(3000,profile.maxDelayMs));
    this.simulationProfile={lossPercent:Math.max(0,Math.min(20,profile.lossPercent)),minDelayMs:min,maxDelayMs:max};
    this.simulationRandomState=(profile.seed??0x524f434b)>>>0;
  }
  clearNetworkSimulation(){this.simulationProfile=null;}

  private startHeartbeat(socket:WebSocket){
    if(this.heartbeatTimer)window.clearInterval(this.heartbeatTimer);
    this.heartbeatTimer=window.setInterval(()=>{
      if(this.socket!==socket||socket.readyState!==WebSocket.OPEN)return;
      const nonce=String(++this.pingSequence);
      this.pendingPings.set(nonce,performance.now());
      while(this.pendingPings.size>8)this.pendingPings.delete(this.pendingPings.keys().next().value as string);
      this.send({type:'ping',nonce});
    },5000);
  }

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
    if(this.heartbeatTimer)window.clearInterval(this.heartbeatTimer);
    this.heartbeatTimer=0;this.pendingPings.clear();
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
        const deliver=()=>{
        let message: GameMessage;
        try {
          const parsed: unknown = JSON.parse(String(event.data));
          if (!parsed || typeof parsed !== 'object' || typeof (parsed as {type?:unknown}).type !== 'string') return;
          message = parsed as GameMessage;
        } catch { return; }

        if(message.type==='pong'){
          const nonce=String(message.nonce||'');
          const started=this.pendingPings.get(nonce);
          if(started!==undefined){
            this.pendingPings.delete(nonce);
            window.dispatchEvent(new CustomEvent('rockey:network',{detail:{rttMs:Math.max(0,performance.now()-started)}}));
          }
        }
        this.emit(message);
        if (message.type === 'auth.ok' && !settled) {
          settled = true;
          clearAuthTimeout();
          this.connected = true;
          this.startHeartbeat(socket);
          resolve();
        } else if (message.type === 'auth.error' && !settled) {
          fail(String(message.reason || 'AUTH_FAILED'));
        }
        };
        const profile=this.simulationProfile;
        if(this.connected&&profile){
          if(this.simulationRandom()*100<profile.lossPercent)return;
          const delay=profile.minDelayMs+this.simulationRandom()*(profile.maxDelayMs-profile.minDelayMs);
          window.setTimeout(deliver,delay);
          return;
        }
        deliver();
      });

      socket.addEventListener('close', () => {
        const isCurrent = this.socket === socket;
        if (isCurrent) {
          this.socket = null;
          this.connected = false;
          if(this.heartbeatTimer)window.clearInterval(this.heartbeatTimer);
          this.heartbeatTimer=0;this.pendingPings.clear();
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
    const profile=this.simulationProfile;
    if(profile){
      if(this.simulationRandom()*100<profile.lossPercent)return true;
      const delay=profile.minDelayMs+this.simulationRandom()*(profile.maxDelayMs-profile.minDelayMs);
      window.setTimeout(()=>{
        if(this.socket!==socket||socket.readyState!==WebSocket.OPEN)return;
        try{socket.send(payload);}catch{this.connected=false;}
      },delay);
      return true;
    }
    try {
      socket.send(payload);
      return true;
    } catch {
      this.connected = false;
      return false;
    }
  }

  close(): void {
    if(this.heartbeatTimer)window.clearInterval(this.heartbeatTimer);
    this.heartbeatTimer=0;this.pendingPings.clear();
    const socket = this.socket;
    this.socket = null;
    this.connected = false;
    if (socket && socket.readyState < WebSocket.CLOSING) {
      socket.close(1000, 'Client exit');
    }
  }
}
