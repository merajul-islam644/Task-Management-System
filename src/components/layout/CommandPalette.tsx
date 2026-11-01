import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  Calendar,
  Folder,
  LayoutDashboard,
  ListTodo,
  Moon,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sun,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Kbd } from "@/components/ui/Badge";
import { useUiStore } from "@/store/ui";
import { useDataStore } from "@/store/data";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  group: string;
  keywords: string;
  run: () => void;
}

/** ⌘K command palette: jump to pages, open tasks and projects, run actions. */
export function CommandPalette() {
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);
  const openTaskForm = useUiStore((s) => s.openTaskForm);
  const setAiOpen = useUiStore((s) => s.setAiOpen);
  const setNotificationsOpen = useUiStore((s) => s.setNotificationsOpen);
  const openTask = useUiStore((s) => s.openTask);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const navigate = useNavigate();
  const tasks = useDataStore((s) => s.tasks);
  const projects = useDataStore((s) => s.projects);

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const items = useMemo<Item[]>(() => {
    const go = (to: string) => () => {
      navigate(to);
      setOpen(false);
    };
    const nav: Item[] = [
      { id: "nav-overview", label: "Overview", icon: <LayoutDashboard size={15} />, group: "Go to", keywords: "home dashboard", run: go("/") },
      { id: "nav-tasks", label: "My Tasks", icon: <ListTodo size={15} />, group: "Go to", keywords: "tasks list board", run: go("/tasks") },
      { id: "nav-projects", label: "Projects", icon: <Folder size={15} />, group: "Go to", keywords: "projects workspace", run: go("/projects") },
      { id: "nav-calendar", label: "Calendar", icon: <Calendar size={15} />, group: "Go to", keywords: "calendar month week schedule", run: go("/calendar") },
      { id: "nav-settings", label: "Settings", icon: <Settings size={15} />, group: "Go to", keywords: "settings preferences profile theme", run: go("/settings") },
    ];
    const actions: Item[] = [
      {
        id: "act-new",
        label: "Create new task",
        icon: <Plus size={15} />,
        group: "Actions",
        keywords: "new create add task",
        run: () => {
          setOpen(false);
          openTaskForm();
        },
      },
      {
        id: "act-notifications",
        label: "Open notifications",
        icon: <Bell size={15} />,
        group: "Actions",
        keywords: "inbox notifications activity",
        run: () => {
          setOpen(false);
          setNotificationsOpen(true);
        },
      },
      {
        id: "act-ai",
        label: "Ask FlowTask AI",
        hint: "Demo",
        icon: <Sparkles size={15} />,
        group: "Actions",
        keywords: "ai assistant suggestions plan",
        run: () => {
          setOpen(false);
          setAiOpen(true);
        },
      },
      {
        id: "act-theme",
        label: isDark ? "Switch to light theme" : "Switch to dark theme",
        icon: isDark ? <Sun size={15} /> : <Moon size={15} />,
        group: "Actions",
        keywords: "theme dark light appearance toggle",
        run: () => {
          setTheme(isDark ? "light" : "dark");
          setOpen(false);
        },
      },
    ];
    const taskItems: Item[] = tasks
      .filter((t) => t.status !== "done")
      .slice(0, 40)
      .map((t) => ({
        id: t.id,
        label: t.title,
        hint: projects.find((p) => p.id === t.projectId)?.name,
        icon: <ArrowRight size={14} className="text-ink-3" />,
        group: "Open task",
        keywords: `${t.title} ${t.labels.join(" ")}`,
        run: () => {
          setOpen(false);
          openTask(t.id);
        },
      }));
    const projectItems: Item[] = projects.map((p) => ({
      id: p.id,
      label: p.name,
      hint: "Project",
      icon: <Folder size={15} />,
      group: "Open project",
      keywords: `${p.name} ${p.description}`,
      run: () => {
        setOpen(false);
        navigate(`/projects/${p.id}`);
      },
    }));
    return [...actions, ...nav, ...taskItems, ...projectItems];
  }, [tasks, projects, navigate, setOpen, openTaskForm, setAiOpen, setNotificationsOpen, openTask, setTheme, isDark]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.filter((i) => i.group !== "Open task").slice(0, 12);
    return items.filter((i) => i.keywords.toLowerCase().includes(q) || i.label.toLowerCase().includes(q)).slice(0, 12);
  }, [items, query]);

  useEffect(() => setActive(0), [query, open]);
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && filtered[active]) {
      e.preventDefault();
      filtered[active].run();
    }
  };

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  let lastGroup = "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        aria-describedby={undefined}
        className="top-[15%] max-w-lg translate-y-0"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3 pr-10">
          <Search size={15} className="shrink-0 text-ink-3" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, projects, actions…"
            aria-label="Search tasks, projects, and actions"
            role="combobox"
            aria-expanded
            aria-controls="command-list"
            aria-activedescendant={filtered[active] ? `cmd-${filtered[active].id}` : undefined}
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
            autoFocus
          />
          <Kbd>Esc</Kbd>
        </div>
        <div ref={listRef} id="command-list" role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-ink-3">No matches. Try a different search.</p>
          ) : (
            filtered.map((item, index) => {
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;
              return (
                <div key={item.id}>
                  {showGroup && (
                    <p className="px-2.5 pt-2 pb-1 text-[11px] font-medium text-ink-3 first:pt-0.5">{item.group}</p>
                  )}
                  <button
                    type="button"
                    id={`cmd-${item.id}`}
                    data-index={index}
                    role="option"
                    aria-selected={index === active}
                    onMouseMove={() => setActive(index)}
                    onClick={item.run}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-ctl px-2.5 py-2 text-left text-[13px] transition-colors",
                      index === active ? "bg-surface-hover text-ink" : "text-ink-2",
                    )}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.hint ? <span className="shrink-0 text-[11.5px] text-ink-3">{item.hint}</span> : null}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
