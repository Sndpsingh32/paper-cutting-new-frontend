import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import {
  ChevronDownIcon,
  HorizontaLDots,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { useProfile } from "../context/ProfileContext";
import { usePermissions } from "../hooks/usePermissions";
import { NAV_MENU_ITEMS } from "../config/navigationMenu";
import { SIDEBAR_ICONS } from "../config/sidebarIcons";
import { Action } from "../types/permission";
import type { NavMenuItem } from "../config/navigationMenu";
import SidebarWidget from "./SidebarWidget";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};


const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, clearProfile } = useProfile();

  const handleLogout = () => {
    localStorage.removeItem("peparToken");
    localStorage.removeItem("adminData");
    localStorage.removeItem("role");
    clearProfile();
    navigate("/signin", { replace: true });
    if (isMobileOpen) {
      toggleMobileSidebar();
    }
  };

  const { isAdmin, can } = usePermissions();

  const canSeeMenuItem = (item: NavMenuItem) => {
    if (item.alwaysVisible) return true;
    if (isAdmin) return true;
    if (item.subItems?.length) {
      return item.subItems.some(
        (sub) => can(sub.resource, sub.action ?? Action.READ),
      );
    }
    if (item.resource) {
      return can(item.resource, item.action ?? Action.READ);
    }
    return false;
  };

  const getFilteredNavItems = (): NavItem[] => {
    if (!profile) return [];

    return NAV_MENU_ITEMS.filter(canSeeMenuItem).map((item) => {
      const icon = SIDEBAR_ICONS[item.name] ?? null;
      if (item.subItems) {
        const subItems = isAdmin
          ? item.subItems
          : item.subItems.filter((sub) =>
              can(sub.resource, sub.action ?? Action.READ),
            );
        return { name: item.name, icon, subItems };
      }
      return { name: item.name, icon, path: item.path };
    });
  };

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = (path: string) => location.pathname === path;
  const isActive = useCallback(
    (path: string) => {
      if (path === "/") return location.pathname === "/";

      // Exact match
      if (location.pathname === path) return true;

      // Hierarchical match (e.g., /reel-management covers /reel-management/add)
      if (location.pathname.startsWith(path + "/")) return true;

      // Special cases for non-hierarchical related pages
      const relatedPaths: Record<string, string[]> = {
        "/employee-management": ["/employee-registration"],
        "/user-list": ["/user-registration"],
        "/buyer-list": ["/company-registration"],
        "/vendor-management": ["/vendor-registration"],
        "/user-management": ["/user-registration"],
        "/sheet-management": ["/sheet-management/add"],
        "/reel-management": ["/reel-management/add"],
        "/product-management": ["/product-management/add"],
        "/notification-management": ["/notification-create"],
        "/permission-management": ["/permission-create"],
        "/order-management": ["/order-management/details"],
      };

      return relatedPaths[path]?.includes(location.pathname) || false;
    },
    [location.pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    getFilteredNavItems().forEach((nav, index) => {
      if (nav.subItems) {
        nav.subItems.forEach((subItem) => {
          if (isActive(subItem.path)) {
            setOpenSubmenu({
              type: "main",
              index,
            });
            submenuMatched = true;
          }
        });
      }
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive, profile]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu, profile]);

  const handleSubmenuToggle = (index: number) => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === "main" &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: "main", index };
    });
  };

  const renderMenuItems = (items: NavItem[]) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index)}
              className={`menu-item group ${openSubmenu?.type === "main" && openSubmenu?.index === index
                ? "menu-item-active"
                : "menu-item-inactive"
                } cursor-pointer ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
                }`}
            >
              <span
                className={`menu-item-icon-size  ${openSubmenu?.type === "main" && openSubmenu?.index === index
                  ? "menu-item-icon-active"
                  : "menu-item-icon-inactive"
                  }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${openSubmenu?.type === "main" && openSubmenu?.index === index
                    ? "rotate-180 text-brand-600"
                    : "text-gray-500"
                    }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                onClick={() => {
                  if (isMobileOpen) {
                    toggleMobileSidebar();
                  }
                }}
                className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                  }`}
              >
                <span
                  className={`menu-item-icon-size ${isActive(nav.path)
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                    }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`main-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === "main" && openSubmenu?.index === index
                    ? `${subMenuHeight[`main-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav?.subItems?.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      onClick={() => {
                        if (isMobileOpen) {
                          toggleMobileSidebar();
                        }
                      }}
                      className={`menu-dropdown-item ${isActive(subItem.path)
                        ? "menu-dropdown-item-active"
                        : "menu-dropdown-item-inactive"
                        }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                              ? "menu-dropdown-badge-active"
                              : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                              ? "menu-dropdown-badge-active"
                              : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}

    </ul>
  );

  return (
    <aside
      className={`fixed flex flex-col top-0 px-5 left-0 bg-gradient-to-b from-brand-50/60 via-white to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 backdrop-blur-xl border-r border-brand-100 dark:border-brand-500/15 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 shadow-[4px_0_28px_-10px_rgba(99,102,241,0.2)]
        ${isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start px-1"}
          `}
      >
        <Link to="/" className="block group w-full">
          {isExpanded || isHovered || isMobileOpen ? (
            <div className="relative overflow-hidden rounded-2xl border border-brand-100/80 bg-gradient-to-br from-brand-50 via-white to-accent-50/60 p-3.5 shadow-sm dark:border-brand-500/20 dark:from-brand-500/10 dark:via-gray-900 dark:to-accent-500/10">
              <div className="absolute -top-8 -right-8 h-20 w-20 rounded-full bg-brand-400/15 blur-2xl" />
              <div className="absolute -bottom-6 -left-6 h-16 w-16 rounded-full bg-accent-400/15 blur-2xl" />
              <div className="relative flex items-center gap-3">
                <div className="shrink-0 rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-brand-100 dark:bg-gray-900 dark:ring-white/10">
                  <img
                    src="/images/papercutting.png"
                    alt="Roll Sheet Trade logo"
                    className="h-11 w-11 object-contain rounded-lg"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[19px] font-black leading-none tracking-tight">
                    <span className="text-brand-600 dark:text-brand-400">Roll</span>{" "}
                    <span className="bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">Sheet</span>{" "}
                    <span className="text-accent-600 dark:text-accent-400">Trade</span>
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mt-1.5">
                    CRM & Paper System
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-brand-100/80 bg-gradient-to-br from-brand-50 to-accent-50/50 p-2 shadow-sm dark:border-brand-500/20 dark:from-brand-500/10 dark:to-accent-500/10">
              <img
                src="/images/papercutting.png"
                alt="Roll Sheet Trade logo"
                className="h-9 w-9 object-contain rounded-lg"
              />
            </div>
          )}
        </Link>
      </div>

      {/* Scrollable Menu Items */}
      <div className="flex-1 overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6 mb-auto pb-4">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-3 px-1 text-[11px] font-bold uppercase tracking-[0.16em] flex leading-[20px] text-gray-400 dark:text-gray-500 ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  <span className="flex items-center gap-2">
                    <span className="h-px w-4 bg-brand-300 dark:bg-brand-500/50" />
                    Main Menu
                  </span>
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMenuItems(getFilteredNavItems())}
            </div>
          </div>
        </nav>
        {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null}
      </div>

      {/* Fixed Sign Out Button at Bottom */}
      <div className="mt-auto pb-4 pt-3 shrink-0 border-t border-gray-100 dark:border-gray-800/80 bg-transparent z-10">
        <ul className="flex flex-col gap-4">
          <li>
            <button
              onClick={handleLogout}
              className={`group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-theme-sm font-medium text-red-500 transition-all duration-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 ${!isExpanded && !isHovered
                ? "lg:justify-center"
                : "lg:justify-start"
                }`}
            >
              <span className="menu-item-icon-size text-red-500 group-hover:text-red-600">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M15.1007 19.247C14.6865 19.247 14.3507 18.9112 14.3507 18.497L14.3507 14.245H12.8507V18.497C12.8507 19.7396 13.8581 20.747 15.1007 20.747H18.5007C19.7434 20.747 20.7507 19.7396 20.7507 18.497L20.7507 5.49609C20.7507 4.25345 19.7433 3.24609 18.5007 3.24609H15.1007C13.8581 3.24609 12.8507 4.25345 12.8507 5.49609V9.74501L14.3507 9.74501V5.49609C14.3507 5.08188 14.6865 4.74609 15.1007 4.74609L18.5007 4.74609C18.9149 4.74609 19.2507 5.08188 19.2507 5.49609L19.2507 18.497C19.2507 18.9112 18.9149 19.247 18.5007 19.247H15.1007ZM3.25073 11.9984C3.25073 12.2144 3.34204 12.4091 3.48817 12.546L8.09483 17.1556C8.38763 17.4485 8.86251 17.4487 9.15549 17.1559C9.44848 16.8631 9.44863 16.3882 9.15583 16.0952L5.81116 12.7484L16.0007 12.7484C16.4149 12.7484 16.7507 12.4127 16.7507 11.9984C16.7507 11.5842 16.4149 11.2484 16.0007 11.2484L5.81528 11.2484L9.15585 7.90554C9.44864 7.61255 9.44847 7.13767 9.15547 6.84488C8.86248 6.55209 8.3876 6.55226 8.09481 6.84525L3.52309 11.4202C3.35673 11.5577 3.25073 11.7657 3.25073 11.9984Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">Sign out</span>
              )}
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
};

export default AppSidebar;
