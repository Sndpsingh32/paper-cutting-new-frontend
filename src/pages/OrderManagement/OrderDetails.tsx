import { useLocation, useNavigate } from "react-router";
import { useState } from "react";
import moment from "moment";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Button from "../../components/ui/button/Button";
import { Order, OrderStatus } from "../../types/order";
import { ChevronLeftIcon } from "../../icons";
import { putData } from "../../utility/utility";
import { toast } from "react-toastify";

export default function OrderDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const order = location.state?.order as Order;
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(order);

  // If no order data, redirect back
  if (!order) {
    navigate("/order-management");
    return null;
  }

  // Status badge color helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "confirmed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "preparing":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "ready":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      case "out_for_delivery":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
      case "delivered":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "rejected":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "FAILED":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "REFUNDED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    if (isUpdating || newStatus === currentOrder.orderStatus) return;

    setIsUpdating(true);
    try {
      const response = await putData("/order/update-status", {
        orderId: currentOrder._id,
        orderStatus: newStatus,
        userId: currentOrder.userId._id,
      });

      if (response.success) {
        setCurrentOrder((prev) => ({ ...prev, orderStatus: newStatus }));
        toast.success(
          `Order status updated to ${newStatus
            .replace(/_/g, " ")
            .toUpperCase()}`
        );
      } else {
        toast.error(response.message || "Failed to update order status");
      }
    } catch (error: unknown) {
      console.error("Error updating order status:", error);
      const errorMessage =
        error &&
          typeof error === "object" &&
          "response" in error &&
          error.response &&
          typeof error.response === "object" &&
          "data" in error.response &&
          error.response.data &&
          typeof error.response.data === "object" &&
          "message" in error.response.data
          ? (error.response.data as { message: string }).message
          : "Failed to update order status";
      toast.error(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const getNextStatusOptions = (): OrderStatus[] => {
    return [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PREPARING,
      OrderStatus.READY,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
    ];
  };

  return (
    <>
      <PageMeta
        title={`Order ${order.orderId} | Paper Cutting Service Dashboard`}
        description="View complete order details"
      />
      <PageBreadcrumb pageTitle="Order Details" />

      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/order-management")}
              startIcon={<ChevronLeftIcon className="w-4 h-4" />}
            >
              Back to Orders
            </Button>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Order Details
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Order ID: {currentOrder.orderId}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <span
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(
                currentOrder.orderStatus
              )}`}
            >
              {currentOrder.orderStatus.toUpperCase().replace(/_/g, " ")}
            </span>
            {getNextStatusOptions().length > 0 && (
              <select
                value=""
                onChange={(e) =>
                  e.target.value &&
                  handleStatusUpdate(e.target.value as OrderStatus)
                }
                disabled={isUpdating}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-50"
              >
                <option value="" disabled>
                  {isUpdating ? "Updating..." : "Update Status"}
                </option>
                {getNextStatusOptions().map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, " ").toUpperCase()}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Order Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ComponentCard title="Order Information">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Order ID
                </p>
                <p className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                  {currentOrder.orderId}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Order Date
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {moment(currentOrder.createdAt).format(
                    "DD MMM YYYY, hh:mm A"
                  )}
                </p>
              </div>
              {currentOrder.estimatedDeliveryTime && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Estimated Delivery
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {moment(currentOrder.estimatedDeliveryTime).format(
                      "DD MMM YYYY, hh:mm A"
                    )}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Order Status
                </p>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    currentOrder.orderStatus
                  )}`}
                >
                  {currentOrder.orderStatus.toUpperCase().replace(/_/g, " ")}
                </span>
              </div>
            </div>
          </ComponentCard>

          <ComponentCard title="Customer Information">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Customer ID
                </p>
                <p className="font-mono text-xs text-gray-900 dark:text-white">
                  {currentOrder.userId._id}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Email
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {currentOrder.userId.email}
                </p>
              </div>
              {currentOrder.userId.phone && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Phone
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {currentOrder.userId.phone}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Member Since
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {moment(currentOrder.userId.createdAt).format("DD MMM YYYY")}
                </p>
              </div>
            </div>
          </ComponentCard>

          <ComponentCard title="Payment Information">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Payment Method
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white uppercase">
                  {currentOrder.paymentMethod}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Payment Status
                </p>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(
                    currentOrder.paymentStatus
                  )}`}
                >
                  {currentOrder.paymentStatus.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total Amount
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  ₹{currentOrder.totalAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </ComponentCard>
        </div>

        {/* Delivery Address */}
        <ComponentCard title="Delivery Address">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Address Type
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                {currentOrder.addressId.addressType}
                {currentOrder.addressId.isDefault && (
                  <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                    (Default)
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                House Number
              </p>
              <p className="text-sm text-gray-900 dark:text-white">
                {currentOrder.addressId.houseNumber}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Street
              </p>
              <p className="text-sm text-gray-900 dark:text-white">
                {currentOrder.addressId.street}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Landmark
              </p>
              <p className="text-sm text-gray-900 dark:text-white">
                {currentOrder.addressId.landmark}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                City
              </p>
              <p className="text-sm text-gray-900 dark:text-white">
                {currentOrder.addressId.city}, {currentOrder.addressId.state}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Country
              </p>
              <p className="text-sm text-gray-900 dark:text-white">
                {currentOrder.addressId.country}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Zip Code
              </p>
              <p className="text-sm text-gray-900 dark:text-white">
                {currentOrder.addressId.zipCode}
              </p>
            </div>
          </div>
        </ComponentCard>

        {/* Order Items */}
        <ComponentCard title="Order Items">
          <div className="space-y-4">
            {currentOrder.items.map((item, index) => (
              <div
                key={index}
                className="flex gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                {/* Product Image */}
                <div className="flex-shrink-0">
                  <img
                    src={item.productId.images[0] || "/images/placeholder.png"}
                    alt={item.productId.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                </div>

                {/* Product Details */}
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {item.productId.name}
                  </h4>
                  {item.portionDetails && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Portion: {item.portionDetails.portionSize.toUpperCase()} |
                      Price: ₹{item.portionDetails.price}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Quantity: {item.quantity}
                  </p>

                  {/* Selected Extras */}
                  {item.selectedExtras && item.selectedExtras.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Add-ons:
                      </p>
                      <div className="space-y-1 mt-1">
                        {item.selectedExtras.map((extra, idx) => (
                          <div
                            key={idx}
                            className="text-xs text-gray-600 dark:text-gray-400 flex justify-between"
                          >
                            <span>
                              • {extra.name} (×{extra.quantity})
                            </span>
                            <span>₹{extra.totalPrice}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Item Total */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    ₹{item.itemTotal.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Item Total
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ComponentCard>

        {/* Order Summary */}
        <ComponentCard title="Order Summary">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
              <span className="text-gray-900 dark:text-white font-medium">
                ₹{currentOrder.subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Delivery Fee
              </span>
              <span className="text-gray-900 dark:text-white font-medium">
                ₹{currentOrder.deliveryFee.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Tax</span>
              <span className="text-gray-900 dark:text-white font-medium">
                ₹{currentOrder.tax.toFixed(2)}
              </span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="flex justify-between">
                <span className="text-base font-semibold text-gray-900 dark:text-white">
                  Total Amount
                </span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  ₹{currentOrder.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </ComponentCard>
      </div>
    </>
  );
}
