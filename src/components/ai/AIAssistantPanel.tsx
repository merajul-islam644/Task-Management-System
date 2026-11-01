import { useEffect, useRef, useState } from "react";
import { ArrowUp, CalendarClock, Check, ListPlus, Sparkles } from "lucide-react";
import { Dialog, SheetContent } from "@/components/ui/Dialog";
import { Badge, Kbd } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Feedback";
import { PriorityChip } from "@/components/tasks/chips";
import { PROMPT_CHIPS, generateSuggestions } from "@/data/ai";
import { useDataStore } from "@/store/data";
import { useUiStore } from "@/store/ui";
import { toast } from "@/store/toast";
import { cn } from "@/lib/utils";
import type { AIResponse } from "@/types";

type Phase = "idle" | "thinking" | "answered";

/**
 * "Ask FlowTask AI" — a simulated assistant. Responses are generated
 * deterministically from local mock data; there is no model behind this.
 */
export function AIAssistantPanel() {
  const open = useUiStore((s) => s.aiOpen);
  const setOpen = useUiStore((s) => s.setAiOpen);
  const projects = useDataStore((s) => s.projects);
  const tasks = useDataStore((s) => s.tasks);
  const addSuggestedTasks = useDataStore((s) => s.addSuggestedTasks);

  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [targetProject, setTargetProject] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const ask = (raw: string) => {
    const text = raw.trim();
    if (!text || phase === "thinking") return;
    setPrompt(text);
    setPhase("thinking");
    setResponse(null);
    setAdded(new Set());
    // Small, deliberate delay sells the "assistant at work" moment — fully local.
    timerRef.current = window.setTimeout(() => {
      const result = generateSuggestions(text, { tasks, projects });
      setResponse(result);
      setSelected(new Set(result.suggestions.map((s) => s.id)));
      const q = text.toLowerCase();
      const matched = projects.find((p) =>
        p.name
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 3)
          .some((w) => q.includes(w)),
      );
      const projectId = matched?.id ?? projects[0]?.id ?? "";
      setTargetProject(projectId);
      setPhase("answered");
    }, 750);
  };

  const toggleSuggestion = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addSelected = async () => {
    if (!response || selected.size === 0) return;
    setSaving(true);
    try {
      const picked = response.suggestions.filter((s) => selected.has(s.id));
      const created = await addSuggestedTasks(picked, targetProject);
      setAdded(new Set(picked.map((s) => s.id)));
      setSelected(new Set());
      toast.success(
        `Added ${created.length} task${created.length === 1 ? "" : "s"}`,
        `Placed in ${projects.find((p) => p.id === targetProject)?.name ?? "your workspace"} — move them any time.`,
      );
    } catch {
      toast.error("Could not add the tasks", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const targetName = projects.find((p) => p.id === targetProject)?.name;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <SheetContent label="Ask FlowTask AI" width="wide">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-ctl bg-accent-soft text-accent-ink">
            <Sparkles size={16} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Ask FlowTask AI</h2>
            <Badge className="mt-1 border-warn-line bg-warn-soft text-warn">Demo mode — suggestions are simulated</Badge>
          </div>
        </div>

        {/* Conversation */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4" aria-live="polite">
          {phase === "idle" && (
            <div className="flex flex-col gap-4">
              <p className="text-[13.5px] leading-relaxed text-ink-2">
                Describe what you need — a launch checklist, a project breakdown, or a plan for
                the week. Answers are generated on-device from your mock workspace.
              </p>
              <div className="flex flex-wrap gap-2" aria-label="Suggested prompts">
                {PROMPT_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => ask(chip)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:border-accent-soft-line hover:bg-accent-soft/40 hover:text-ink"
                  >
                    <Sparkles size={11} className="text-accent-ink" aria-hidden />
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {prompt && (
            <div className="mb-4 flex justify-end">
              <p className="max-w-[85%] rounded-[12px] rounded-br-[4px] bg-accent-soft px-3.5 py-2 text-[13px] text-ink">
                {prompt}
              </p>
            </div>
          )}

          {phase === "thinking" && (
            <div className="flex flex-col gap-2" role="status" aria-label="Preparing suggestions">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="mt-2 h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          )}

          {phase === "answered" && response && (
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="text-[14px] font-semibold">{response.headline}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{response.summary}</p>
              </div>

              <div className="flex flex-col gap-2" role="group" aria-label="Suggested tasks">
                {response.suggestions.map((sug) => {
                  const isAdded = added.has(sug.id);
                  const isSelected = selected.has(sug.id);
                  return (
                    <label
                      key={sug.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-card border px-3 py-2.5 transition-colors",
                        isAdded
                          ? "border-ok-line bg-ok-soft/60"
                          : isSelected
                            ? "border-accent-soft-line bg-accent-soft/40"
                            : "border-line bg-surface hover:bg-surface-hover/60",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isAdded || isSelected}
                        disabled={isAdded}
                        onChange={() => toggleSuggestion(sug.id)}
                        aria-label={`Add “${sug.title}”`}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent-solid)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-[13px] font-medium", isAdded && "text-ink-2")}>
                          {sug.title}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-2">
                          <PriorityChip priority={sug.priority} />
                          <span className="inline-flex items-center gap-1 text-[11.5px] text-ink-3">
                            <CalendarClock size={11} aria-hidden />
                            {sug.dueInDays === 0
                              ? "Due today"
                              : sug.dueInDays === 1
                                ? "Due tomorrow"
                                : sug.dueInDays !== undefined
                                  ? `Due in ${sug.dueInDays} days`
                                  : "No due date"}
                          </span>
                          {isAdded && (
                            <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-ok">
                              <Check size={11} aria-hidden /> Added
                            </span>
                          )}
                        </span>
                        {sug.rationale && (
                          <span className="mt-1 block text-[12px] leading-relaxed text-ink-3">{sug.rationale}</span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-2 rounded-ctl bg-surface-hover/60 px-3 py-2">
                <p className="text-[11.5px] text-ink-3">
                  Tasks will be added to <span className="font-medium text-ink-2">{targetName}</span>
                </p>
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="sm" onClick={() => setSelected(new Set(response.suggestions.map((s) => s.id)))}>
                    Select all
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={selected.size === 0 || saving}
                    onClick={() => void addSelected()}
                  >
                    <ListPlus size={13} aria-hidden />
                    {saving ? "Adding…" : `Add ${selected.size || ""} selected`}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form
          className="border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            ask(prompt);
          }}
        >
          <div className="flex items-end gap-2 rounded-card border border-line-strong bg-surface p-2 transition-colors focus-within:border-accent">
            <label htmlFor="ai-prompt" className="sr-only">
              Ask FlowTask AI
            </label>
            <textarea
              id="ai-prompt"
              value={phase === "idle" ? prompt : ""}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(prompt);
                }
              }}
              rows={1}
              placeholder="e.g. Prepare a launch checklist for our new website"
              className="max-h-28 min-h-6 flex-1 resize-none bg-transparent px-1 py-0.5 text-[13.5px] outline-none placeholder:text-ink-3"
            />
            <IconButton
              label="Send prompt"
              variant="primary"
              type="submit"
              disabled={!prompt.trim() || phase === "thinking"}
            >
              <ArrowUp size={15} />
            </IconButton>
          </div>
          <p className="mt-2 flex items-center justify-between px-1 text-[11px] text-ink-3">
            <span>Simulated responses — nothing is sent to a server.</span>
            <span className="hidden items-center gap-1 sm:flex">
              <Kbd>Enter</Kbd> to send
            </span>
          </p>
        </form>
      </SheetContent>
    </Dialog>
  );
}
