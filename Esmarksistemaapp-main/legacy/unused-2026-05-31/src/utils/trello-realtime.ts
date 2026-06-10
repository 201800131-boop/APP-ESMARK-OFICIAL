import { supabase } from './supabase/client';

const TRELLO_REALTIME_CHANNEL = 'esmark-trello-events';
const TRELLO_REALTIME_EVENT = 'trello-update';
const MIN_EVENT_INTERVAL_MS = 1500;

class TrelloRealtimeManager {
  private channel: any | null = null;
  private lastEventId: string | null = null;
  private lastEventAt = 0;

  start() {
    if (this.channel) return;
    this.channel = supabase.channel(TRELLO_REALTIME_CHANNEL, {
      config: {
        broadcast: { self: true },
      },
    });

    this.channel
      .on('broadcast', { event: TRELLO_REALTIME_EVENT }, (event: any) => {
        const detail = event?.payload || {};
        if (!this.shouldDispatch(detail)) return;
        window.dispatchEvent(new CustomEvent('trelloRealtimeUpdate', { detail }));
      })
      .subscribe();
  }

  stop() {
    if (!this.channel) return;
    supabase.removeChannel(this.channel);
    this.channel = null;
  }

  private shouldDispatch(payload: any) {
    const now = Date.now();
    const eventId = payload?.eventId;
    if (eventId && eventId === this.lastEventId && now - this.lastEventAt < 5000) {
      return false;
    }
    if (!eventId && now - this.lastEventAt < MIN_EVENT_INTERVAL_MS) {
      return false;
    }
    this.lastEventId = eventId || null;
    this.lastEventAt = now;
    return true;
  }
}

export const trelloRealtimeManager = new TrelloRealtimeManager();
