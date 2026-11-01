import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileNav } from "./MobileNav";
import { CommandPalette } from "./CommandPalette";
import { AIAssistantPanel } from "@/components/ai/AIAssistantPanel";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";
import { DeleteTaskDialog } from "@/components/tasks/DeleteTaskDialog";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { ToastViewport } from "@/components/ui/Feedback";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { useDataStore } from "@/store/data";
import { useUiStore } from "@/store/ui";
import { useApplyTheme } from "@/hooks/useTheme";

export function AppShell() {
  const load = useDataStore((s) => s.load);
  const dataStatus = useDataStore((s) => s.status);
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const setAiOpen = useUiStore((s) => s.setAiOpen);
  const openTaskForm = useUiStore((s) => s.openTaskForm);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useApplyTheme();

  useEffect(() => {
    void load();
  }, [load]);

  // Global shortcuts: ⌘K palette, ⌘J AI, N new task (when not typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(!useUiStore.getState().commandOpen);
      } else if (meta && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setAiOpen(!useUiStore.getState().aiOpen);
      } else if (!meta && (e.key === "n" || e.key === "N")) {
        const target = e.target as HTMLElement;
        const typing =
          target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
        if (!typing && !useUiStore.getState().commandOpen) {
          e.preventDefault();
          openTaskForm();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCommandOpen, setAiOpen, openTaskForm]);

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
          <main
            data-loading={dataStatus === "loading" || undefined}
            className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-5 sm:px-6 sm:py-6"
          >
            <Outlet />
          </main>
        </div>
      </div>

      {/* Global surfaces */}
      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      <CommandPalette />
      <AIAssistantPanel />
      <TaskFormDialog />
      <TaskDetailPanel />
      <DeleteTaskDialog />
      <ProjectFormDialog />
      <ToastViewport />
    </TooltipProvider>
  );
}
