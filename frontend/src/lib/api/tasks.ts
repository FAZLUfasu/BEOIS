import { apiRequest } from "@/lib/api/client";

import type {
  BeoisTask,
  CreateTaskPayload,
  MyTaskStatusPayload,
  TaskAssignee,
  TaskPriority,
  TaskSourceModule,
  TaskStatus,
  UpdateTaskPayload,
} from "@/types/tasks";

function buildQuery(
  params: Record<string, string | boolean | undefined>,
) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== "" &&
      value !== false
    ) {
      search.set(key, String(value));
    }
  });

  const query = search.toString();

  return query ? `?${query}` : "";
}

export function getTasks(options?: {
  status?: TaskStatus;
  priority?: TaskPriority;
  sourceModule?: TaskSourceModule;
  assignedTo?: string;
  overdue?: boolean;
}) {
  const query = buildQuery({
    status: options?.status,
    priority: options?.priority,
    source_module: options?.sourceModule,
    assigned_to: options?.assignedTo,
    overdue: options?.overdue,
  });

  return apiRequest<BeoisTask[]>(
    `/notifications/tasks/${query}`,
  );
}

export function getMyTasks(options?: {
  status?: TaskStatus;
}) {
  const query = buildQuery({
    status: options?.status,
  });

  return apiRequest<BeoisTask[]>(
    `/notifications/my-tasks/${query}`,
  );
}

export function createTask(
  payload: CreateTaskPayload,
) {
  return apiRequest<BeoisTask>(
    "/notifications/tasks/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function updateTask(
  taskId: string,
  payload: UpdateTaskPayload,
) {
  return apiRequest<BeoisTask>(
    `/notifications/tasks/${taskId}/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function deleteTask(taskId: string) {
  return apiRequest<void>(
    `/notifications/tasks/${taskId}/`,
    {
      method: "DELETE",
    },
  );
}

export function updateMyTaskStatus(
  taskId: string,
  payload: MyTaskStatusPayload,
) {
  return apiRequest<BeoisTask>(
    `/notifications/my-tasks/${taskId}/status/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function getTaskAssignees() {
  return apiRequest<TaskAssignee[]>(
    "/notifications/task-assignees/",
  );
}