import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../config/keys';

export type LocationUpdateEvent = {
  _id?: string;
  employeeId: string;
  latitude: number;
  longitude: number;
  address?: string;
  createdAt: string;
  speed?: number;
};

export type VisitSavedEvent = {
  employeeId: string;
  visit: Record<string, unknown>;
};

class TrackingSocketService {
  private socket: Socket | null = null;
  private subscribedEmployeeId: string | null = null;

  connect() {
    if (this.socket?.connected) return this.socket;

    this.socket = io(`${API_CONFIG.baseUrl}/tracking`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    this.socket.on('connect', () => {
      console.log('[TrackingSocket] Connected');
      if (this.subscribedEmployeeId) {
        this.socket?.emit('subscribe_tracking', { employeeId: this.subscribedEmployeeId });
      }
    });

    this.socket.on('disconnect', () => {
      console.log('[TrackingSocket] Disconnected');
    });

    return this.socket;
  }

  subscribe(employeeId: string) {
    this.subscribedEmployeeId = employeeId;
    const socket = this.connect();
    socket.emit('subscribe_tracking', { employeeId });
  }

  unsubscribe(employeeId: string) {
    this.socket?.emit('unsubscribe_tracking', { employeeId });
    if (this.subscribedEmployeeId === employeeId) {
      this.subscribedEmployeeId = null;
    }
  }

  onLocationUpdate(callback: (data: LocationUpdateEvent) => void) {
    this.socket?.on('location_update', callback);
  }

  offLocationUpdate(callback: (data: LocationUpdateEvent) => void) {
    this.socket?.off('location_update', callback);
  }

  onVisitSaved(callback: (data: VisitSavedEvent) => void) {
    this.socket?.on('visit_saved', callback);
  }

  offVisitSaved(callback: (data: VisitSavedEvent) => void) {
    this.socket?.off('visit_saved', callback);
  }

  disconnect() {
    if (this.subscribedEmployeeId) {
      this.unsubscribe(this.subscribedEmployeeId);
    }
    this.socket?.disconnect();
    this.socket = null;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  onConnect(callback: () => void) {
    this.socket?.on('connect', callback);
  }

  offConnect(callback: () => void) {
    this.socket?.off('connect', callback);
  }

  onDisconnect(callback: () => void) {
    this.socket?.on('disconnect', callback);
  }

  offDisconnect(callback: () => void) {
    this.socket?.off('disconnect', callback);
  }
}

export const trackingSocketService = new TrackingSocketService();
