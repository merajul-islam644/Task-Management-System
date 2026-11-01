import { differenceInCalendarDays, parseISO } from "date-fns";
import type { AIResponse, AISuggestedTask, Project, Task, TaskPriority } from "@/types";
import { uid } from "@/lib/utils";

/**
 * Deterministic, simulated AI. No network calls, no model — keyword routing
 * over canned templates, plus data-aware summaries built from local state.
 * TODO(backend): swap for a real assistant endpoint; keep the response shape.
 */

interface Ctx {
  tasks: Task[];
  projects: Project[];
}

const p = (
  title: string,
  priority: TaskPriority,
  dueInDays?: number,
  rationale?: string,
): AISuggestedTask => ({ id: uid("sug"), title, priority, dueInDays, rationale });

function matchProject(text: string, projects: Project[]): Project | undefined {
  const q = text.toLowerCase();
  return projects.find((proj) => {
    const words = proj.name.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    return words.some((w) => q.includes(w));
  });
}

function launchChecklist(): AISuggestedTask[] {
  return [
    p("Freeze scope and cut a release branch", "urgent", 0, "Nothing new enters the launch build."),
    p("Final QA pass on signup, upgrade, and downgrade", "urgent", 1, "Money paths get a full sweep."),
    p("Write the launch-day runbook", "high", 1, "Owner per step, plus rollback plan."),
    p("Prepare announcement post and changelog", "high", 2),
    p("Brief support on known issues and FAQs", "medium", 2),
    p("Schedule the launch email and social posts", "medium", 3),
    p("Tag and archive the milestone", "low", 4),
  ];
}

function genericBreakdown(prompt: string): AISuggestedTask[] {
  const clean = prompt
    .replace(/^(please\s+)?(help me\s+)?/i, "")
    .replace(/[.?!]+$/, "")
    .trim();
  const subject = clean.length > 2 ? clean.charAt(0).toUpperCase() + clean.slice(1) : "New initiative";
  return [
    p(`Define scope and success criteria for “${subject}”`, "high", 0, "One paragraph everyone agrees on."),
    p(`List tasks and owners for “${subject}”`, "high", 1),
    p(`Draft first milestone plan for “${subject}”`, "medium", 2),
    p(`Identify risks and open questions for “${subject}”`, "medium", 3),
    p(`Schedule a kickoff review for “${subject}”`, "low", 4),
  ];
}

function prioritization(tasks: Task[]): AIResponse {
  const open = tasks
    .filter((t) => t.status !== "done")
    .map((t) => ({
      task: t,
      overdue: t.dueDate ? differenceInCalendarDays(parseISO(t.dueDate), new Date()) < 0 : false,
      dueToday: t.dueDate ? new Date(t.dueDate).toDateString() === new Date().toDateString() : false,
    }))
    .filter((t) => t.overdue || t.dueToday || t.task.priority === "urgent" || t.task.priority === "high")
    .sort((a, b) => {
      const key = (x: typeof a) => (x.overdue ? 0 : x.dueToday ? 1 : 2) * 10 + (x.task.priority === "urgent" ? 0 : 1);
      return key(a) - key(b);
    })
    .slice(0, 5);

  const suggestions = open.map(({ task, overdue }) =>
    p(
      overdue ? `Unblock or reschedule: ${task.title}` : task.title,
      overdue ? "urgent" : task.priority,
      overdue ? 0 : task.dueDate ? differenceInCalendarDays(parseISO(task.dueDate), new Date()) : undefined,
      overdue ? "Overdue — decide: do today or move the date." : undefined,
    ),
  );

  return {
    headline: "Here's your priority order",
    summary:
      suggestions.length > 0
        ? "Based on due dates and priority, start with the overdue items, then today's high-priority work. Everything else can wait."
        : "Nothing is overdue and nothing urgent is open — good place to pull work forward from the backlog.",
    suggestions: suggestions.length > 0 ? suggestions : [p("Plan tomorrow's top three tasks", "medium", 0)],
  };
}

function weekPlan(tasks: Task[], projects: Project[]): AIResponse {
  const open = tasks.filter((t) => t.status !== "done");
  const byProject = projects
    .map((proj) => ({ proj, count: open.filter((t) => t.projectId === proj.id).length }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
    headline: "A calmer plan for this week",
    summary: `You have ${open.length} open tasks. ${
      byProject.length > 0
        ? `${byProject.map((e) => e.proj.name).join(", ")} carry most of it — give each one a focused block instead of context-switching.`
        : "Spread the remaining work across three focus blocks."
    }`,
    suggestions: [
      p("Block two focus hours each morning (no meetings)", "high", 0, "Deep work before the day reacts to you."),
      p(
        byProject[0] ? `Clear the oldest ${byProject[0].proj.name} task` : "Clear the oldest open task",
        "high",
        1,
      ),
      p("Review project dates against this week's capacity", "medium", 2),
      p("Close out or reschedule anything overdue", "urgent", 0),
    ],
  };
}

function progressSummary(tasks: Task[], projects: Project[]): AIResponse {
  const done = tasks.filter((t) => t.status === "done").length;
  const open = tasks.length - done;
  const overdue = tasks.filter(
    (t) => t.status !== "done" && t.dueDate && parseISO(t.dueDate) < new Date(),
  ).length;
  const atRisk = projects.filter((proj) => proj.status === "at_risk");

  return {
    headline: "Where things stand",
    summary: `${done} tasks done, ${open} open${overdue > 0 ? `, ${overdue} overdue` : ""}. ${
      atRisk.length > 0
        ? `${atRisk.map((proj) => proj.name).join(" and ")} need attention before their target dates.`
        : "All projects are on track for their target dates."
    }`,
    suggestions: [
      p("Reschedule or split the overdue tasks", overdue > 0 ? "urgent" : "low", 0),
      p("Write a short status update per project", "medium", 1, "Five lines each: done, next, risks."),
      p("Check target dates against remaining scope", "medium", 2),
    ],
  };
}

export function generateSuggestions(prompt: string, ctx: Ctx): AIResponse {
  const q = prompt.toLowerCase().trim();
  const project = matchProject(q, ctx.projects);
  const projectName = project?.name ?? ctx.projects[0]?.name ?? "your project";

  if (/(launch|release|go.?live|checklist)/.test(q)) {
    return {
      headline: `Launch checklist for ${projectName}`,
      summary: "A ordered, seven-step path from code freeze to follow-up. Deadlines assume a launch this week.",
      suggestions: launchChecklist(),
    };
  }
  if (/(break.?down|split|decompose|steps for)/.test(q)) {
    return {
      headline: "Broken into five steps",
      summary: `A first breakdown of your request, added as tasks in ${projectName}. Reorder or edit after adding.`,
      suggestions: genericBreakdown(prompt),
    };
  }
  if (/(prioriti[sz]e|what.*(first|next)|focus on|urgent)/.test(q)) {
    return prioritization(ctx.tasks);
  }
  if (/(plan.*week|weekly|my week|schedule)/.test(q)) {
    return weekPlan(ctx.tasks, ctx.projects);
  }
  if (/(summar|progress|status|how.*going|report)/.test(q)) {
    return progressSummary(ctx.tasks, ctx.projects);
  }
  return {
    headline: "Here's a starting breakdown",
    summary: `I turned your request into five tasks in ${projectName}. FlowTask demos are simulated — edit anything after adding.`,
    suggestions: genericBreakdown(prompt),
  };
}

export const PROMPT_CHIPS = [
  "Plan my week",
  "Prioritize my tasks",
  "Prepare a launch checklist for our website",
  "Summarize project progress",
  "Break down the mobile app beta rollout",
];
