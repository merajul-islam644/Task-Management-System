import * as RadixDialog from "@radix-ui/react-dialog";
import { NavLink } from "react-router-dom";
import { Calendar, Folder, LayoutDashboard, ListTodo, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDataStore } from "@/store/data";
import { hueMeta } from "@/lib/meta";
import { LogoMark } from "./Sidebar";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/tasks", label: "My Tasks", icon: ListTodo },
  { to: "/projects", label: "Projects", icon: Folder },
  { to: "/calendar", label: "Calendar", icon: Calendar },
] as const;

/** Sidebar-as-drawer for tablets and phones. */
export function MobileNav({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const projects = useDataStore((s) => s.projects);

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-overlay data-[state=open]:animate-[ft-fade-in_150ms_ease-out] md:hidden" />
        <RadixDialog.Content
          aria-label="Navigation"
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-line bg-canvas outline-none",
            "data-[state=open]:animate-[ft-slide-from-left_200ms_cubic-bezier(0.32,0.72,0,1)] md:hidden",
          )}
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <LogoMark />
              <span className="text-[15px] font-semibold tracking-[-0.02em]">FlowTask</span>
            </div>
            <RadixDialog.Close asChild>
              <button
                type="button"
                aria-label="Close navigation"
                className="rounded-ctl p-1.5 text-ink-2 hover:bg-surface-hover hover:text-ink"
              >
                <X size={16} />
              </button>
            </RadixDialog.Close>
          </div>

          <nav aria-label="Main" className="flex flex-col gap-0.5 px-2 py-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => onOpenChange(false)}
                className={({ isActive }) =>
                  cn(
                    "flex h-9 items-center gap-3 rounded-ctl px-2.5 text-[13.5px] font-medium transition-colors",
                    isActive ? "bg-surface-hover text-ink" : "text-ink-2 hover:bg-surface-hover hover:text-ink",
                  )
                }
              >
                <item.icon size={16} strokeWidth={1.9} aria-hidden />
                <span className="flex-1">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <p className="mt-5 mb-1 px-4 text-[11px] font-medium tracking-wide text-ink-3">Projects</p>
          <nav aria-label="Projects" className="flex flex-col gap-0.5 overflow-y-auto px-2 pb-4">
            {projects.filter((p) => !p.archived).map((project) => (
              <NavLink
                key={project.id}
                to={`/projects/${project.id}`}
                onClick={() => onOpenChange(false)}
                className={({ isActive }) =>
                  cn(
                    "flex h-9 items-center gap-3 rounded-ctl px-2.5 text-[13.5px] transition-colors",
                    isActive ? "bg-surface-hover font-medium text-ink" : "text-ink-2 hover:bg-surface-hover hover:text-ink",
                  )
                }
              >
                <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", hueMeta[project.color].dot)} />
                <span className="truncate">{project.name}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto border-t border-line px-2 py-2">
            <NavLink
              to="/settings"
              onClick={() => onOpenChange(false)}
              className="flex h-9 items-center gap-3 rounded-ctl px-2.5 text-[13.5px] font-medium text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <Settings size={16} strokeWidth={1.9} aria-hidden />
              Settings
            </NavLink>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
