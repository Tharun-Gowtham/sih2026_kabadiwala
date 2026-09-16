/**
 * Kabadiwala Connect — GPS Geolocation Stamping Module
 * Uses browser Geolocation API to stamp real-time coordinates onto scrap lots,
 * purchase logs, and valuations for digital chain-of-custody traceability.
 */

class GeoEngine {
  constructor() {
    this.currentPosition = null;
    this.status = 'idle'; // 'idle' | 'locating' | 'locked' | 'denied' | 'fallback'
    this.listeners = [];

    // Default fallback coordinates (Mayapuri Scrap Hub, New Delhi)
    this.fallbackCoords = {
      latitude: 28.6367,
      longitude: 77.1275,
      accuracy: 15,
      city: 'Delhi (Scrap Hub)',
      isFallback: true
    };
  }

  async acquireLocation() {
    if (!('geolocation' in navigator)) {
      this.status = 'fallback';
      this.currentPosition = this.fallbackCoords;
      this._notify();
      return this.currentPosition;
    }

    this.status = 'locating';
    this._notify();

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentPosition = {
            latitude: Number(position.coords.latitude.toFixed(4)),
            longitude: Number(position.coords.longitude.toFixed(4)),
            accuracy: Math.round(position.coords.accuracy),
            timestamp: new Date().toISOString(),
            isFallback: false
          };
          this.status = 'locked';
          this._notify();
          resolve(this.currentPosition);
        },
        (error) => {
          console.warn('Geolocation failed or permission denied:', error.message);
          this.currentPosition = {
            ...this.fallbackCoords,
            timestamp: new Date().toISOString()
          };
          this.status = 'fallback';
          this._notify();
          resolve(this.currentPosition);
        },
        {
          enableHighAccuracy: true,
          timeout: 7000,
          maximumAge: 60000
        }
      );
    });
  }

  onLocationChange(callback) {
    this.listeners.push(callback);
  }

  _notify() {
    this.listeners.forEach(fn => fn(this.currentPosition, this.status));
  }

  formatCoords(pos = this.currentPosition) {
    if (!pos) return 'Locating...';
    const latDir = pos.latitude >= 0 ? 'N' : 'S';
    const lngDir = pos.longitude >= 0 ? 'E' : 'W';
    return `${Math.abs(pos.latitude).toFixed(2)}°${latDir}, ${Math.abs(pos.longitude).toFixed(2)}°${lngDir}`;
  }

  renderGpsBadge() {
    const pos = this.currentPosition || this.fallbackCoords;
    const isLocked = this.status === 'locked';
    const label = isLocked ? 'GPS Active' : (this.status === 'locating' ? 'Locating...' : 'Offline GPS');

    return `
      <div class="gps-badge ${isLocked ? 'gps-locked' : 'gps-fallback'}" id="kwGpsBadge" title="Coordinates: ${pos.latitude}, ${pos.longitude}">
        <span class="gps-dot"></span>
        <span class="gps-text">${label}</span>
      </div>
    `;
  }
}

export const geoEngine = new GeoEngine();
