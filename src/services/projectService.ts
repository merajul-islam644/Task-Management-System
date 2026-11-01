import type { Project, ProjectInput } from "@/types";
import * as blocksData from "@/services/blocksData";

/** Project repository over the Blocks Data Gateway. */

export async function listProjects(): Promise<Project[]> {
  return blocksData.listProjects();
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const result = await blocksData.projects.create(blocksData.projectPayload(input));
  return {
    id: blocksData.resultItemId(result),
    name: input.name?.trim() ?? "Untitled project",
    description: input.description?.trim() || "",
    status: input.status ?? "on_track",
    color: input.color ?? "iris",
    targetDate: input.targetDate || undefined,
    memberIds: input.memberIds ?? [],
    archived: input.archived ?? false,
    createdAt: new Date().toISOString(),
  };
}

export async function updateProject(id: string, patch: ProjectInput, prev: Project): Promise<Project> {
  const result = await blocksData.projects.update(id, blocksData.projectPayload(patch));
  return { ...blocksData.mergeProject(prev, patch), id: blocksData.resultItemId(result) || id };
}
