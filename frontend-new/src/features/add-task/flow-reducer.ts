import type { ResolvedTaskDraft, TaskSource } from "@/src/shared/types"

export type AddTaskFlowStep =
  | "source-select"
  | "leetcode-url"
  | "loading"
  | "solved-check"
  | "optional-note"
  | "success"

export interface AddTaskFlowState {
  step: AddTaskFlowStep
  source: TaskSource | null
  leetCodeUrl: string
  leetCodeUrlError?: string
  resolvedTaskDraft: ResolvedTaskDraft | null
  resolveError?: string
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
  | { type: "RESOLVE_FAILURE"; error: string }
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
      if (action.source !== "leetcode") {
        return state
      }
      return {
        ...state,
        source: action.source,
        step: "leetcode-url",
        leetCodeUrlError: undefined,
        resolveError: undefined,
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
      }
    case "RESOLVE_FAILURE":
      return {
        ...state,
        step: "leetcode-url",
        resolveError: action.error,
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
