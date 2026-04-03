import { useState } from "react"
import { Search, ChevronRight, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type CardStatus = "mastered" | "learning" | "new"

interface LibraryCard {
  name: string
  status: CardStatus
}

interface Category {
  name: string
  total: number
  mastered: number
  cards: LibraryCard[]
}

interface LibraryPanelProps {
  className?: string
}

const MOCK_CATEGORIES: readonly Category[] = [
  {
    name: "Arrays & Strings",
    total: 15,
    mastered: 8,
    cards: [
      { name: "Two Sum", status: "mastered" },
      { name: "Binary Search", status: "mastered" },
      { name: "Sliding Window", status: "learning" },
      { name: "Two Pointers", status: "new" },
    ],
  },
  {
    name: "Trees & Graphs",
    total: 12,
    mastered: 3,
    cards: [
      { name: "BFS", status: "mastered" },
      { name: "DFS", status: "learning" },
      { name: "Dijkstra", status: "new" },
    ],
  },
  {
    name: "Dynamic Programming",
    total: 10,
    mastered: 2,
    cards: [
      { name: "Fibonacci", status: "mastered" },
      { name: "Knapsack", status: "learning" },
      { name: "LCS", status: "new" },
    ],
  },
]

const statusConfig: Record<CardStatus, { icon: React.ElementType; color: string; bg: string }> = {
  mastered: { icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10" },
  learning: { icon: Clock, color: "text-accent", bg: "bg-accent/10" },
  new: { icon: AlertCircle, color: "text-muted-foreground", bg: "bg-secondary" },
}

export function LibraryPanel({ className }: LibraryPanelProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredCategories = MOCK_CATEGORIES.filter(
    (cat) =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.cards.some((card) => card.name.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  return (
    <div className={cn("flex flex-col gap-4 p-6", className)}>
      <h2 className="text-xl font-semibold text-foreground">Algorithm Library</h2>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search algorithms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-subtle text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto app-scrollbar flex-1 pr-1">
        {filteredCategories.map((category) => {
          const masteryPercent = (category.mastered / category.total) * 100
          const isExpanded = expandedCategory === category.name

          return (
            <div key={category.name} className="glass-subtle rounded-2xl overflow-hidden">
              <button
                onClick={() =>
                  setExpandedCategory(isExpanded ? null : category.name)
                }
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                aria-expanded={isExpanded}
              >
                <div className="flex flex-col items-start gap-1">
                  <span className="font-medium text-foreground">{category.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {category.mastered}/{category.total} mastered
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="progress-fill h-full bg-primary rounded-full"
                      style={{ "--progress": `${masteryPercent}%` } as React.CSSProperties}
                    />
                  </div>
                  <ChevronRight
                    className={cn(
                      "w-5 h-5 text-muted-foreground transition-transform duration-300",
                      isExpanded && "rotate-90",
                    )}
                  />
                </div>
              </button>

              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  isExpanded ? "max-h-64 opacity-100" : "max-h-0 opacity-0",
                )}
              >
                <div className="px-4 pb-4 flex flex-col gap-2">
                  {category.cards.map((card) => {
                    const config = statusConfig[card.status]
                    const Icon = config.icon
                    return (
                      <div
                        key={card.name}
                        className={cn("flex items-center gap-3 p-3 rounded-xl transition-colors", config.bg)}
                      >
                        <Icon className={cn("w-4 h-4", config.color)} />
                        <span className="text-sm text-foreground">{card.name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
