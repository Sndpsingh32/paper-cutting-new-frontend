import { useState, useEffect } from 'react';
import { socketService } from '../services/socketService';
import { toast } from 'react-toastify';
import type {
  Bid,
  SocketEvents,
  CreateBidRequest,
  CounterBidRequest
} from '../types/bid';

export const useBiddingSocket = (userId: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [bids, setBids] = useState<Bid[]>([]);
  const [counterBids, setCounterBids] = useState<Bid[]>([]);

  useEffect(() => {
    if (!userId) return;

    // Connect to socket
    socketService.connect(userId);
    setIsConnected(true);

    // Set up event listeners
    const handleBidCreated = (data: SocketEvents['bid_created']) => {
      if (data.success) {
        toast.success(data.message);
        setBids(prev => [...prev, data.bid]);
      } else {
        toast.error(data.message);
      }
    };

    const handleCounterBidCreated = (data: SocketEvents['counter_bid_created']) => {
      if (data.success) {
        toast.success(data.message);
        setCounterBids(prev => [...prev, data.counterBid]);
      } else {
        toast.error(data.message);
      }
    };

    const handleBidAccepted = (data: SocketEvents['bid_accepted']) => {
      toast.success(data.message);
      setBids(prev => prev.map(bid =>
        bid._id === data.bid._id ? data.bid : bid
      ));
      setCounterBids(prev => prev.map(bid =>
        bid._id === data.bid._id ? data.bid : bid
      ));
    };

    const handleBidRejected = (data: SocketEvents['bid_rejected']) => {
      toast.info(data.message);
      setBids(prev => prev.map(bid =>
        bid._id === data.bid._id ? data.bid : bid
      ));
      setCounterBids(prev => prev.map(bid =>
        bid._id === data.bid._id ? data.bid : bid
      ));
    };

    const handleCounterBidReceived = (data: SocketEvents['counter_bid_received']) => {
      toast.info(`New counter bid: ${data.counterBid.proposedPrice}`);
      setCounterBids(prev => [...prev, data.counterBid]);
    };

    const handleNewBid = (data: SocketEvents['new_bid']) => {
      toast.info(data.message);
      setBids(prev => [...prev, data.bid]);
    };

    const handleBiddingClosed = (data: SocketEvents['bidding_closed']) => {
      toast.info(data.message);
      setBids(prev => prev.map(bid =>
        bid.serviceId === data.serviceId ? { ...bid, status: 'rejected' as any } : bid
      ));
    };

    const handleBidError = (data: SocketEvents['bid_error']) => {
      toast.error(data.message);
    };

    // Register event listeners
    socketService.onBidCreated(handleBidCreated);
    socketService.onCounterBidCreated(handleCounterBidCreated);
    socketService.onBidAccepted(handleBidAccepted);
    socketService.onBidRejected(handleBidRejected);
    socketService.onCounterBidReceived(handleCounterBidReceived);
    socketService.onNewBid(handleNewBid);
    socketService.onBiddingClosed(handleBiddingClosed);
    socketService.onBidError(handleBidError);

    // Cleanup on unmount
    return () => {
      socketService.offBidCreated(handleBidCreated);
      socketService.offCounterBidCreated(handleCounterBidCreated);
      socketService.offBidAccepted(handleBidAccepted);
      socketService.offBidRejected(handleBidRejected);
      socketService.offCounterBidReceived(handleCounterBidReceived);
      socketService.offNewBid(handleNewBid);
      socketService.offBiddingClosed(handleBiddingClosed);
      socketService.offBidError(handleBidError);
      socketService.disconnect();
      setIsConnected(false);
    };
  }, [userId]);

  // Bid actions
  const createBid = (bidData: CreateBidRequest) => {
    try {
      socketService.createBid(bidData);
    } catch (error) {
      toast.error('Failed to create bid. Please check your connection.');
    }
  };

  const createCounterBid = (counterBidData: CounterBidRequest) => {
    try {
      socketService.createCounterBid(counterBidData);
    } catch (error) {
      toast.error('Failed to create counter bid. Please check your connection.');
    }
  };

  const acceptBid = (bidId: string) => {
    try {
      socketService.acceptBid(bidId);
    } catch (error) {
      toast.error('Failed to accept bid. Please check your connection.');
    }
  };

  const rejectBid = (bidId: string) => {
    try {
      socketService.rejectBid(bidId);
    } catch (error) {
      toast.error('Failed to reject bid. Please check your connection.');
    }
  };

  return {
    isConnected,
    bids,
    counterBids,
    createBid,
    createCounterBid,
    acceptBid,
    rejectBid,
  };
};
