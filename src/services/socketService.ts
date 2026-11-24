import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../config/keys';
import { CreateBidRequest, CounterBidRequest, SocketEvents } from '../types/bid';

class SocketService {
  private socket: Socket | null = null;

  connect(userId: string) {
    if (this.socket?.connected) {
      this.disconnect();
    }

    this.socket = io(`${API_CONFIG.baseUrl}/bidding`, {
      query: { userId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    this.socket.on('connect', () => {
      console.log('Connected to bidding server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from bidding server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Bid creation
  createBid(bidData: CreateBidRequest) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('create_bid', bidData);
  }

  // Counter bid creation
  createCounterBid(counterBidData: CounterBidRequest) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('create_counter_bid', counterBidData);
  }

  // Accept bid
  acceptBid(bidId: string) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('accept_bid', { bidId });
  }

  // Reject bid
  rejectBid(bidId: string) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('reject_bid', { bidId });
  }

  // Event listeners
  onBidCreated(callback: (data: SocketEvents['bid_created']) => void) {
    this.socket?.on('bid_created', callback);
  }

  onCounterBidCreated(callback: (data: SocketEvents['counter_bid_created']) => void) {
    this.socket?.on('counter_bid_created', callback);
  }

  onBidAccepted(callback: (data: SocketEvents['bid_accepted']) => void) {
    this.socket?.on('bid_accepted', callback);
  }

  onBidRejected(callback: (data: SocketEvents['bid_rejected']) => void) {
    this.socket?.on('bid_rejected', callback);
  }

  onCounterBidReceived(callback: (data: SocketEvents['counter_bid_received']) => void) {
    this.socket?.on('counter_bid_received', callback);
  }

  onNewBid(callback: (data: SocketEvents['new_bid']) => void) {
    this.socket?.on('new_bid', callback);
  }

  onBiddingClosed(callback: (data: SocketEvents['bidding_closed']) => void) {
    this.socket?.on('bidding_closed', callback);
  }

  onBidError(callback: (data: SocketEvents['bid_error']) => void) {
    this.socket?.on('bid_error', callback);
  }

  // Remove event listeners
  offBidCreated(callback: (data: SocketEvents['bid_created']) => void) {
    this.socket?.off('bid_created', callback);
  }

  offCounterBidCreated(callback: (data: SocketEvents['counter_bid_created']) => void) {
    this.socket?.off('counter_bid_created', callback);
  }

  offBidAccepted(callback: (data: SocketEvents['bid_accepted']) => void) {
    this.socket?.off('bid_accepted', callback);
  }

  offBidRejected(callback: (data: SocketEvents['bid_rejected']) => void) {
    this.socket?.off('bid_rejected', callback);
  }

  offCounterBidReceived(callback: (data: SocketEvents['counter_bid_received']) => void) {
    this.socket?.off('counter_bid_received', callback);
  }

  offNewBid(callback: (data: SocketEvents['new_bid']) => void) {
    this.socket?.off('new_bid', callback);
  }

  offBiddingClosed(callback: (data: SocketEvents['bidding_closed']) => void) {
    this.socket?.off('bidding_closed', callback);
  }

  offBidError(callback: (data: SocketEvents['bid_error']) => void) {
    this.socket?.off('bid_error', callback);
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
