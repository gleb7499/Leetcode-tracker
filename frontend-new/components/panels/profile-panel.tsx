import { CalendarClock, Fingerprint, LibraryBig, Mail, Target, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CurrentUser, Task } from "@/src/shared/types"

interface ProfilePanelProps {
  currentUser: CurrentUser
  tasks?: Task[]
  className?: string
}

function computeProfileStats(tasks: Task[]) {
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)

  const dueToday = tasks.filter((task) => {
    const nextReviewDate = new Date(task.nextReview)
    if (Number.isNaN(nextReviewDate.getTime())) return false
    return nextReviewDate <= endOfToday
  }).length

  const mastered = tasks.filter((task) =>
    task.reviews.some((review) => review.status === "remember"),
  ).length

  return {
    totalCards: tasks.length,
    masteredCards: mastered,
    dueToday,
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function ProfilePanel({ currentUser, tasks = [], className }: ProfilePanelProps) {
  const stats = computeProfileStats(tasks)
  const initials = getInitials(currentUser.name)

  return (
    <div className={cn("flex flex-col gap-6 p-6", className)}>
      <h2 className="text-xl font-semibold text-foreground">Profile</h2>

      <div className="glass-subtle rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center text-lg font-semibold">
          {initials || "U"}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-foreground truncate">{currentUser.name}</p>
          <p className="text-sm text-muted-foreground break-all">{currentUser.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ProfileStatCard icon={LibraryBig} label="Total cards" value={stats.totalCards} />
        <ProfileStatCard icon={Target} label="Mastered" value={stats.masteredCards} />
        <ProfileStatCard icon={CalendarClock} label="Due today" value={stats.dueToday} />
      </div>

      <div className="glass-subtle rounded-2xl p-4 flex flex-col gap-3">
        <ProfileInfoRow icon={UserRound} label="Display name" value={currentUser.name} />
        <ProfileInfoRow icon={Mail} label="Email" value={currentUser.email} />
        <ProfileInfoRow icon={Fingerprint} label="User ID" value={currentUser.id} mono />
      </div>

      <p className="text-sm text-muted-foreground mt-auto text-center">
        {stats.dueToday > 0
          ? `You have ${stats.dueToday} card${stats.dueToday === 1 ? "" : "s"} ready for review today.`
          : "No cards are due today. Great consistency so far."}
      </p>
    </div>
  )
}

interface ProfileStatCardProps {
  icon: React.ElementType
  label: string
  value: number
}

function ProfileStatCard({ icon: Icon, label, value }: ProfileStatCardProps) {
  return (
    <div className="glass-subtle rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-primary/90">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
    </div>
  )
}

interface ProfileInfoRowProps {
  icon: React.ElementType
  label: string
  value: string
  mono?: boolean
}

function ProfileInfoRow({ icon: Icon, label, value, mono = false }: ProfileInfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-xl bg-primary/10">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-sm text-foreground break-all", mono && "font-mono text-xs")}>{value}</p>
      </div>
    </div>
  )
}