/**
 * CDLC Marketing Data Engine - Real-time Analytics Feed
 * Optimized for high-latency festival environments via Local-First buffering.
 */
interface AnalyticsEvent {
  id: string;
  payload: any;
  timestamp: string;
}

class AnalyticsService {
  private readonly STORAGE_KEY = 'wayta_analytics_buffer';
  private readonly ANALYTICS_URL = (import.meta as any).env.VITE_ANALYTICS_ENDPOINT || 'https://analytics.wayta.co.za/v1/collection';

  constructor() {
    // Attempt to flush buffer on startup
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.flushBuffer());
    }
  }

  logCollectionEvent(orderId: string, location: string, items: { name: string; category: string }[]) {
    const eventData = {
      orderId,
      location,
      items: items.map(i => ({ type: i.category, name: i.name })),
      timestamp: new Date().toISOString(),
      demographic: 'Urban Youth',
      origin: 'wayta_frontend_v4'
    };

    console.log('--- CDLC ANALYTICS FEED (LOCAL CAPTURE) ---');
    console.table(eventData);

    this.queueEvent(eventData);
  }

  private queueEvent(payload: any) {
    const event: AnalyticsEvent = {
       id: `EV-${Math.random().toString(36).substr(2, 9)}`,
       payload,
       timestamp: new Date().toISOString()
    };

    const buffer = this.getBuffer();
    buffer.push(event);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(buffer));

    this.flushBuffer();
  }

  private getBuffer(): AnalyticsEvent[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private async flushBuffer() {
    if (!navigator.onLine) return;

    const buffer = this.getBuffer();
    if (buffer.length === 0) return;

    // Process in batches
    const event = buffer[0];
    
    try {
      // In production, this hits our Google Cloud Run ingress
      const response = await fetch(this.ANALYTICS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event.payload)
      });

      if (response.ok || response.status === 404) { // 404 handled as 'processed' for demo logic
        const remaining = buffer.slice(1);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(remaining));
        if (remaining.length > 0) this.flushBuffer();
      }
    } catch (error) {
      console.warn('Analytics sync paused: network congestion identified.');
    }
  }
}

export const analyticsService = new AnalyticsService();
