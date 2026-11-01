import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Globe, LogOut, Menu, Moon, Sun, UserRound } from "lucide-react";
import { useUiStore } from "@/store/ui";
import { useDataStore } from "@/store/data";
import { useAuth, useDisplayName } from "@/app/providers/AuthProvider";
import { useI18n } from "@/lib/i18n";
import { useAvatarUrl } from "@/lib/avatar";
import { IconButton } from "@/components/ui/Button";
import { Menu as DropMenu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/DropdownMenu";
import { Tooltip } from "@/components/ui/Tooltip";
import { NotificationBell } from "./NotificationPanel";
import { initials } from "@/lib/utils";

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const navigate = useNavigate();
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const avatarFileId = useDataStore((s) => s.avatarFileId);
  const avatarUrl = useAvatarUrl(avatarFileId || undefined);
  const { claims, logout } = useAuth();
  const { language, languages, setLanguage, t } = useI18n();
  const displayName = useDisplayName();
  const [loggingOut, setLoggingOut] = useState(false);

  const displayEmail = claims?.email ?? "";

  async function onLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-canvas/95 px-3 backdrop-blur-sm sm:px-6">
      <IconButton label="Open navigation" className="md:hidden" onClick={onOpenMobileNav}>
        <Menu size={17} />
      </IconButton>

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
        <NotificationBell />

        <Tooltip content={isDark ? t("action.switchToLight") : t("action.switchToDark")}>
          <IconButton
            label={isDark ? t("action.switchToLight") : t("action.switchToDark")}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="hidden sm:inline-flex"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </IconButton>
        </Tooltip>

        {/* Language switcher — the tenant's configured languages, straight
            from the Blocks Localization service. Hidden if discovery failed. */}
        {languages.length > 0 && (
          <DropMenu>
            <MenuTrigger asChild>
              <IconButton label={`${t("lang.label")}: ${language}`} className="hidden sm:inline-flex">
                <Globe size={16} />
              </IconButton>
            </MenuTrigger>
            <MenuContent align="end" className="w-52">
              <MenuLabel>{t("lang.label")}</MenuLabel>
              {languages.map((option) => (
                <MenuItem key={option.code} onSelect={() => setLanguage(option.code)}>
                  <Globe size={14} aria-hidden className="text-ink-3" />
                  <span className="flex-1 truncate">
                    {option.name}
                    <span className="ml-1.5 text-[11px] text-ink-3">{option.code}</span>
                  </span>
                  {option.code === language && <Check size={14} aria-hidden className="text-accent-ink" />}
                </MenuItem>
              ))}
            </MenuContent>
          </DropMenu>
        )}

        <DropMenu>
          <MenuTrigger asChild>
            <button
              type="button"
              aria-label="Open profile menu"
              className="ml-0.5 flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-accent-solid text-[11px] font-semibold text-on-accent transition-transform hover:scale-[1.04]"
              title={displayName}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" draggable={false} />
              ) : (
                initials(displayName) || "?"
              )}
            </button>
          </MenuTrigger>
          <MenuContent className="w-56">
            <MenuLabel>
              <span className="block text-[13px] font-medium text-ink">{displayName}</span>
              <span className="block text-[11.5px] font-normal">{displayEmail}</span>
            </MenuLabel>
            <MenuSeparator />
            <MenuItem onSelect={() => navigate("/profile")}>
              <UserRound size={14} aria-hidden /> {t("action.profile")}
            </MenuItem>
            <MenuItem danger disabled={loggingOut} onSelect={() => void onLogout()}>
              <LogOut size={14} aria-hidden /> {loggingOut ? t("action.signingOut") : t("action.logout")}
            </MenuItem>
          </MenuContent>
        </DropMenu>
      </div>
    </header>
  );
}
