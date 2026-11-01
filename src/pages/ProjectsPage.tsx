import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArchiveRestore, Folder, Plus, Search } from "lucide-react";
import type { Project, User } from "@/types";
import { useDataStore } from "@/store/data";
import { useUiStore } from "@/store/ui";
import { hueMeta, projectStatusMeta } from "@/lib/meta";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/Feedback";
import { ProgressBar } from "@/components/ui/Meters";
import { AvatarStack } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { cn, dueLabel } from "@/lib/utils";

export function ProjectsPage() {
  const projects = useDataStore((s) => s.projects);
  const tasks = useDataStore((s) => s.tasks);
  const users = useDataStore((s) => s.users);
  const openProjectForm = useUiStore((s) => s.openProjectForm);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects
      .filter((p) => !!p.archived === showArchived)
      .filter((p) => !q || `${p.name} ${p.description}`.toLowerCase().includes(q));
  }, [projects, query, showArchived]);

  const statsFor = (projectId: string) => {
    const all = tasks.filter((t) => t.projectId === projectId);
    const done = all.filter((t) => t.status === "done").length;
    return { total: all.length, done, open: all.length - done };
  };

  const archivedCount = projects.filter((p) => p.archived).length;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Projects</h2>
          <p className="mt-1 text-[13.5px] text-ink-2">
            {filtered.length} project{filtered.length === 1 ? "" : "s"}
            {showArchived ? " archived" : " in this workspace"}
          </p>
        </div>
        <Button variant="primary" size="lg" onClick={() => openProjectForm()}>
          <Plus size={15} strokeWidth={2.25} aria-hidden />
          New project
        </Button>
      </header>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-44 flex-1 sm:max-w-72">
          <Search size={14} aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            aria-label="Search projects"
            className="pl-8"
          />
        </div>
        <button
          type="button"
          aria-pressed={showArchived}
          onClick={() => setShowArchived(!showArchived)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-ctl border px-2.5 text-[13px] font-medium transition-colors",
            showArchived
              ? "border-accent-soft-line bg-accent-soft text-accent-ink"
              : "border-line-strong bg-surface text-ink-2 hover:bg-surface-hover",
          )}
        >
          <ArchiveRestore size={13} aria-hidden />
          Archived
          {archivedCount > 0 && (
            <span className="tnum rounded-full bg-surface-hover px-1.5 text-[11px]">{archivedCount}</span>
          )}
        </button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-card border border-line bg-surface">
          <EmptyState
            icon={Folder}
            title={showArchived ? "No archived projects" : "No projects found"}
            description={
              showArchived
                ? "Archived projects move out of the main list; nothing is deleted."
                : "Create a project to group tasks, members, and a target date."
            }
            action={
              !showArchived && (
                <Button variant="primary" size="sm" onClick={() => openProjectForm()}>
                  <Plus size={13} aria-hidden />
                  New project
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              stats={statsFor(project.id)}
              members={project.memberIds.map((id) => users.find((u) => u.id === id)).filter(Boolean) as User[]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  stats,
  members,
}: {
  project: Project;
  stats: { total: number; done: number; open: number };
  members: User[];
}) {
  const pct = stats.total === 0 ? 0 : (stats.done / stats.total) * 100;
  const status = projectStatusMeta[project.status];
  const target = dueLabel(project.targetDate);

  return (
    <Link
      to={`/projects/${project.id}`}
      className="group flex flex-col gap-3 rounded-card border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-surface-hover/40"
    >
      <div className="flex items-center justify-between gap-2">
        <span aria-hidden className={cn("mt-0.5 h-2.5 w-2.5 rounded-full", hueMeta[project.color].dot)} />
        <Badge className={status.chip}>{status.label}</Badge>
        <AvatarStack users={members} size="xs" />
      </div>
      <div>
        <h3 className="text-[14px] font-semibold tracking-[-0.01em] group-hover:text-accent-ink">{project.name}</h3>
        <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-2">{project.description}</p>
      </div>
      <div className="mt-auto flex flex-col gap-1.5">
        <div className="tnum flex items-center justify-between text-[11.5px] text-ink-3">
          <span>
            {stats.open} open, {stats.done} done
          </span>
          <span className="font-semibold text-ink-2">{Math.round(pct)}%</span>
        </div>
        <ProgressBar value={pct} label={`${project.name}: ${Math.round(pct)}% complete`} />
      </div>
      <p className="text-[11.5px] text-ink-3">{target ? `Target ${target.text}` : "No target date"}</p>
    </Link>
  );
}
