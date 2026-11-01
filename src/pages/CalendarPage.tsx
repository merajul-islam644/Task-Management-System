import { useDataStore } from "@/store/data";
import { CalendarView } from "@/components/tasks/CalendarView";

export function CalendarPage() {
  const tasks = useDataStore((s) => s.tasks);
  const status = useDataStore((s) => s.status);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <header>
        <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Calendar</h2>
        <p className="mt-1 text-[13.5px] text-ink-2">
          {status === "ready" ? "Tasks land on their due dates. Select a day to see its work." : "Loading…"}
        </p>
      </header>
      <CalendarView tasks={tasks} />
    </div>
  );
}
