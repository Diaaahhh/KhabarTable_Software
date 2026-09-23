"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { LogOut, ChevronDown, ChevronUp, Menu, X } from "lucide-react";

import { API_BASE_URL } from "../../constants/api";

// ============================================================
// TYPES
// ============================================================

type UserMenu = {
  id: number;
  parent_id: number | null;
  menu: string;
  icon: string | null;
  href: string | null;
};

type MenuItem = UserMenu & {
  children?: MenuItem[];
};

// ============================================================
// SIDEBAR
// ============================================================

export default function Sidebar() {
  const pathname = usePathname();

  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  // ==========================================================
  // SIDEBAR OPEN / CLOSE
  // ==========================================================

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Logout failed:", data.message);

        return;
      }

      // Redirect to login page
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };
  // ==========================================================
  // GET USER'S SIDEBAR MENUS
  // ==========================================================

  useEffect(() => {
    const getSidebarMenus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/sidebar`, {
          method: "GET",
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          console.error(data.message);
          return;
        }

        // ====================================================
        // FLAT MENU LIST FROM DATABASE
        // ====================================================

        const flatMenus: UserMenu[] = data.menus;

        // ====================================================
        // CREATE PARENT MENUS
        // ====================================================

        const parentMenus: MenuItem[] = flatMenus
          .filter((menu) => menu.parent_id === null)
          .map((menu) => ({
            ...menu,
            children: [],
          }));

        // ====================================================
        // ADD CHILDREN TO THEIR PARENT
        // ====================================================

        flatMenus
          .filter((menu) => menu.parent_id !== null)
          .forEach((child) => {
            const parent = parentMenus.find(
              (menu) => menu.id === child.parent_id,
            );

            if (parent) {
              parent.children?.push(child);
            }
          });

        // ====================================================
        // REMOVE EMPTY CHILDREN ARRAYS
        // ====================================================

        const finalMenus = parentMenus.map((menu) => {
          if (!menu.children || menu.children.length === 0) {
            const { children, ...menuWithoutChildren } = menu;

            return menuWithoutChildren;
          }

          return menu;
        });

        setMenus(finalMenus);
      } catch (error) {
        console.error("Failed to get sidebar menus:", error);
      } finally {
        setLoading(false);
      }
    };

    getSidebarMenus();
  }, []);

  // ==========================================================
  // WAIT FOR MENUS
  // ==========================================================

  if (loading) {
    return null;
  }

  // ==========================================================
  // TOGGLE DROPDOWN
  // ==========================================================

  const toggleMenu = (menuName: string) => {
    setOpenMenus((previous) => ({
      ...previous,
      [menuName]: !previous[menuName],
    }));
  };

  // ==========================================================
  // GET ICON
  // ==========================================================

  const getIcon = (iconName: string | null): LucideIcon => {
    if (!iconName) {
      return LucideIcons.FileText;
    }

    const Icon = (LucideIcons as unknown as Record<string, LucideIcon>)[
      iconName
    ];

    return Icon || LucideIcons.FileText;
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      {/* =====================================================
          SIDEBAR TOGGLE BUTTON
      ====================================================== */}

      <button
        type="button"
        onClick={() => setIsSidebarOpen((previous) => !previous)}
        className={`
          fixed
          top-5
          z-50
          flex
          h-8
          w-8
          items-center
          justify-center
          rounded-full
          border
          border-border
          bg-white
          text-text-secondary
          shadow-md
          transition-all
          duration-300
          hover:bg-surface
          hover:text-primary

          ${isSidebarOpen ? "left-[248px]" : "left-2"}
        `}
        aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <aside
        className={`
          fixed
          left-0
          top-0
          z-40
          flex
          h-screen
          w-64
          flex-col
          border-r
          border-border
          bg-white
          transition-transform
          duration-300
          ease-in-out

          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* =====================================================
            LOGO
        ====================================================== */}

        <div
          className="
            flex
            h-16
            items-center
            border-b
            border-border
            px-6
          "
        >
          <Link href="/" className="flex items-center">
            <img
              src="/images/logo.png"
              alt="Logo"
              className="h-10 w-auto object-contain"
            />
          </Link>
        </div>

        {/* =====================================================
            NAVIGATION
        ====================================================== */}

        <nav
          className="
            flex-1
            space-y-2
            overflow-y-auto
            px-4
            py-6
          "
        >
          {menus.map((item) => {
            const Icon = getIcon(item.icon);

            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            // ==================================================
            // DROPDOWN MENU
            // ==================================================

            if (item.children && item.children.length > 0) {
              const isOpen = openMenus[item.menu] || false;

              return (
                <div key={item.id}>
                  {/* =================================================
                      PARENT MENU
                  ================================================== */}

                  <button
                    type="button"
                    onClick={() => toggleMenu(item.menu)}
                    className={`
                      flex
                      w-full
                      items-center
                      justify-between
                      gap-3
                      rounded-lg
                      px-4
                      py-3
                      text-sm
                      font-medium
                      transition-colors

                      ${
                        isActive
                          ? "bg-primary text-white"
                          : "text-text-secondary hover:bg-primary hover:text-text-white"
                      }
                    `}
                  >
                    <div
                      className="
                        flex
                        items-center
                        gap-3
                      "
                    >
                      <Icon size={20} />

                      <span>{item.menu}</span>
                    </div>

                    {isOpen ? (
                      <ChevronUp size={18} />
                    ) : (
                      <ChevronDown size={18} />
                    )}
                  </button>

                  {/* =================================================
                      CHILDREN
                  ================================================== */}

                  {isOpen && (
                    <div
                      className="
                        mt-1
                        space-y-1
                        pl-4
                      "
                    >
                      {item.children.map((child) => {
                        const ChildIcon = getIcon(child.icon);

                        const isChildActive =
                          pathname === child.href ||
                          pathname.startsWith(`${child.href}/`);

                        return (
                          <Link
                            key={child.id}
                            href={child.href || "#"}
                            className={`
                                flex
                                items-center
                                gap-3
                                rounded-lg
                                px-4
                                py-2.5
                                text-sm
                                transition-colors

                                ${
                                  isChildActive
                                    ? "bg-primary text-white"
                                    : "text-text-secondary hover:bg-primary hover:text-text-white"
                                }
                              `}
                          >
                            <ChildIcon size={18} />

                            <span>{child.menu}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // ==================================================
            // NORMAL MENU ITEM
            // ==================================================

            return (
              <Link
                key={item.id}
                href={item.href || "#"}
                className={`
                  flex
                  items-center
                  gap-3
                  rounded-lg
                  px-4
                  py-3
                  text-sm
                  font-medium
                  transition-colors

                  ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-text-secondary hover:bg-primary hover:text-text-white"
                  }
                `}
              >
                <Icon size={20} />

                <span>{item.menu}</span>
              </Link>
            );
          })}
        </nav>

        {/* =====================================================
            LOGOUT
        ====================================================== */}

        <div
          className="
            border-t
            border-border
            p-4
          "
        >
          <button
            type="button"
            onClick={handleLogout}
            className="
    flex
    w-full
    items-center
    gap-3
    rounded-lg
    px-4
    py-3
    text-sm
    font-medium
    text-text-secondary
    transition-colors
    hover:bg-red-50
    hover:text-danger
  "
          >
            <LogOut size={20} />

            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
