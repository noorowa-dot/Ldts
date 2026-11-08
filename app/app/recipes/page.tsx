import { Suspense } from "react";
import { listRecipes } from "@/lib/lists";
import { RecipeList, ListError } from "@/components/app/recipe-list";
import { ListSkeleton } from "@/components/app/list-skeleton";
import { PageTitle } from "@/components/app/app-shell";
import { RecipeTabs } from "@/components/app/recipe-tabs";

async function Items() {
  const items = await listRecipes().catch(() => null);
  if (!items) return <ListError />;
  return <RecipeList items={items} mode="all" />;
}

export default function Page() {
  return (
    <div>
      <PageTitle title="Your recipes" sub="Every dish Platepal made from your fridge." />
      <RecipeTabs active="recipes" />
      <Suspense fallback={<ListSkeleton />}>
        <Items />
      </Suspense>
    </div>
  );
}
