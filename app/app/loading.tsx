import { ListSkeleton } from "@/components/app/list-skeleton";

export default function Loading() {
  return (
    <div>
      <div className="skeleton mb-6 h-10 w-64" />
      <ListSkeleton />
    </div>
  );
}
