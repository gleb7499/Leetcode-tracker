import type { TaskSource } from "@/src/shared/types"
import { MOCK_REVIEW_TASKS } from "@/data/review-tasks"

export interface TopicSearchProvider {
  search: (query: string) => string[]
}

const TOPIC_SEARCH_RESULT_LIMIT = 8

function collectMockTopics(): string[] {
  const uniqueTopics = new Set<string>()
  for (const task of MOCK_REVIEW_TASKS) {
    for (const topic of task.topics) {
      uniqueTopics.add(topic)
    }
  }

  return Array.from(uniqueTopics).sort((left, right) => left.localeCompare(right))
}

const MOCK_TOPIC_CATALOG = collectMockTopics()

const mockTopicSearchProvider: TopicSearchProvider = {
  search(query: string): string[] {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return []

    return MOCK_TOPIC_CATALOG.filter((topic) => topic.toLowerCase().includes(normalizedQuery)).slice(
      0,
      TOPIC_SEARCH_RESULT_LIMIT,
    )
  },
}

const sourceProviders = new Map<TaskSource, TopicSearchProvider>([
  ["leetcode", mockTopicSearchProvider],
  ["custom", mockTopicSearchProvider],
])

export function searchTopicsForSource(source: TaskSource, query: string): string[] {
  const provider = sourceProviders.get(source)
  if (!provider) return []

  return provider.search(query)
}
