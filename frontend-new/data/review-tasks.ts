export type Difficulty = "Easy" | "Medium" | "Hard"

export interface ReviewTask {
  id: string
  name: string
  url: string
  difficulty: Difficulty
  topics: string[]
  notes: string
}

/** Placeholder task list used until the backend API is integrated. */
export const MOCK_REVIEW_TASKS: readonly ReviewTask[] = [
  {
    id: "add-two-numbers",
    name: "Add Two Numbers",
    url: "https://leetcode.com/problems/add-two-numbers/",
    difficulty: "Medium",
    topics: ["Linked List", "Math", "Recursion"],
    notes: "Add two numbers represented in reverse order using linked lists.",
  },
  {
    id: "binary-search",
    name: "Binary Search",
    url: "https://leetcode.com/problems/binary-search/",
    difficulty: "Easy",
    topics: ["Array", "Binary Search"],
    notes: "Find the target index in a sorted array in logarithmic time.",
  },
  {
    id: "lru-cache",
    name: "LRU Cache",
    url: "https://leetcode.com/problems/lru-cache/",
    difficulty: "Medium",
    topics: ["Hash Table", "Linked List", "Design"],
    notes: "Design an O(1) cache with get and put operations using LRU eviction.",
  },
  {
    id: "merge-k-sorted-lists",
    name: "Merge K Sorted Lists",
    url: "https://leetcode.com/problems/merge-k-sorted-lists/",
    difficulty: "Hard",
    topics: ["Linked List", "Divide and Conquer", "Heap"],
    notes: "Merge multiple sorted lists into one list with efficient complexity.",
  },
]
