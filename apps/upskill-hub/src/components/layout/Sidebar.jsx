import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  BookOpen,
  Video,
  GraduationCap,
  User,
  CirclePower,
  Menu,
  X,
  Plus,
  ExternalLink,
  ArrowRight,
  Shield
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../stores/authStore";
import { getAppUrls } from "@nacos/config/urls";
import upskillLogo from "../../assets/upskill-full-logo.png";
import upskillLogoMark from "../../assets/upskill-logo-mark.png";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/courses", icon: BookOpen, label: "Courses" },
  { href: "/workshops", icon: Video, label: "Live Workshops" },
  { href: "/my-courses", icon: GraduationCap, label: "My Learning" },
  { href: "/profile", icon: User, label: "Profile & Role" },
];

const creatorItems = [
  { href: "/create-course", icon: Plus, label: "Create Course" },
  { href: "/my-workshops", icon: Video, label: "Workshop Roster" },
];

export function Sidebar({ isOpen, onToggle }) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const toggleRole = useAuthStore((state) => state.toggleRole);

  const isCreator = user?.user_metadata?.role === "creator";
  const fullName = user?.user_metadata?.full_name || "NACOS Scholar";

  const appUrls = getAppUrls();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onToggle}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-72 bg-card border-r border-border z-50 transform transition-transform duration-300 ease-out flex flex-col shadow-xl",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Link to="/" onClick={() => onToggle(false)} className="flex items-center gap-2">
            <img 
              src={upskillLogo} 
              alt="NACOS FUTO Upskill Hub" 
              className="h-8 w-auto object-contain"
            />
          </Link>
          <button
            onClick={() => onToggle(false)}
            className="p-1.5 rounded-md hover:bg-secondary lg:hidden text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Role Card */}
        {user && (
          <div className="p-3.5 mx-3 mt-3 rounded-lg border border-border bg-secondary/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-xs text-foreground truncate max-w-[140px]">
                {fullName}
              </p>
              <button
                onClick={toggleRole}
                title="Click to switch role between Learner and Creator"
                className={cn(
                  "px-2 py-0.5 text-[10px] font-mono rounded cursor-pointer transition-all border",
                  isCreator
                    ? "bg-[#0056D2] text-white border-transparent hover:bg-[#0043aa]"
                    : "bg-secondary text-foreground border-border hover:border-foreground/30"
                )}
              >
                {isCreator ? "Creator Mode" : "Learner Mode"}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {user?.email || "scholar@nacosfuto.org"}
            </p>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          <p className="px-3 py-1 font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
            Explore
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => onToggle(false)}
                className={cn(
                  "sidebar-link",
                  active
                    ? "bg-foreground text-primary-foreground font-semibold shadow-xs"
                    : "text-foreground/80 hover:text-foreground"
                )}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {isCreator && (
            <>
              <div className="h-px bg-border mx-3 my-3" />
              <p className="px-3 py-1 font-mono text-[10px] text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Creator Studio</span>
              </p>

              {creatorItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => onToggle(false)}
                    className={cn(
                      "sidebar-link",
                      active
                        ? "bg-[#0056D2] text-white font-semibold shadow-xs"
                        : "text-foreground/80 hover:text-foreground"
                    )}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}

          {/* Cross-Platform Ecosystem Navigation */}
          <div className="h-px bg-border mx-3 my-3" />
          <p className="px-3 py-1 font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
            NACOS Ecosystem
          </p>

          <a
            href={appUrls.portal}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-4 py-2.5 mx-2 rounded-md text-xs font-medium text-foreground/80 hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <GraduationCap size={15} className="text-[#0056D2]" />
              <span>Student Portal</span>
            </div>
            <ExternalLink size={12} className="opacity-60" />
          </a>

          <a
            href={appUrls.website}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-4 py-2.5 mx-2 rounded-md text-xs font-medium text-foreground/80 hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Shield size={15} className="text-[#0056D2]" />
              <span>Main Website</span>
            </div>
            <ExternalLink size={12} className="opacity-60" />
          </a>
        </nav>

        {/* Footer with Logout */}
        <div className="p-3 border-t border-border">
          <button
            onClick={() => {
              logout();
              onToggle(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <CirclePower size={15} />
            <span>Reset / Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export function SidebarTrigger({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-md border border-border hover:bg-secondary transition-colors lg:hidden cursor-pointer"
      aria-label="Open navigation menu"
    >
      <Menu size={18} />
    </button>
  );
}

export default Sidebar;
