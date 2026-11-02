import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { useDataStore } from "@/store/data";
import { toast } from "@/store/toast";
import { useI18n } from "@/lib/i18n";
import { Menu, MenuTrigger, MenuContent, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/DropdownMenu";
import { Tooltip } from "@/components/ui/Tooltip";

/**
 * Organization switcher. Two mounts with different visibility rules:
 *
 * - Topbar (`alwaysVisible`) — always rendered, whatever the org count. With
 *   no organizations yet it still shows, listing the empty state, so the
 *   control doubles as a "which workspace am I in" indicator.
 * - Sidebar/mobile drawer (default) — appears only once the user belongs to
 *   two or more organizations, i.e. when switching is actually possible.
 *
 * Switching re-scopes the whole session server-side, then the store refetches
 * every list — so this stays a plain menu, not a routed screen.
 */
export function OrgSwitcher({ collapsed = false, alwaysVisible = false }: { collapsed?: boolean; alwaysVisible?: boolean }) {
  const organizations = useDataStore((s) => s.organizations);
  const activeOrgId = useDataStore((s) => s.activeOrgId);
  const switchingOrg = useDataStore((s) => s.switchingOrg);
  const switchOrg = useDataStore((s) => s.switchOrg);
  const { t } = useI18n();

  // Sidebar/drawer rule: below two orgs there is nothing to switch.
  if (!alwaysVisible && organizations.length < 2) return null;

  const active = organizations.find((org) => org.id === activeOrgId) ?? organizations[0];
  const activeName = active?.name ?? t("org.switcher", "Workspace");

  const onPick = (id: string) => {
    if (id === activeOrgId || switchingOrg) return;
    const target = organizations.find((org) => org.id === id);
    switchOrg(id)
      .then(() => toast.success(t("org.switched", "Workspace switched"), target?.name ?? ""))
      .catch(() =>
        toast.error(t("org.switchFailed", "Could not switch workspace"), t("org.switchFailedHint", "Please try again.")),
      );
  };

  if (collapsed) {
    return (
      <Menu>
        <Tooltip content={activeName} side="right">
          <MenuTrigger asChild>
            <button
              type="button"
              aria-label={t("org.switcher", "Workspace")}
              disabled={switchingOrg}
              className={cn(
                "flex h-8 w-full items-center justify-center rounded-ctl text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink",
                switchingOrg && "opacity-50",
              )}
            >
              <Building2 size={15.5} strokeWidth={1.9} aria-hidden />
            </button>
          </MenuTrigger>
        </Tooltip>
        <OrgMenu organizations={organizations} activeOrgId={activeOrgId} onPick={onPick} />
      </Menu>
    );
  }

  if (alwaysVisible) {
    // Topbar pill: icon + current workspace name (name hidden on phones).
    return (
      <Menu>
        <MenuTrigger asChild>
          <button
            type="button"
            aria-label={`${t("org.switcher", "Workspace")}: ${activeName}`}
            disabled={switchingOrg}
            className={cn(
              "flex h-8 min-w-8 items-center gap-1.5 rounded-ctl px-2 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink",
              switchingOrg && "opacity-50",
            )}
          >
            <Building2 size={15} strokeWidth={1.9} aria-hidden className="shrink-0" />
            <span className="hidden max-w-28 truncate sm:inline">{activeName}</span>
            {organizations.length > 1 && (
              <ChevronsUpDown size={12} aria-hidden className="hidden shrink-0 text-ink-3 sm:inline" />
            )}
          </button>
        </MenuTrigger>
        <OrgMenu organizations={organizations} activeOrgId={activeOrgId} onPick={onPick} />
      </Menu>
    );
  }

  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          type="button"
          disabled={switchingOrg}
          className={cn(
            "flex w-full items-center gap-2 rounded-ctl px-1 py-1.5 text-left transition-colors hover:bg-surface-hover",
            switchingOrg && "opacity-50",
          )}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-hover text-[11px] font-semibold text-ink-2">
            {initials(activeName) || <Building2 size={13} aria-hidden />}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[12.5px] font-medium text-ink">{activeName}</span>
            <span className="block truncate text-[11px] text-ink-3">
              {switchingOrg ? t("org.switching", "Switching…") : t("org.switcher", "Workspace")}
            </span>
          </span>
          <ChevronsUpDown size={13} className="shrink-0 text-ink-3" aria-hidden />
        </button>
      </MenuTrigger>
      <OrgMenu organizations={organizations} activeOrgId={activeOrgId} onPick={onPick} />
    </Menu>
  );
}

function OrgMenu({
  organizations,
  activeOrgId,
  onPick,
}: {
  organizations: { id: string; name: string }[];
  activeOrgId: string;
  onPick: (id: string) => void;
}) {
  const { t } = useI18n();
  return (
    <MenuContent align="start" className="max-w-64">
      <MenuLabel>{t("org.menuLabel", "Your workspaces")}</MenuLabel>
      {organizations.length === 0 ? (
        <>
          <MenuSeparator />
          <MenuItem disabled className="text-ink-3">
            {t("org.empty", "No organizations yet")}
          </MenuItem>
        </>
      ) : (
        <>
          <MenuSeparator />
          {organizations.map((org) => (
            <MenuItem key={org.id} onSelect={() => onPick(org.id)} className="gap-2">
              <Check size={14} className={cn("shrink-0", org.id === activeOrgId ? "text-accent" : "opacity-0")} aria-hidden />
              <span className="truncate">{org.name}</span>
            </MenuItem>
          ))}
        </>
      )}
    </MenuContent>
  );
}
