import { apiFetch } from "./client"
import { extractLeetCodeProblemSlug } from "@/src/shared/tasks/leetcode-url"
import type { Difficulty, ReviewStatus, Task, TaskSource } from "@/src/shared/types"

export interface ReviewEntryDto {
  date: string
  status: string
}

export interface TaskDto {
  id: number
  name: string
  url: string | null
  difficulty: string
  topics: string[]
  notes: string | null
  source: string
  sourceMeta: string | null
  scheduleMode: string
  createdAt: string
  nextReview: string
  reviews: ReviewEntryDto[]
}

const DIFFICULTY_MAP: Record<string, Difficulty> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
}

const SOURCE_MAP: Record<string, TaskSource> = {
  leetcode_url: "leetcode",
  manual: "custom",
}

export function mapTaskDto(dto: TaskDto): Task {
  const url = dto.url ?? ""
  const source = SOURCE_MAP[dto.source] ?? "custom"
  let slug: string | null = null
  if (source === "leetcode" && url) {
    try {
      slug = extractLeetCodeProblemSlug(new URL(url).pathname)
    } catch {
      slug = null
    }
  }
  return {
    id: String(dto.id),
    name: dto.name,
    url,
    difficulty: DIFFICULTY_MAP[dto.difficulty] ?? "Medium",
    topics: dto.topics ?? [],
    notes: dto.notes ?? "",
    source,
    sourceMeta: slug ? { slug } : undefined,
    createdAt: dto.createdAt,
    nextReview: dto.nextReview,
    reviews: (dto.reviews ?? []).map((review) => ({
      date: review.date,
      status: review.status as ReviewStatus,
    })),
  }
}

export interface TaskCreatePayload {
  name: string
  url: string
  difficulty: Difficulty
  topics: string[]
  notes: string
  scheduleMode: "spaced_repetition" | "disabled"
}

export const tasksApi = {
  list(): Promise<TaskDto[]> {
    return apiFetch<TaskDto[]>("/v1/me/tasks")
  },

  today(): Promise<TaskDto[]> {
    return apiFetch<TaskDto[]>("/v1/me/tasks/today")
  },

  create(payload: TaskCreatePayload): Promise<TaskDto> {
    return apiFetch<TaskDto>("/v1/me/tasks", { method: "POST", body: payload })
  },

  remove(taskId: string): Promise<unknown> {
    return apiFetch<unknown>(`/v1/me/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" })
  },

  review(taskId: string, status: ReviewStatus): Promise<TaskDto> {
    return apiFetch<TaskDto>(`/v1/me/tasks/${encodeURIComponent(taskId)}/reviews`, {
      method: "POST",
      body: { status },
    })
  },
}
