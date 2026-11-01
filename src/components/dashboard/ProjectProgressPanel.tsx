import { Link } from "react-router-dom";
import { useDataStore } from "@/store/data";
import { hueMeta, projectStatusMeta } from "@/lib/meta";
import { ProgressBar } from "@/components/ui/Meters";

/** Per-project completion, ordered by nearest target date. */
export function ProjectProgressPanel() {
  const projects = useDataStore((s) => s.projects);
  const tasks = useDataStore((s) => s.tasks);

  const rows = projects
    .map((project) => {
      const all = tasks.filter((t) => t.projectId === project.id);
      const done = all.filter((t) => t.status === "done").length;
      const pct = all.length === 0 ? 0 : (done / all.length) * 100;
      return { project, open: all.length - done, done, pct };
    })
    .sort((a, b) => {
      const ad = a.project.targetDate ? new Date(a.project.targetDate).getTime() : Infinity;
      const bd = b.project.targetDate ? new Date(b.project.targetDate).getTime() : Infinity;
      return ad - bd;
    });

  return (
    <section aria-label="Project progress" className="rounded-card border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13.5px] font-semibold">Project progress</h2>
        <Link to="/projects" className="text-[12px] font-medium text-accent-ink hover:underline">
          All projects
        </Link>
      </div>
      <ul className="flex flex-col gap-3.5">
        {rows.map(({ project, open, done, pct }) => {
          const status = projectStatusMeta[project.status];
          return (
            <li key={project.id}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <Link
                  to={`/projects/${project.id}`}
                  className="flex min-w-0 items-center gap-1.5 text-[12.5px] font-medium hover:text-accent-ink"
                >
                  <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${hueMeta[project.color].dot} self-center`} />
                  <span className="truncate">{project.name}</span>
                  {project.status !== "on_track" && (
                    <span className={`shrink-0 text-[10.5px] font-semibold ${status.text}`}>{status.label}</span>
                  )}
                </Link>
                <span className="tnum shrink-0 text-[11.5px] text-ink-3">
                  {open} open · {done} done
                </span>
              </div>
              <ProgressBar
                value={pct}
                label={`${project.name} ${Math.round(pct)}% complete`}
                barClassName={pct === 100 ? "bg-ok" : undefined}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
