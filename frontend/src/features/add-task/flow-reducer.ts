import type { Difficulty, ResolvedTaskDraft, TaskSource } from "@/src/shared/types"

export type AddTaskFlowStep =
  | "source-select"
  | "leetcode-url"
  | "loading"
  | "manual-details"
  | "solved-check"
  | "optional-note"
  | "success"

export const ADD_TASK_FLOW_STEP_ORDER: AddTaskFlowStep[] = [
  "source-select",
  "leetcode-url",
  "loading",
  "manual-details",
  "solved-check",
  "optional-note",
  "success",
]

interface ManualFieldErrors {
  name?: string
  difficulty?: string
  topics?: string
}

interface ManualDetailsState {
  name: string
  difficulty: Difficulty | null
  topicQuery: string
  topics: string[]
  url: string
  sourceMeta?: ResolvedTaskDraft["sourceMeta"]
  errors: ManualFieldErrors
}

function createManualDetailsState(
  overrides: Partial<Omit<ManualDetailsState, "errors">> = {},
): ManualDetailsState {
  return {
    name: "",
    difficulty: null,
    topicQuery: "",
    topics: [],
    url: "",
    sourceMeta: undefined,
    errors: {},
    ...overrides,
  }
}

function createManualDetailsFromDraft(
  draft: ResolvedTaskDraft,
  options: { presetDifficulty?: boolean } = {},
): ManualDetailsState {
  const presetDifficulty = options.presetDifficulty ?? true

  return createManualDetailsState({
    name: draft.name,
    difficulty: presetDifficulty ? draft.difficulty : null,
    topics: draft.topics,
    url: draft.url,
    sourceMeta: draft.sourceMeta,
  })
}

export interface AddTaskFlowState {
  step: AddTaskFlowStep
  source: TaskSource | null
  leetCodeUrl: string
  leetCodeUrlError?: string
  resolvedTaskDraft: ResolvedTaskDraft | null
  resolveError?: string
  manualDetails: ManualDetailsState
  note: string
  successMessage?: string
}

export type AddTaskFlowAction =
  | { type: "RESET" }
  | { type: "SELECT_SOURCE"; source: TaskSource }
  | { type: "UPDATE_LEETCODE_URL"; value: string }
  | { type: "SET_LEETCODE_URL_ERROR"; error?: string }
  | { type: "SUBMIT_LEETCODE_URL" }
  | { type: "RESOLVE_SUCCESS"; draft: ResolvedTaskDraft }
  | { type: "RESOLVE_FAILURE"; error: string; fallbackDraft?: ResolvedTaskDraft }
  | { type: "UPDATE_MANUAL_NAME"; value: string }
  | { type: "UPDATE_MANUAL_DIFFICULTY"; value: Difficulty }
  | { type: "UPDATE_MANUAL_TOPIC_QUERY"; value: string }
  | { type: "ADD_MANUAL_TOPIC"; topic: string }
  | { type: "REMOVE_MANUAL_TOPIC"; topic: string }
  | { type: "SET_MANUAL_FIELD_ERROR"; field: keyof ManualFieldErrors; error?: string }
  | { type: "SUBMIT_MANUAL_DETAILS"; draft: ResolvedTaskDraft }
  | { type: "BACK_FROM_MANUAL_DETAILS" }
  | { type: "BACK_TO_SOURCE_SELECT" }
  | { type: "ANSWER_UNSOLVED" }
  | { type: "ANSWER_SOLVED" }
  | { type: "BACK_TO_SOLVED_CHECK" }
  | { type: "UPDATE_NOTE"; value: string }
  | { type: "SAVE_SUCCESS"; message: string }

export const initialAddTaskFlowState: AddTaskFlowState = {
  step: "source-select",
  source: null,
  leetCodeUrl: "",
  resolvedTaskDraft: null,
  manualDetails: createManualDetailsState(),
  note: "",
}

export function addTaskFlowReducer(
  state: AddTaskFlowState,
  action: AddTaskFlowAction,
): AddTaskFlowState {
  switch (action.type) {
    case "RESET":
      return initialAddTaskFlowState
    case "SELECT_SOURCE":
      if (action.source === "custom") {
        return {
          ...state,
          source: "custom",
          step: "manual-details",
          leetCodeUrlError: undefined,
          resolveError: undefined,
          resolvedTaskDraft: null,
          note: "",
          manualDetails: createManualDetailsState(),
        }
      }
      if (action.source !== "leetcode") {
        return state
      }
      return {
        ...state,
        source: action.source,
        step: "leetcode-url",
        leetCodeUrlError: undefined,
        resolveError: undefined,
        resolvedTaskDraft: null,
        note: "",
        manualDetails: createManualDetailsState(),
      }
    case "UPDATE_LEETCODE_URL":
      return {
        ...state,
        leetCodeUrl: action.value,
        leetCodeUrlError: undefined,
        resolveError: undefined,
      }
    case "SET_LEETCODE_URL_ERROR":
      return {
        ...state,
        leetCodeUrlError: action.error,
      }
    case "SUBMIT_LEETCODE_URL":
      return {
        ...state,
        step: "loading",
        leetCodeUrlError: undefined,
        resolveError: undefined,
      }
    case "RESOLVE_SUCCESS":
      return {
        ...state,
        step: "solved-check",
        resolvedTaskDraft: action.draft,
        resolveError: undefined,
        manualDetails: createManualDetailsFromDraft(action.draft),
      }
    case "RESOLVE_FAILURE":
      if (action.fallbackDraft) {
        return {
          ...state,
          step: "manual-details",
          resolveError: action.error,
          resolvedTaskDraft: null,
          manualDetails: createManualDetailsFromDraft(action.fallbackDraft, {
            presetDifficulty: false,
          }),
        }
      }
      return {
        ...state,
        step: "leetcode-url",
        resolveError: action.error,
      }
    case "UPDATE_MANUAL_NAME":
      return {
        ...state,
        manualDetails: {
          ...state.manualDetails,
          name: action.value,
          errors: {
            ...state.manualDetails.errors,
            name: undefined,
          },
        },
      }
    case "UPDATE_MANUAL_DIFFICULTY":
      return {
        ...state,
        manualDetails: {
          ...state.manualDetails,
          difficulty: action.value,
          errors: {
            ...state.manualDetails.errors,
            difficulty: undefined,
          },
        },
      }
    case "UPDATE_MANUAL_TOPIC_QUERY":
      return {
        ...state,
        manualDetails: {
          ...state.manualDetails,
          topicQuery: action.value,
        },
      }
    case "ADD_MANUAL_TOPIC": {
      const topic = action.topic.trim()
      if (!topic || state.manualDetails.topics.includes(topic)) {
        return state
      }

      return {
        ...state,
        manualDetails: {
          ...state.manualDetails,
          topicQuery: "",
          topics: [...state.manualDetails.topics, topic],
          errors: {
            ...state.manualDetails.errors,
            topics: undefined,
          },
        },
      }
    }
    case "REMOVE_MANUAL_TOPIC":
      return {
        ...state,
        manualDetails: {
          ...state.manualDetails,
          topics: state.manualDetails.topics.filter((topic) => topic !== action.topic),
        },
      }
    case "SET_MANUAL_FIELD_ERROR":
      return {
        ...state,
        manualDetails: {
          ...state.manualDetails,
          errors: {
            ...state.manualDetails.errors,
            [action.field]: action.error,
          },
        },
      }
    case "SUBMIT_MANUAL_DETAILS":
      return {
        ...state,
        step: "solved-check",
        resolvedTaskDraft: action.draft,
        resolveError: undefined,
        manualDetails: createManualDetailsFromDraft(action.draft),
      }
    case "BACK_FROM_MANUAL_DETAILS":
      if (state.source === "leetcode") {
        return {
          ...state,
          step: "leetcode-url",
          resolvedTaskDraft: null,
        }
      }
      return {
        ...initialAddTaskFlowState,
      }
    case "BACK_TO_SOURCE_SELECT":
      return {
        ...initialAddTaskFlowState,
      }
    case "ANSWER_UNSOLVED":
      return state.step === "solved-check"
        ? {
            ...state,
            step: "success",
          }
        : state
    case "ANSWER_SOLVED":
      return state.step === "solved-check"
        ? {
            ...state,
            step: "optional-note",
          }
        : state
    case "BACK_TO_SOLVED_CHECK":
      return state.step === "optional-note"
        ? {
            ...state,
            step: "solved-check",
          }
        : state
    case "UPDATE_NOTE":
      return {
        ...state,
        note: action.value,
      }
    case "SAVE_SUCCESS":
      return {
        ...state,
        step: "success",
        successMessage: action.message,
      }
    default:
      return state
  }
}
