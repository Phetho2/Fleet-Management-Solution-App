export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />
}

/** Placeholder mirroring the dashboard layout while data loads. */
export function DashboardSkeleton() {
  return (
    <div className="p-4 space-y-3 max-w-lg mx-auto">
      <Skeleton className="h-[104px] rounded-[14px]" />
      <Skeleton className="h-[52px] rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-[104px] rounded-[13px]" />
        <Skeleton className="h-[104px] rounded-[13px]" />
        <Skeleton className="h-[104px] rounded-[13px]" />
        <Skeleton className="h-[104px] rounded-[13px]" />
      </div>
      <Skeleton className="h-[72px] rounded-[13px]" />
      <Skeleton className="h-[72px] rounded-[13px]" />
    </div>
  )
}
