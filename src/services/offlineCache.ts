import { Venue } from '../types';

/**
 * Offline Cache Service
 * Handles persistence of venue and menu data for low-connectivity environments.
 */
class OfflineCacheService {
  private readonly VENUE_CACHE_KEY = 'wayta_offline_venues';
  private readonly MENU_CACHE_PREFIX = 'wayta_offline_menu_';

  saveVenues(venues: Venue[]) {
    localStorage.setItem(this.VENUE_CACHE_KEY, JSON.stringify({
      data: venues,
      timestamp: Date.now()
    }));
  }

  getVenues(): Venue[] | null {
    const cached = localStorage.getItem(this.VENUE_CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached).data;
  }

  saveMenu(venueId: string, items: any[]) {
    localStorage.setItem(`${this.MENU_CACHE_PREFIX}${venueId}`, JSON.stringify({
      data: items,
      timestamp: Date.now()
    }));
  }

  getMenu(venueId: string): { data: any[]; timestamp: number } | null {
    const cached = localStorage.getItem(`${this.MENU_CACHE_PREFIX}${venueId}`);
    if (!cached) return null;
    return JSON.parse(cached);
  }

  isMenuStale(venueId: string, maxAgeMs: number = 3600000): boolean {
    const cached = localStorage.getItem(`${this.MENU_CACHE_PREFIX}${venueId}`);
    if (!cached) return true;
    const { timestamp } = JSON.parse(cached);
    return Date.now() - timestamp > maxAgeMs;
  }
}

export const offlineCache = new OfflineCacheService();
