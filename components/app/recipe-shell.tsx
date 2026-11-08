import { requireMe } from "@/lib/me";
import { MeProvider } from "./me-context";
import { AppShell } from "./app-shell";
import { RecipeDetail } from "./recipe-detail";
import type { RecipeView } from "@/lib/types";

/** /r/[id] for a paying user: the full recipe inside the app shell. */
export async function RecipeShell({ recipe }: { recipe: RecipeView }) {
  const me = await requireMe(`/r/${recipe.id}`);
  return (
    <MeProvider me={me}>
      <AppShell>
        <RecipeDetail initial={recipe} />
      </AppShell>
    </MeProvider>
  );
}
