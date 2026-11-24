import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import ComponentCard from '../../components/common/ComponentCard';
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';
import Label from '../../components/form/Label';
import { useBiddingSocket } from '../../hooks/useBiddingSocket';
import { postData } from '../../utility/utility';
import type { 
  Bid, 
  Service, 
  CreateBidRequest, 
  CounterBidRequest,
  BidStatus
} from '../../types/bid';
import { IndianRupeeIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from '../../icons';

function BiddingManagement() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [userBids, setUserBids] = useState<Bid[]>([]);
  const [availableBids, setAvailableBids] = useState<Bid[]>([]);
  const [showCreateBid, setShowCreateBid] = useState(false);
  const [showCounterBid, setShowCounterBid] = useState(false);
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
  
  // Form states
  const [selectedService, setSelectedService] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [description, setDescription] = useState('');
  const [counterPrice, setCounterPrice] = useState('');
  const [counterMessage, setCounterMessage] = useState('');

  // Socket connection
  const {
    isConnected,
    createBid,
    createCounterBid,
    acceptBid,
    rejectBid,
  } = useBiddingSocket(user?.userId || '');

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('adminData');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchServices();
      fetchUserBids();
      if (user.role === 'franchise') {
        fetchAvailableBids();
      }
    }
  }, [user]);

  const fetchServices = async () => {
    try {
      const response = await postData('/service/list', { page: 1, limit: 100 });
      if (response.success) {
        setServices(response.data.services || []);
      }
    } catch (error) {
      console.error('Failed to fetch services:', error);
    }
  };

  const fetchUserBids = async () => {
    try {
      const response = await postData('/bid/list/user', { page: 1, limit: 50 });
      if (response.success) {
        setUserBids(response.data.bids || []);
      }
    } catch (error) {
      console.error('Failed to fetch user bids:', error);
    }
  };

  const fetchAvailableBids = async () => {
    try {
      const response = await postData('/bid/list/franchise', { page: 1, limit: 50 });
      if (response.success) {
        setAvailableBids(response.data.bids || []);
      }
    } catch (error) {
      console.error('Failed to fetch available bids:', error);
    } finally {
      // Loading removed
    }
  };

  const handleCreateBid = () => {
    if (!selectedService || !proposedPrice) {
      alert('Please select service and enter proposed price');
      return;
    }

    const bidData: CreateBidRequest = {
      serviceId: selectedService,
      proposedPrice: parseFloat(proposedPrice),
      description: description || undefined,
    };

    createBid(bidData);
    setShowCreateBid(false);
    setSelectedService('');
    setProposedPrice('');
    setDescription('');
  };

  const handleCreateCounterBid = () => {
    if (!selectedBid || !counterPrice) {
      alert('Please enter counter price');
      return;
    }

    const counterBidData: CounterBidRequest = {
      bidId: selectedBid._id,
      counterPrice: parseFloat(counterPrice),
      message: counterMessage || undefined,
    };

    createCounterBid(counterBidData);
    setShowCounterBid(false);
    setSelectedBid(null);
    setCounterPrice('');
    setCounterMessage('');
  };

  const getStatusColor = (status: BidStatus) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'accepted':
        return 'text-green-600 bg-green-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      case 'countered':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: BidStatus) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="w-4 h-4" />;
      case 'accepted':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'rejected':
        return <XCircleIcon className="w-4 h-4" />;
      case 'countered':
        return <ClockIcon className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const renderUserBids = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">My Bids</h3>
      {userBids.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No bids found</p>
      ) : (
        <div className="grid gap-4">
          {userBids.map((bid) => (
            <div key={bid._id} className="border rounded-lg p-4 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(bid.status)}`}>
                      {getStatusIcon(bid.status)}
                      {bid.status.toUpperCase()}
                    </span>
                    {bid.bidType === 'franchise_counter' && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">COUNTER BID</span>
                    )}
                  </div>
                  
                  <h4 className="font-medium text-gray-800 dark:text-white">
                    Service: {(bid.serviceId as any)?.title || 'Unknown Service'}
                  </h4>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    <IndianRupeeIcon className="w-5 h-5 inline mr-1" />
                    {bid.proposedPrice}
                  </p>
                  {bid.description && (
                    <p className="text-gray-600 dark:text-gray-400 mt-2">{bid.description}</p>
                  )}
                  {bid.bidType === 'franchise_counter' && bid.description && (
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Franchise Message:</strong> {bid.description}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {bid.status === 'pending' && bid.bidType === 'user_bid' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/bid/details', { state: { bid } })}
                    >
                      View Details
                    </Button>
                  )}
                  {bid.status === 'countered' && bid.bidType === 'franchise_counter' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => acceptBid(bid._id)}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectBid(bid._id)}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderFranchiseBids = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Available Bids in Your Area</h3>
      {availableBids.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No bids available in your area</p>
      ) : (
        <div className="grid gap-4">
          {availableBids.map((bid) => (
            <div key={bid._id} className="border rounded-lg p-4 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(bid.status)}`}>
                      {getStatusIcon(bid.status)}
                      {bid.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <h4 className="font-medium text-gray-800 dark:text-white">
                    Service: {(bid.serviceId as any)?.title || 'Unknown Service'}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    User: {(bid.userId as any)?.fullName || 'Unknown User'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    <IndianRupeeIcon className="w-5 h-5 inline mr-1" />
                    {bid.proposedPrice}
                  </p>
                  {bid.description && (
                    <p className="text-gray-600 dark:text-gray-400 mt-2">{bid.description}</p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {bid.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedBid(bid);
                        setShowCounterBid(true);
                      }}
                    >
                      Make Counter Offer
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <PageMeta title="Bidding Management" description="Manage service bids and counter offers" />
      <PageBreadcrumb pageTitle="Bidding Management" />

      <div className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Bidding Management
          </h1>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* User Bids */}
        <ComponentCard title="My Bids">
          {renderUserBids()}
        </ComponentCard>

        {/* Create Bid Button for Users */}
        {user?.role === 'user' && (
          <div className="flex justify-end">
            <Button onClick={() => setShowCreateBid(true)}>
              Create New Bid
            </Button>
          </div>
        )}

        {/* Franchise Bids */}
        {user?.role === 'franchise' && (
          <ComponentCard title="Available Bids">
            {renderFranchiseBids()}
          </ComponentCard>
        )}

        {/* Create Bid Modal */}
        {showCreateBid && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                Create New Bid
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="service">Service</Label>
                  <select
                    id="service"
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full p-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select a service</option>
                    {services.map((service) => (
                      <option key={service._id} value={service._id}>
                        {service.title} - {service.price && `₹${service.price}`}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="price">Proposed Price (₹)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={proposedPrice}
                    onChange={(e) => setProposedPrice(e.target.value)}
                    placeholder="Enter your proposed price"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add any additional details..."
                    className="w-full p-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateBid(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateBid}>
                  Create Bid
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Counter Bid Modal */}
        {showCounterBid && selectedBid && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                Make Counter Offer
              </h3>
              
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Original Bid: <span className="font-bold text-gray-900 dark:text-white">₹{selectedBid.proposedPrice}</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Service: <span className="font-medium">{(selectedBid.serviceId as any)?.title}</span>
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="counterPrice">Your Price (₹)</Label>
                  <Input
                    id="counterPrice"
                    type="number"
                    value={counterPrice}
                    onChange={(e) => setCounterPrice(e.target.value)}
                    placeholder="Enter your counter price"
                  />
                </div>
                
                <div>
                  <Label htmlFor="counterMessage">Message (Optional)</Label>
                  <textarea
                    id="counterMessage"
                    value={counterMessage}
                    onChange={(e) => setCounterMessage(e.target.value)}
                    placeholder="Add a message for the user..."
                    className="w-full p-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowCounterBid(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateCounterBid}>
                  Send Counter Offer
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default BiddingManagement;
