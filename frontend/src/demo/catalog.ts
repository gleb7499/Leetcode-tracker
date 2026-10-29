import type { Difficulty } from "@/src/shared/types"
import { findSeedProblem } from "./seed"

export interface DemoProblem {
  name: string
  difficulty: Difficulty
  topics: string[]
  notes?: string
}

type CatalogRow = [slug: string, name: string, difficulty: Difficulty, topics: string[]]

// Well-known problems the demo "resolves" from a pasted LeetCode link, so the
// add-task flow shows its happy path without a network lookup.
const EXTRA_PROBLEMS: CatalogRow[] = [
  ["palindrome-number", "Palindrome Number", "Easy", ["Math"]],
  ["roman-to-integer", "Roman to Integer", "Easy", ["Hash Table", "Math", "String"]],
  ["climbing-stairs", "Climbing Stairs", "Easy", ["Math", "Dynamic Programming"]],
  ["contains-duplicate", "Contains Duplicate", "Easy", ["Array", "Hash Table", "Sorting"]],
  ["valid-anagram", "Valid Anagram", "Easy", ["Hash Table", "String", "Sorting"]],
  ["reverse-linked-list", "Reverse Linked List", "Easy", ["Linked List", "Recursion"]],
  ["invert-binary-tree", "Invert Binary Tree", "Easy", ["Tree", "Depth-First Search", "Breadth-First Search"]],
  ["maximum-depth-of-binary-tree", "Maximum Depth of Binary Tree", "Easy", ["Tree", "Depth-First Search"]],
  ["linked-list-cycle", "Linked List Cycle", "Easy", ["Hash Table", "Linked List", "Two Pointers"]],
  ["min-stack", "Min Stack", "Medium", ["Stack", "Design"]],
  ["rotate-image", "Rotate Image", "Medium", ["Array", "Math", "Matrix"]],
  ["group-anagrams", "Group Anagrams", "Medium", ["Array", "Hash Table", "String", "Sorting"]],
  ["top-k-frequent-elements", "Top K Frequent Elements", "Medium", ["Array", "Hash Table", "Heap (Priority Queue)"]],
  ["product-of-array-except-self", "Product of Array Except Self", "Medium", ["Array", "Prefix Sum"]],
  ["longest-consecutive-sequence", "Longest Consecutive Sequence", "Medium", ["Array", "Hash Table", "Union Find"]],
  ["house-robber", "House Robber", "Medium", ["Array", "Dynamic Programming"]],
  ["longest-palindromic-substring", "Longest Palindromic Substring", "Medium", ["Two Pointers", "String", "Dynamic Programming"]],
  ["search-in-rotated-sorted-array", "Search in Rotated Sorted Array", "Medium", ["Array", "Binary Search"]],
  ["find-minimum-in-rotated-sorted-array", "Find Minimum in Rotated Sorted Array", "Medium", ["Array", "Binary Search"]],
  ["validate-binary-search-tree", "Validate Binary Search Tree", "Medium", ["Tree", "Depth-First Search", "Binary Search Tree"]],
  ["lowest-common-ancestor-of-a-binary-search-tree", "Lowest Common Ancestor of a Binary Search Tree", "Medium", ["Tree", "Binary Search Tree"]],
  ["clone-graph", "Clone Graph", "Medium", ["Hash Table", "Depth-First Search", "Breadth-First Search", "Graph"]],
  ["pacific-atlantic-water-flow", "Pacific Atlantic Water Flow", "Medium", ["Array", "Depth-First Search", "Matrix"]],
  ["subsets", "Subsets", "Medium", ["Array", "Backtracking", "Bit Manipulation"]],
  ["permutations", "Permutations", "Medium", ["Array", "Backtracking"]],
  ["combination-sum", "Combination Sum", "Medium", ["Array", "Backtracking"]],
  ["word-search", "Word Search", "Medium", ["Array", "Backtracking", "Matrix"]],
  ["task-scheduler", "Task Scheduler", "Medium", ["Array", "Hash Table", "Greedy", "Heap (Priority Queue)"]],
  ["trapping-rain-water", "Trapping Rain Water", "Hard", ["Array", "Two Pointers", "Dynamic Programming", "Stack"]],
  ["median-of-two-sorted-arrays", "Median of Two Sorted Arrays", "Hard", ["Array", "Binary Search", "Divide and Conquer"]],
  ["word-ladder", "Word Ladder", "Hard", ["Hash Table", "String", "Breadth-First Search"]],
  ["serialize-and-deserialize-binary-tree", "Serialize and Deserialize Binary Tree", "Hard", ["String", "Tree", "Design"]],
  ["minimum-window-substring", "Minimum Window Substring", "Hard", ["Hash Table", "String", "Sliding Window"]],
  ["largest-rectangle-in-histogram", "Largest Rectangle in Histogram", "Hard", ["Array", "Stack", "Monotonic Stack"]],
]

const EXTRA_BY_SLUG = new Map(EXTRA_PROBLEMS.map(([slug, name, difficulty, topics]) => [slug, { name, difficulty, topics }]))

export function findDemoProblem(slug: string): DemoProblem | null {
  return findSeedProblem(slug) ?? EXTRA_BY_SLUG.get(slug) ?? null
}
