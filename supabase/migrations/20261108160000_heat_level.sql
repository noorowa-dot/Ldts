-- Spice level: per recipe (what it was cooked at) and the person's default for new recipes.
alter table public.recipes add column if not exists heat text check (heat is null or heat in ('mild', 'medium', 'hot', 'extra'));
alter table public.profiles add column if not exists heat text check (heat is null or heat in ('mild', 'medium', 'hot', 'extra'));
grant update (heat) on public.profiles to authenticated;
