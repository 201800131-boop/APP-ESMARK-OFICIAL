import { supabase } from './supabase/client';

export interface ConnectedUser {
  id: string;
  name: string;
  role: string;
  photo?: string;
  lastSeen: number;
}

const PRESENCE_CHANNEL = 'esmark-connected-users';
const HEARTBEAT_INTERVAL = 10000;

export class ConnectedUsersManager {
  private currentUser: ConnectedUser | null = null;
  private connectedUsers: ConnectedUser[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private channel: any | null = null;

  connect(user: { id: string; name: string; role: string; photo?: string }) {
    this.currentUser = {
      ...user,
      lastSeen: Date.now(),
    };
    this.connectedUsers = [this.currentUser];
    this.emitChange();
    this.startPresence();
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.channel) {
      this.channel.untrack();
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.currentUser = null;
    this.connectedUsers = [];
    this.emitChange();
  }

  getConnectedUsers(): ConnectedUser[] {
    return this.connectedUsers;
  }

  getOtherUsers(): ConnectedUser[] {
    if (!this.currentUser) return this.connectedUsers;
    return this.connectedUsers.filter(u => u.id !== this.currentUser!.id);
  }

  private startPresence() {
    if (!this.currentUser) return;
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }

    this.channel = supabase.channel(PRESENCE_CHANNEL, {
      config: {
        presence: { key: this.currentUser.id },
      },
    });

    this.channel
      .on('presence', { event: 'sync' }, () => this.syncPresence())
      .on('presence', { event: 'join' }, () => this.syncPresence())
      .on('presence', { event: 'leave' }, () => this.syncPresence());

    this.channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        this.trackPresence();
        this.startHeartbeat();
      }
    });
  }

  private trackPresence() {
    if (!this.channel || !this.currentUser) return;
    this.currentUser.lastSeen = Date.now();
    this.channel.track({
      user_id: this.currentUser.id,
      name: this.currentUser.name,
      role: this.currentUser.role,
      photo: this.currentUser.photo,
      last_seen: this.currentUser.lastSeen,
    });
  }

  private syncPresence() {
    if (!this.channel) return;
    const state = this.channel.presenceState() as Record<string, Array<Record<string, any>>>;
    const users: ConnectedUser[] = [];

    Object.entries(state).forEach(([key, presences]) => {
      if (!Array.isArray(presences) || presences.length === 0) return;
      let latest = presences[0];
      for (const presence of presences) {
        if ((presence.last_seen || 0) > (latest.last_seen || 0)) {
          latest = presence;
        }
      }

      users.push({
        id: latest.user_id || key,
        name: latest.name || 'Usuario',
        role: latest.role || 'operator',
        photo: typeof latest.photo === 'string' ? latest.photo : undefined,
        lastSeen: typeof latest.last_seen === 'number' ? latest.last_seen : Date.now(),
      });
    });

    this.connectedUsers = users;
    this.emitChange();
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.trackPresence();
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private emitChange() {
    window.dispatchEvent(new CustomEvent('connectedUsersChanged'));
  }
}

export const connectedUsersManager = new ConnectedUsersManager();
