import type { ComponentPropsWithoutRef } from "react"

type LeetCodeIconProps = Omit<ComponentPropsWithoutRef<"img">, "src" | "alt">

export function LeetCodeIcon(props: LeetCodeIconProps) {
  return <img src={`${import.meta.env.BASE_URL}leetcode-logo.svg`} alt="" {...props} />
}