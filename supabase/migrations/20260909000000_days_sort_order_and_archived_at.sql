-- Add sort_order for tab reordering and archived_at for later safe-removal.
-- Owner column is user_id; existing display order lives in position, so backfill
-- from position then created_at to keep current tabs in the same order.

alter table public.days add column if not exists sort_order integer;
alter table public.days add column if not exists archived_at timestamptz;

with ordered as (
  select id, row_number() over (partition by user_id order by position, created_at) - 1 as rn
  from public.days
)
update public.days d
set sort_order = ordered.rn
from ordered
where d.id = ordered.id and d.sort_order is null;

create index if not exists days_user_id_sort_order_idx
  on public.days (user_id, sort_order);
