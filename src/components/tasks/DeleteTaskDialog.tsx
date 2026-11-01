import { Dialog, DialogContent, DialogHeader } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useDataStore } from "@/store/data";
import { useUiStore } from "@/store/ui";
import { toast } from "@/store/toast";

/** Destructive-action confirmation, mounted app-wide. */
export function DeleteTaskDialog() {
  const taskId = useUiStore((s) => s.deleteTaskId);
  const askDeleteTask = useUiStore((s) => s.askDeleteTask);
  const closeDetail = useUiStore((s) => s.closeTask);
  const tasks = useDataStore((s) => s.tasks);
  const projects = useDataStore((s) => s.projects);
  const deleteTask = useDataStore((s) => s.deleteTask);

  const task = tasks.find((t) => t.id === taskId);

  const onConfirm = async () => {
    if (!task) return;
    try {
      await deleteTask(task.id);
      toast.success("Task deleted", task.title);
    } catch {
      toast.error("Could not delete the task", "Please try again.");
    } finally {
      askDeleteTask(null);
      if (useUiStore.getState().taskDetailId === task.id) closeDetail();
    }
  };

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && askDeleteTask(null)}>
      {task && (
        <DialogContent size="md" aria-describedby="delete-task-desc">
          <DialogHeader
            title="Delete this task?"
            description="This can't be undone in the prototype."
          />
          <div className="px-5 py-4">
            <p id="delete-task-desc" className="text-[13px] leading-relaxed text-ink-2">
              “<span className="font-medium text-ink">{task.title}</span>” will be removed from{" "}
              {projects.find((p) => p.id === task.projectId)?.name ?? "its project"}.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => askDeleteTask(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => void onConfirm()}>
                Delete task
              </Button>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
