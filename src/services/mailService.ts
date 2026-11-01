import { blocksClient } from "@/lib/blocks/client";

/**
 * Transactional email through the tenant's mail configuration (Blocks Mail).
 * Templates live server-side — the `purpose`/`language` pair picks one, and
 * its `{{Placeholders}}` are filled from subjectDataContext/bodyDataContext.
 */

const LANGUAGE = "en-US";

/** Payload for the tenant's `TaskAssigned` template (saved via
    `blocks mail template save`), in sync with its {{Placeholders}}. */
export interface TaskAssignedMail {
  to: string;
  assigneeName: string;
  actorName: string;
  taskTitle: string;
  projectName: string;
  dueDate: string;
  appUrl: string;
}

export async function sendTaskAssignedEmail(mail: TaskAssignedMail): Promise<void> {
  const context: Record<string, string> = {
    AssigneeName: mail.assigneeName,
    ActorName: mail.actorName,
    TaskTitle: mail.taskTitle,
    ProjectName: mail.projectName,
    TaskDueDate: mail.dueDate,
    AppUrl: mail.appUrl,
  };
  await blocksClient.mail.send({
    to: [mail.to],
    purpose: "TaskAssigned",
    language: LANGUAGE,
    subjectDataContext: { TaskTitle: mail.taskTitle },
    bodyDataContext: context,
  });
}
