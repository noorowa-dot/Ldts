export function ListSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="recipe-card flex items-center gap-3 p-3">
          <div className="skeleton h-20 w-20 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-5 w-3/4" />
            <div className="skeleton h-3.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
