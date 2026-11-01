import { isSameDay, parseISO } from "date-fns";
import { useDataStore } from "@/store/data";
import { useUiStore } from "@/store/ui";
import { ProgressRing } from "@/components/ui/Meters";
import { TaskCheck } from "@/components/tasks/TaskCheck";

/** Focus meter: how much of today's planned work is already done. */
export function FocusPanel() {
  const tasks = useDataStore((s) => s.tasks);
  const toggleDone = useDataStore((s) => s.toggleTaskDone);
  const openTask = useUiStore((s) => s.openTask);

  const today = new Date();
  const planned = tasks.filter((t) => t.dueDate && isSameDay(parseISO(t.dueDate), today));
  const done = planned.filter((t) => t.status === "done");
  const pct = planned.length === 0 ? 0 : (done.length / planned.length) * 100;
  const next = planned.find((t) => t.status !== "done");

  return (
    <section aria-label="Focus progress" className="rounded-card border border-line bg-surface p-4">
      <div className="flex items-center gap-4">
        <ProgressRing value={pct} label={`Focus progress: ${done.length} of ${planned.length} tasks done`} size={64} />
        <div className="min-w-0">
          <h2 className="text-[13.5px] font-semibold">Focus today</h2>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2">
            {planned.length === 0
              ? "Nothing scheduled for today. Pull one task forward from My Tasks."
              : (
                <>
                  <span className="tnum">{done.length} of {planned.length}</span> done.{" "}
                  {next ? "Start with the next one below." : "Today's plan is clear — nice."}
                </>
              )}
          </p>
        </div>
      </div>

      {next && (
        <div className="mt-3 flex items-center gap-2.5 rounded-ctl border border-line px-2.5 py-2">
          <TaskCheck done={false} onToggle={() => void toggleDone(next.id)} title={next.title} />
          <button
            type="button"
            onClick={() => openTask(next.id)}
            className="min-w-0 flex-1 truncate text-left text-[13px] font-medium hover:text-accent-ink"
          >
            {next.title}
          </button>
        </div>
      )}
    </section>
  );
}
