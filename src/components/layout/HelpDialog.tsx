import { Dialog, DialogContent, DialogHeader } from "@/components/ui/Dialog";
import { Kbd } from "@/components/ui/Badge";

const SHORTCUTS: { keys: string[]; action: string }[] = [
  { keys: ["⌘", "K"], action: "Search and jump anywhere" },
  { keys: ["Esc"], action: "Close dialogs and panels" },
];

export function HelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader
          title="Help & feedback"
          description="FlowTask is a frontend prototype — data is mock, the AI assistant is simulated, and there is no backend yet."
        />
        <div className="flex flex-col gap-5 px-5 py-4">
          <section>
            <h3 className="mb-2 text-[12.5px] font-semibold text-ink-2">Keyboard shortcuts</h3>
            <ul className="flex flex-col gap-1.5">
              {SHORTCUTS.map((s) => (
                <li key={s.action} className="flex items-center justify-between gap-4 text-[13px]">
                  <span className="text-ink-2">{s.action}</span>
                  <span className="flex gap-1">
                    {s.keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="mb-1 text-[12.5px] font-semibold text-ink-2">Feedback</h3>
            <p className="text-[13px] leading-relaxed text-ink-2">
              This build is a portfolio demo. What you see — tasks, projects, activity — is
              sample data stored in your browser for this session.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
