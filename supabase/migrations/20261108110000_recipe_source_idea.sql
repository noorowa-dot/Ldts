-- Dishes planned from a name ("chicken tacos") are not fridge contents: give them their own source.
alter table public.recipes drop constraint if exists recipes_source_check;
alter table public.recipes add constraint recipes_source_check check (source in ('photo', 'example', 'list', 'remix', 'idea'));
