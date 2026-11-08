import { Suspense } from "react";
import { listRecipes } from "@/lib/lists";
import { RecipeList, ListError } from "@/components/app/recipe-list";
import { ListSkeleton } from "@/components/app/list-skeleton";
import { PageTitle } from "@/components/app/app-shell";

async function Items() {
  const items = await listRecipes({ favorites: true }).catch(() => null);
  if (!items) return <ListError />;
  return <RecipeList items={items} mode="saved" />;
}

export default function Page() {
  return (
    <div>
      <PageTitle title="Saved" sub="The dishes you loved. Cook them again next week." />
      <Suspense fallback={<ListSkeleton />}>
        <Items />
      </Suspense>
    </div>
  );
}
