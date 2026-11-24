import { useState, useEffect } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Link } from "react-router";
import { postData } from "../../utility/utility";
import moment from "moment";
import { BellIcon } from "../../icons";

interface Notification {
  _id: string;
  title: string;
  description: string;
  targetGroup: string;
  receiverType?: string;
  createdAt: string;
  isRead?: boolean;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifying, setNotifying] = useState(false); // Default false, set true if unread exists
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await postData("/notifications-admin/my-notifications", {
        page: 1,
        limit: 15
      });

      if (response.success) {
        setNotifications(response.data.notifications || []);
        // Check if there are any unread notifications (logic depends on backend, assuming all new for now or checking local storage/isRead flag)
        // For simplified "notifying" dot, we can just check if we have recent notifications
        if (response.data.notifications && response.data.notifications.length > 0) {
          setNotifying(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoading(false);
    }
  };

  function toggleDropdown() {
    setIsOpen(!isOpen);
    // If opening, we could mark as read or just hide the red dot locally
    if (!isOpen && notifying) {
      setNotifying(false);
    }
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleClick = () => {
    toggleDropdown();
  };

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={handleClick}
      >
        <span
          className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 ${!notifying ? "hidden" : "flex"
            }`}
        >
          <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
        </span>
        <BellIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute left-[-60px] sm:left-auto sm:right-0 mt-[17px] flex h-auto min-h-[200px] max-h-[550px] w-[310px] sm:w-[361px] flex-col rounded-2xl border border-gray-100 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notification
          </h5>
          <button
            onClick={toggleDropdown}
            className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg
              className="fill-current"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
        <ul className="flex flex-col flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <li className="p-4 text-center text-sm text-gray-500">Loading...</li>
          ) : notifications.length === 0 ? (
            <li className="p-4 text-center text-sm text-gray-500">No notifications found</li>
          ) : (
            notifications.map((notification) => (
              <li key={notification._id}>
                <DropdownItem
                  onItemClick={closeDropdown}
                  className="flex gap-4 rounded-xl border-b border-gray-50 p-3 transition-all duration-300 hover:bg-brand-50/30 dark:border-gray-800 dark:hover:bg-white/5 mx-1 mb-1"
                >
                  <span className="relative flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
                    <BellIcon className="w-5 h-5 shadow-brand-500/10" />
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-gray-900 dark:text-white text-theme-sm truncate pr-2">
                        {notification.title}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">
                        {moment(notification.createdAt).fromNow(true)}
                      </span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed line-clamp-2 mb-2">
                      {notification.description}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {notification.targetGroup}
                      </span>
                    </div>
                  </div>
                </DropdownItem>
              </li>
            ))
          )}
        </ul>
        <Link
          to="/notification-management"
          onClick={closeDropdown}
          className="block px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          View All Notifications
        </Link>
      </Dropdown>
    </div>
  );
}
