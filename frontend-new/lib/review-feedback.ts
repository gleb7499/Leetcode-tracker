export type ReviewFeedback = "remember" | "partial" | "forgot"

export interface ReviewFeedbackOption {
  value: ReviewFeedback
  label: string
}

export const REVIEW_FEEDBACK_OPTIONS: ReadonlyArray<ReviewFeedbackOption> = [
  {
    value: "remember",
    label: "Remembered",
  },
  {
    value: "partial",
    label: "Almost remembered",
  },
  {
    value: "forgot",
    label: "Did not remember",
  },
]