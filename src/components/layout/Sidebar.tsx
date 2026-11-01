import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Calendar,
  Folder,
  HelpCircle,
  LayoutDashboard,
  ListTodo,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { useUiStore } from "@/store/ui";
import { useDataStore } from "@/store/data";
import { useAuth, useDisplayName } from "@/app/providers/AuthProvider";
import { useI18n } from "@/lib/i18n";
import { useAvatarUrl } from "@/lib/avatar";
import { Tooltip } from "@/components/ui/Tooltip";
import { IconButton } from "@/components/ui/Button";
import { HelpDialog } from "./HelpDialog";

const NAV = [
  { to: "/", key: "nav.overview", icon: LayoutDashboard },
  { to: "/tasks", key: "nav.tasks", icon: ListTodo },
  { to: "/projects", key: "nav.projects", icon: Folder },
  { to: "/calendar", key: "nav.calendar", icon: Calendar },
] as const;

export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <rect x="1" y="1" width="30" height="30" rx="8" className="fill-accent-solid" />
      <path
        d="M10 16.5l4.2 4.2L22.5 12"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const avatarFileId = useDataStore((s) => s.avatarFileId);
  const avatarUrl = useAvatarUrl(avatarFileId || undefined);
  const { claims } = useAuth();
  const { t } = useI18n();
  const displayName = useDisplayName();
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);

  const displayEmail = claims?.email ?? "";

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-canvas transition-[width] duration-200 md:flex",
        collapsed ? "w-[60px]" : "w-[248px]",
      )}
    >
      {/* Brand */}
      <div className={cn("flex items-center gap-2 px-4 pt-4 pb-3", collapsed && "justify-center px-0")}>
        <LogoMark />
        {!collapsed && (
          <span className="text-[15px] font-semibold tracking-[-0.02em]">FlowTask</span>
        )}
      </div>

      {/* Navigation */}
      <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "group relative flex h-8 items-center gap-2.5 rounded-ctl px-2 text-[13px] font-medium transition-colors",
                collapsed && "justify-center px-0",
                isActive ? "bg-surface-hover text-ink" : "text-ink-2 hover:bg-surface-hover hover:text-ink",
              )
            }
          >
            {(link) => {
              const active = link.isActive;
              return (
                <>
                  {active && (
                    <span
                      aria-hidden
                      className="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent"
                    />
                  )}
                  <item.icon size={15.5} strokeWidth={1.9} aria-hidden className="shrink-0" />
                  {!collapsed && <span className="flex-1 truncate">{t(item.key)}</span>}
                </>
              );
            }}
          </NavLink>
        ))}

      </nav>

      {/* Bottom */}
      <div className="flex flex-col gap-0.5 border-t border-line px-2 py-2">
        <SidebarRow
          collapsed={collapsed}
          icon={Settings}
          label={t("nav.settings")}
          onClick={() => navigate("/settings")}
        />
        <SidebarRow
          collapsed={collapsed}
          icon={HelpCircle}
          label={t("nav.help")}
          onClick={() => setHelpOpen(true)}
        />
        {collapsed ? (
          <div className="flex justify-center py-1">
            <button
              type="button"
              aria-label="Open profile"
              onClick={() => navigate("/profile")}
              title={displayName}
              className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-accent-solid text-[11px] font-semibold text-on-accent"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" draggable={false} />
              ) : (
                initials(displayName) || "?"
              )}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="flex w-full items-center gap-2 rounded-ctl px-1 py-1.5 text-left transition-colors hover:bg-surface-hover"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-solid text-[11px] font-semibold text-on-accent">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" draggable={false} />
              ) : (
                initials(displayName) || "?"
              )}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[12.5px] font-medium text-ink">{displayName}</span>
              <span className="block truncate text-[11px] text-ink-3">{displayEmail || "Signed in"}</span>
            </span>
          </button>
        )}
      </div>

      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />

      {/* Collapse control */}
      <div className={cn("absolute top-[16px] z-10", collapsed ? "right-[-11px]" : "right-3")}>
        <IconButton
          label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={toggleSidebar}
          className="h-6 w-6 rounded-full border border-line bg-surface shadow-pop"
          size="sm"
        >
          {collapsed ? <PanelLeftOpen size={12} /> : <PanelLeftClose size={12} />}
        </IconButton>
      </div>
    </aside>
  );
}

function SidebarRow({
  collapsed,
  icon: Icon,
  label,
  onClick,
}: {
  collapsed: boolean;
  icon: typeof Settings;
  label: string;
  onClick: () => void;
}) {
  const inner = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-8 w-full items-center gap-2.5 rounded-ctl px-2 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon size={15.5} strokeWidth={1.9} aria-hidden className="shrink-0" />
      {!collapsed && label}
    </button>
  );
  if (collapsed) {
    return (
      <Tooltip content={label} side="right">
        <span className="contents">{inner}</span>
      </Tooltip>
    );
  }
  return inner;
}
