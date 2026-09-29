-- The stock ledger: receipts, lots, cases, a row for every pack, and the movements that change them
-- (.claude/inventory-stock/Stock_Receiving.html, Inventory.html, instructions.txt).
--
-- 1. Enums: stock_movement_kind, write_off_reason, stock_lot_source.
-- 2. stock_receipts, stock_lots, stock_cases, stock_packs, stock_movements.
-- 3. Read views: stock_lot_lines (a lot with its balance) and stock_pick_queue (the pick order).
-- 4. The balance guard on products: qty_on_hand and cost_price belong to the ledger.
-- 5. Writers: save_receipt, add_inventory_stock, draw_stock, record_stock_movement, void_receipt.
-- 6. Policies: read-only for the client. Every write goes through a function in §5.
-- 7. Stock on hand from before this file becomes Inventory-added stock.
--
-- Quantities are base units throughout (tablets, pieces). Every physical pack is a row holding its own
-- remaining count, so loose units sold from two packs in two cases are two rows each draining — the
-- question instructions.txt asks. A lot is one receipt line (or one Inventory add): its lot number,
-- expiry, cost and the tiers it arrived in. What a lot has left is the sum of its packs, never stored.
--
-- ponytail: one row per pack. Receiving 1,000 packs writes 1,000 rows and issues 1,000 codes in a loop;
-- fine for a shop. A merchant receiving tens of thousands of packs a month wants sealed packs kept as a
-- count per lot, with rows made only as each is opened.

-- 1. Enums.
do $$
begin
  if to_regtype('public.stock_movement_kind') is null then
    create type public.stock_movement_kind as enum (
      'receive', 'sale', 'consume', 'adjust', 'write_off', 'return_supplier', 'void'
    );
  end if;
  if to_regtype('public.write_off_reason') is null then
    create type public.write_off_reason as enum ('expired', 'damaged', 'lost', 'other');
  end if;
  -- Where a lot came from: a Stock receipt, or the Inventory screen with no supplier behind it.
  if to_regtype('public.stock_lot_source') is null then
    create type public.stock_lot_source as enum ('stock', 'inventory');
  end if;
end
$$;


-- 2. Tables. Every key is composite with merchant_id, so a lot, case, pack or movement can only ever
-- point at rows of its own merchant. Keys are NO ACTION: receipts are voided, never deleted, and a
-- supplier or item with receipts refuses deletion (23503), which the screens turn into copy.

create table if not exists public.stock_receipts (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  code text not null,
  supplier_id uuid not null,
  invoice_no text,
  received_on date not null default current_date,
  -- Free text: the person at the door is not always a staff account. The signed-in account is on every
  -- movement instead.
  received_by text,
  location text,
  freight numeric(12, 2) not null default 0,
  notes text,
  voided_at timestamptz,
  void_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),

  constraint stock_receipts_id_merchant unique (id, merchant_id),
  constraint stock_receipts_code_unique unique (merchant_id, code),
  constraint stock_receipts_supplier_fk foreign key (supplier_id, merchant_id)
    references public.suppliers (id, merchant_id),
  constraint stock_receipts_freight_non_negative check (freight >= 0),
  constraint stock_receipts_text_length check (
    (invoice_no is null or length(invoice_no) <= 64)
    and (received_by is null or length(received_by) <= 80)
    and (location is null or length(location) <= 120)
    and (notes is null or length(notes) <= 2000)
    and (void_reason is null or length(void_reason) <= 500)
  )
);

alter table public.stock_receipts enable row level security;
create index if not exists stock_receipts_supplier_id_idx on public.stock_receipts (supplier_id);

-- A receipt line, or one Inventory add. receipt_id is null exactly when source is 'inventory'.
create table if not exists public.stock_lots (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  source public.stock_lot_source not null,
  receipt_id uuid,
  position smallint not null default 0,
  product_id uuid not null,
  code text not null,
  -- The item's base units per pack on the day, so the lot still reads right after it changes.
  units_per_pack numeric(14, 4) not null,

  -- The tiers it arrived in (Stock_Receiving.html steps 2-4). Unit Load and Pallet are the record of
  -- how it came; Case also makes case rows.
  unit_loads integer,
  pallets_per_unit_load integer,
  unit_load_sscc text,
  pallets integer,
  cases_per_pallet integer,
  pallet_sscc text,
  cases integer,
  packs_per_case integer,
  cost_per_case numeric(14, 4),
  case_sscc text,

  packs_received integer not null default 0,
  -- One partial pack's worth, received loose.
  loose_units numeric(12, 3) not null default 0,
  qty_received numeric(12, 3) generated always as (packs_received * units_per_pack + loose_units) stored,

  cost_per_pack numeric(14, 4) not null default 0,
  line_cost numeric(12, 2) generated always as (
    round(cost_per_pack * (packs_received + loose_units / units_per_pack), 2)
  ) stored,
  -- This lot's share of the receipt's freight, and the landed cost per base unit that follows.
  freight_share numeric(12, 2) not null default 0,
  unit_cost numeric(14, 6) not null default 0,

  expires_on date,
  location text,
  notes text,
  created_at timestamptz not null default now(),

  constraint stock_lots_id_merchant unique (id, merchant_id),
  -- Lot numbers are never reused, typed or generated.
  constraint stock_lots_code_unique unique (merchant_id, code),
  constraint stock_lots_receipt_fk foreign key (receipt_id, merchant_id)
    references public.stock_receipts (id, merchant_id),
  constraint stock_lots_product_fk foreign key (product_id, merchant_id)
    references public.products (id, merchant_id),
  constraint stock_lots_source_receipt check ((source = 'stock') = (receipt_id is not null)),
  constraint stock_lots_code_length check (length(btrim(code)) between 1 and 64),
  constraint stock_lots_units_per_pack_positive check (units_per_pack > 0),
  constraint stock_lots_tiers_positive check (
    coalesce(unit_loads, 1) > 0 and coalesce(pallets_per_unit_load, 1) > 0
    and coalesce(pallets, 1) > 0 and coalesce(cases_per_pallet, 1) > 0
    and coalesce(cases, 1) > 0 and coalesce(packs_per_case, 1) > 0
  ),
  constraint stock_lots_case_tier check ((cases is null) = (packs_per_case is null)),
  constraint stock_lots_quantities check (
    packs_received >= 0 and loose_units >= 0 and loose_units < units_per_pack
    and packs_received * units_per_pack + loose_units > 0
  ),
  constraint stock_lots_costs_non_negative check (
    cost_per_pack >= 0 and coalesce(cost_per_case, 0) >= 0 and freight_share >= 0 and unit_cost >= 0
  ),
  constraint stock_lots_text_length check (
    (unit_load_sscc is null or length(unit_load_sscc) <= 64)
    and (pallet_sscc is null or length(pallet_sscc) <= 64)
    and (case_sscc is null or length(case_sscc) <= 64)
    and (location is null or length(location) <= 120)
    and (notes is null or length(notes) <= 2000)
  )
);

alter table public.stock_lots enable row level security;
create index if not exists stock_lots_receipt_id_idx on public.stock_lots (receipt_id);
create index if not exists stock_lots_product_id_idx on public.stock_lots (product_id, expires_on);

create table if not exists public.stock_cases (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  lot_id uuid not null,
  code text not null,
  sscc text,
  created_at timestamptz not null default now(),

  constraint stock_cases_id_merchant unique (id, merchant_id),
  constraint stock_cases_code_unique unique (merchant_id, code),
  constraint stock_cases_lot_fk foreign key (lot_id, merchant_id)
    references public.stock_lots (id, merchant_id),
  constraint stock_cases_sscc_length check (sscc is null or length(sscc) <= 64)
);

alter table public.stock_cases enable row level security;
create index if not exists stock_cases_lot_id_idx on public.stock_cases (lot_id);

-- A physical pack. Sealed while qty_remaining = units, open below it, empty at zero — derived, never
-- stored. product_id repeats the lot's so the pick order reads one table.
create table if not exists public.stock_packs (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  product_id uuid not null,
  lot_id uuid not null,
  case_id uuid,
  code text not null,
  -- The manufacturer's serial, when the pack carries one.
  serial text,
  units numeric(14, 4) not null,
  qty_remaining numeric(12, 3) not null,
  opened_at timestamptz,
  created_at timestamptz not null default now(),

  constraint stock_packs_id_merchant unique (id, merchant_id),
  constraint stock_packs_code_unique unique (merchant_id, code),
  -- A serial is unique for good, like a lot number. Nulls do not collide.
  constraint stock_packs_serial_unique unique (merchant_id, serial),
  constraint stock_packs_product_fk foreign key (product_id, merchant_id)
    references public.products (id, merchant_id),
  constraint stock_packs_lot_fk foreign key (lot_id, merchant_id)
    references public.stock_lots (id, merchant_id),
  constraint stock_packs_case_fk foreign key (case_id, merchant_id)
    references public.stock_cases (id, merchant_id),
  constraint stock_packs_serial_length check (serial is null or length(btrim(serial)) between 1 and 64),
  constraint stock_packs_remaining check (units > 0 and qty_remaining >= 0 and qty_remaining <= units)
);

alter table public.stock_packs enable row level security;
create index if not exists stock_packs_lot_id_idx on public.stock_packs (lot_id);
create index if not exists stock_packs_case_id_idx on public.stock_packs (case_id);
create index if not exists stock_packs_live_idx on public.stock_packs (product_id) where qty_remaining > 0;

-- The ledger. Append-only: nothing updates or deletes a movement. Each touches exactly one pack.
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  product_id uuid not null,
  lot_id uuid not null,
  pack_id uuid not null,
  kind public.stock_movement_kind not null,
  -- Signed, in base units.
  qty numeric(12, 3) not null,
  reason public.write_off_reason,
  note text,
  -- The document behind the movement: the receipt or lot code today, the sale later.
  ref text,
  -- The signed-in staff account. Null only on §7's backfill.
  created_by uuid,
  created_at timestamptz not null default now(),

  constraint stock_movements_product_fk foreign key (product_id, merchant_id)
    references public.products (id, merchant_id),
  constraint stock_movements_lot_fk foreign key (lot_id, merchant_id)
    references public.stock_lots (id, merchant_id),
  constraint stock_movements_pack_fk foreign key (pack_id, merchant_id)
    references public.stock_packs (id, merchant_id),
  constraint stock_movements_qty_non_zero check (qty <> 0),
  constraint stock_movements_note_length check (note is null or length(note) <= 500),
  constraint stock_movements_ref_length check (ref is null or length(ref) <= 64)
);

alter table public.stock_movements enable row level security;
create index if not exists stock_movements_product_id_idx on public.stock_movements (product_id, created_at desc);
create index if not exists stock_movements_lot_id_idx on public.stock_movements (lot_id);
create index if not exists stock_movements_pack_id_idx on public.stock_movements (pack_id);


-- 3. Read views. security_invoker, so each reads through the caller's RLS on the tables beneath.

-- A lot with what it has left: the Stock screen's rows and the Inventory screen's lot heads.
create or replace view public.stock_lot_lines with (security_invoker = true) as
select
  l.*,
  coalesce(b.qty_remaining, 0) as qty_remaining,
  coalesce(b.packs_total, 0) as packs_total,
  coalesce(b.packs_active, 0) as packs_active,
  coalesce(b.packs_open, 0) as packs_open
from public.stock_lots l
left join (
  select
    p.lot_id,
    sum(p.qty_remaining) as qty_remaining,
    count(*)::integer as packs_total,
    count(*) filter (where p.qty_remaining > 0)::integer as packs_active,
    count(*) filter (where p.qty_remaining > 0 and p.qty_remaining < p.units)::integer as packs_open
  from public.stock_packs p
  group by p.lot_id
) b on b.lot_id = l.id;

-- Every pack that can be drawn, ranked in the one pick order the app has:
--   1. open before sealed — finish what is already open
--   2. closest expiry first (FEFO); no expiry goes last
--   3. fewest units left
--   4. oldest lot first (FIFO)
--   5. pack code
-- An expired pack is never picked; it waits for a write-off. pick_rank orders loose-unit draws;
-- whole_rank orders sealed packs only, for a sale by the pack.
create or replace view public.stock_pick_queue with (security_invoker = true) as
select
  p.id as pack_id,
  p.merchant_id,
  p.product_id,
  p.lot_id,
  p.case_id,
  p.code,
  p.units,
  p.qty_remaining,
  l.expires_on,
  row_number() over (
    partition by p.product_id
    order by (p.qty_remaining < p.units) desc, l.expires_on asc nulls last, p.qty_remaining asc,
      l.created_at asc, p.code asc
  )::integer as pick_rank,
  case when p.qty_remaining = p.units then row_number() over (
    partition by p.product_id, p.qty_remaining = p.units
    order by l.expires_on asc nulls last, l.created_at asc, p.code asc
  )::integer end as whole_rank
from public.stock_packs p
join public.stock_lots l on l.id = p.lot_id
where p.qty_remaining > 0 and (l.expires_on is null or l.expires_on >= current_date);

revoke all on public.stock_lot_lines, public.stock_pick_queue from public, anon;
grant select on public.stock_lot_lines, public.stock_pick_queue to authenticated;


-- 4. The balance guard.
--
-- qty_on_hand is the sum of an item's packs and cost_price the weighted landed cost per base unit.
-- Only the functions in §5 write them, running as the owner. A client role writing either on a stock
-- item keeps the ledger's numbers instead of failing, so a stale edit screen still saves everything
-- else. Units per pack and archiving are refused while anything is on hand: the packs already counted
-- would stop meaning what they say.
create or replace function private.guard_stock_item()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.type <> 'stock' then
    return new;
  end if;

  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.qty_on_hand := 0;
      new.cost_price := null;
    else
      new.qty_on_hand := old.qty_on_hand;
      new.cost_price := old.cost_price;
    end if;
  end if;

  if tg_op = 'UPDATE' and coalesce(old.qty_on_hand, 0) > 0 then
    if new.status = 'archived' and old.status <> 'archived' then
      raise exception 'stock_on_hand'
        using errcode = '23514', detail = 'An item can be archived only once its stock is gone.';
    end if;
    if new.conversion_factor is distinct from old.conversion_factor then
      raise exception 'stock_item_units_locked'
        using errcode = '23514', detail = 'Units per pack change only while nothing is on hand.';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function private.guard_stock_item() from public, anon, authenticated, service_role;

drop trigger if exists products_guard_stock on public.products;
create trigger products_guard_stock
  before insert or update on public.products
  for each row execute function private.guard_stock_item();


-- 5. Writers.
--
-- Public and security definer, so the ledger tables need no write policy at all. Each carries
-- CLAUDE.md §6.2's three requirements: execute granted to authenticated alone, search_path pinned with
-- every name qualified, and private.assert_member() on the merchant it is about to touch. As owner they
-- bypass RLS, so every query in them names the merchant or reaches rows through one that did.
--
-- Lock order, everywhere: the item's products row first, then its packs. Two writers on one item queue
-- behind the first lock rather than deadlocking further down.

create or replace function private.recompute_stock(p_product uuid)
returns void
language sql
set search_path = ''
as $$
  update public.products p set
    qty_on_hand = s.qty,
    -- An empty item keeps its last cost, so a re-order still shows what it cost last time.
    cost_price = case when s.qty > 0 then round(s.value / s.qty, 2) else p.cost_price end
  from (
    select coalesce(sum(k.qty_remaining), 0) as qty, coalesce(sum(k.qty_remaining * l.unit_cost), 0) as value
    from public.stock_packs k
    join public.stock_lots l on l.id = k.lot_id
    where k.product_id = p_product
  ) s
  where p.id = p_product;
$$;

revoke execute on function private.recompute_stock(uuid) from public, anon, authenticated, service_role;

-- One lot, its cases and a row per pack, and a receive movement per pack. Shared by save_receipt,
-- add_inventory_stock and §7. The caller has locked the item and checked membership.
--
-- p_line: { cases?, packs_per_case?, cost_per_case?, case_sscc?, packs?, cost_per_pack?, loose_units?,
--           unit_loads?, pallets_per_unit_load?, unit_load_sscc?, pallets?, cases_per_pallet?,
--           pallet_sscc?, lot_code?, expires_on?, location?, notes?, serials?: text[] }
create or replace function private.create_lot(
  p_item public.products, p_receipt public.stock_receipts, p_position integer, p_line jsonb
)
returns public.stock_lots
language plpgsql
set search_path = ''
as $$
declare
  v_merchant uuid := p_item.merchant_id;
  v_on date := coalesce(p_receipt.received_on, current_date);
  v_upp numeric := coalesce(p_item.conversion_factor, 1);
  v_cases integer := nullif((p_line ->> 'cases')::integer, 0);
  v_per_case integer;
  v_packs integer;
  v_loose numeric := coalesce((p_line ->> 'loose_units')::numeric, 0);
  v_cost numeric;
  v_serials text[];
  v_lot public.stock_lots;
  v_case_id uuid;
  v_pack public.stock_packs;
  v_n integer := 0;
  i integer;
  j integer;
begin
  -- Case tier: cost is entered per case, and the pack cost follows.
  if v_cases is not null then
    v_per_case := (p_line ->> 'packs_per_case')::integer;
    if coalesce(v_per_case, 0) <= 0 or (p_line ->> 'cost_per_case') is null then
      raise exception 'receipt_line_case_tier' using errcode = '23514';
    end if;
    v_packs := v_cases * v_per_case;
    v_cost := (p_line ->> 'cost_per_case')::numeric / v_per_case;
  else
    v_packs := coalesce((p_line ->> 'packs')::integer, 0);
    v_cost := coalesce((p_line ->> 'cost_per_pack')::numeric, coalesce(p_item.cost_price, 0) * v_upp);
  end if;

  if v_packs < 0 or v_loose < 0 or v_loose >= v_upp or v_packs * v_upp + v_loose <= 0 then
    raise exception 'receipt_line_quantity' using errcode = '23514';
  end if;

  -- Has expiry: a received line needs its date. An Inventory add may leave it blank.
  if p_receipt.id is not null and p_item.perishable and (p_line ->> 'expires_on') is null then
    raise exception 'receipt_line_expiry_required' using errcode = '23514';
  end if;

  select coalesce(array_agg(btrim(s.serial) order by s.ord), '{}') into v_serials
  from jsonb_array_elements_text(coalesce(p_line -> 'serials', '[]')) with ordinality as s (serial, ord)
  where btrim(s.serial) <> '';
  if cardinality(v_serials) > v_packs then
    raise exception 'receipt_line_serial_count'
      using errcode = '23514', detail = 'More serial numbers than packs.';
  end if;

  -- issue_code only runs when no lot number was typed, so a typed one never burns a counter value.
  insert into public.stock_lots (
    merchant_id, source, receipt_id, position, product_id, code, units_per_pack,
    unit_loads, pallets_per_unit_load, unit_load_sscc, pallets, cases_per_pallet, pallet_sscc,
    cases, packs_per_case, cost_per_case, case_sscc,
    packs_received, loose_units, cost_per_pack, expires_on, location, notes
  ) values (
    v_merchant, case when p_receipt.id is null then 'inventory' else 'stock' end::public.stock_lot_source,
    p_receipt.id, p_position, p_item.id,
    coalesce(
      nullif(btrim(p_line ->> 'lot_code'), ''),
      private.issue_code(v_merchant, 'lot', 'LOT-' || to_char(v_on, 'YYYYMMDD') || '-', 3, 'public.stock_lots', 'code')
    ),
    v_upp,
    nullif((p_line ->> 'unit_loads')::integer, 0), nullif((p_line ->> 'pallets_per_unit_load')::integer, 0),
    nullif(btrim(p_line ->> 'unit_load_sscc'), ''),
    nullif((p_line ->> 'pallets')::integer, 0), nullif((p_line ->> 'cases_per_pallet')::integer, 0),
    nullif(btrim(p_line ->> 'pallet_sscc'), ''),
    v_cases, v_per_case, case when v_cases is not null then (p_line ->> 'cost_per_case')::numeric end,
    nullif(btrim(p_line ->> 'case_sscc'), ''),
    v_packs, v_loose, v_cost,
    (p_line ->> 'expires_on')::date,
    coalesce(nullif(btrim(p_line ->> 'location'), ''), p_receipt.location, p_item.storage_location),
    nullif(btrim(p_line ->> 'notes'), '')
  )
  returning * into v_lot;

  -- Packs in cases first, then loose packs, then the partial pack the loose units make.
  for i in 0 .. coalesce(v_cases, 0) loop
    v_case_id := null;
    if i > 0 then
      insert into public.stock_cases (merchant_id, lot_id, code, sscc)
      values (
        v_merchant, v_lot.id,
        private.issue_code(v_merchant, 'case', 'CS-', 4, 'public.stock_cases', 'code'),
        -- The one SSCC typed on the form labels the first case.
        case when i = 1 then v_lot.case_sscc end
      )
      returning id into v_case_id;
    end if;

    for j in 1 .. case when i = 0 then (case when v_cases is null then v_packs else 0 end) else v_per_case end loop
      v_n := v_n + 1;
      insert into public.stock_packs (merchant_id, product_id, lot_id, case_id, code, serial, units, qty_remaining)
      values (
        v_merchant, p_item.id, v_lot.id, v_case_id,
        private.issue_code(v_merchant, 'pack', 'PK-', 6, 'public.stock_packs', 'code'),
        v_serials[v_n], v_upp, v_upp
      )
      returning * into v_pack;

      insert into public.stock_movements (merchant_id, product_id, lot_id, pack_id, kind, qty, ref, created_by)
      values (v_merchant, p_item.id, v_lot.id, v_pack.id, 'receive', v_upp, coalesce(p_receipt.code, v_lot.code),
        (select auth.uid()));
    end loop;
  end loop;

  if v_loose > 0 then
    insert into public.stock_packs (merchant_id, product_id, lot_id, code, units, qty_remaining, opened_at)
    values (
      v_merchant, p_item.id, v_lot.id,
      private.issue_code(v_merchant, 'pack', 'PK-', 6, 'public.stock_packs', 'code'),
      v_upp, v_loose, now()
    )
    returning * into v_pack;

    insert into public.stock_movements (merchant_id, product_id, lot_id, pack_id, kind, qty, ref, created_by)
    values (v_merchant, p_item.id, v_lot.id, v_pack.id, 'receive', v_loose, coalesce(p_receipt.code, v_lot.code),
      (select auth.uid()));
  end if;

  -- No freight yet; save_receipt spreads it once every line is in.
  update public.stock_lots set unit_cost = line_cost / qty_received where id = v_lot.id
  returning * into v_lot;
  return v_lot;
end;
$$;

revoke execute on function private.create_lot(public.products, public.stock_receipts, integer, jsonb)
  from public, anon, authenticated, service_role;


-- save_receipt(payload): {
--   merchant_id, supplier_id, invoice_no?, received_on?, received_by?, location?, freight?, notes?,
--   lines: [{ product_id | new_item: { item, group_name? }, ...private.create_lot's p_line }]
-- }
-- Returns the receipt id. A saved receipt never changes; void_receipt and record_stock_movement make
-- the corrections.
create or replace function public.save_receipt(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.stock_receipts;
  v_merchant uuid := (payload ->> 'merchant_id')::uuid;
  v_supplier uuid := (payload ->> 'supplier_id')::uuid;
  v_freight numeric := coalesce((payload ->> 'freight')::numeric, 0);
  v_line jsonb;
  v_pos integer := 0;
  v_item public.products;
  v_item_id uuid;
  v_lot public.stock_lots;
  v_value_total numeric;
  v_qty_total numeric;
  v_left numeric;
  v_share numeric;
begin
  perform private.assert_member(v_merchant);

  if v_supplier is null or not exists (
    select 1 from public.suppliers s where s.id = v_supplier and s.merchant_id = v_merchant and s.active
  ) then
    raise exception 'supplier_not_available' using errcode = '23514';
  end if;
  if jsonb_array_length(coalesce(payload -> 'lines', '[]')) = 0 then
    raise exception 'receipt_has_no_lines' using errcode = '23514';
  end if;

  insert into public.stock_receipts (
    merchant_id, code, supplier_id, invoice_no, received_on, received_by, location, freight, notes, created_by
  ) values (
    v_merchant,
    private.issue_code(v_merchant, 'receipt', 'RC-', 4, 'public.stock_receipts', 'code'),
    v_supplier,
    nullif(btrim(payload ->> 'invoice_no'), ''),
    coalesce((payload ->> 'received_on')::date, current_date),
    nullif(btrim(payload ->> 'received_by'), ''),
    nullif(btrim(payload ->> 'location'), ''),
    v_freight,
    nullif(btrim(payload ->> 'notes'), ''),
    (select auth.uid())
  )
  returning * into r;

  for v_line in select e.value from jsonb_array_elements(payload -> 'lines') as e (value) loop
    v_pos := v_pos + 1;

    -- A new item is made inside the transaction, so an abandoned receipt leaves no orphan item.
    if v_line ? 'new_item' then
      v_item_id := public.save_stock_item(jsonb_build_object(
        'item', (v_line -> 'new_item' -> 'item') || jsonb_build_object('id', null, 'merchant_id', v_merchant),
        'group_name', v_line -> 'new_item' -> 'group_name'
      ));
    else
      v_item_id := (v_line ->> 'product_id')::uuid;
    end if;

    select * into v_item from public.products
    where id = v_item_id and merchant_id = v_merchant and type = 'stock' and status <> 'archived'
    for update;
    if v_item.id is null then
      raise exception 'stock_item_not_found' using errcode = 'P0002';
    end if;

    perform private.create_lot(v_item, r, v_pos, v_line);
  end loop;

  -- Freight: spread by line value, or by quantity when every line cost nothing. The last line takes
  -- what rounding leaves, so the shares add up to the freight exactly.
  select coalesce(sum(l.line_cost), 0), coalesce(sum(l.qty_received), 0) into v_value_total, v_qty_total
  from public.stock_lots l where l.receipt_id = r.id;
  v_left := v_freight;

  for v_lot in select * from public.stock_lots l where l.receipt_id = r.id order by l.position loop
    v_share := case
      when v_lot.position = v_pos then v_left
      when v_value_total > 0 then round(v_freight * v_lot.line_cost / v_value_total, 2)
      else round(v_freight * v_lot.qty_received / v_qty_total, 2)
    end;
    v_left := v_left - v_share;

    update public.stock_lots
    set freight_share = v_share, unit_cost = (v_lot.line_cost + v_share) / v_lot.qty_received
    where id = v_lot.id;
  end loop;

  perform private.recompute_stock(l.product_id)
  from (select distinct product_id from public.stock_lots where receipt_id = r.id) l;

  return r.id;
end;
$$;

revoke execute on function public.save_receipt(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.save_receipt(jsonb) to authenticated;


-- add_inventory_stock(payload): { product_id, packs?, loose_units?, cost_per_pack?, expires_on?,
--                                 location?, notes? }
-- Stock added on the Inventory screen: a lot with no receipt and no supplier, drawn like any other.
-- Never listed on the Stock screen, which shows receipts. Returns the lot id.
create or replace function public.add_inventory_stock(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.products;
  v_lot public.stock_lots;
begin
  select * into v_item from public.products where id = (payload ->> 'product_id')::uuid and type = 'stock';
  if v_item.id is null then
    raise exception 'stock_item_not_found' using errcode = 'P0002';
  end if;
  perform private.assert_member(v_item.merchant_id);

  select * into v_item from public.products where id = v_item.id for update;
  if v_item.status = 'archived' then
    raise exception 'stock_item_not_found' using errcode = 'P0002';
  end if;

  v_lot := private.create_lot(v_item, null, 0, payload - 'cases' - 'serials' - 'lot_code');
  perform private.recompute_stock(v_item.id);
  return v_lot.id;
end;
$$;

revoke execute on function public.add_inventory_stock(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.add_inventory_stock(jsonb) to authenticated;


-- draw_stock(payload): { product_id, qty, mode: 'base' | 'pack', kind: 'sale' | 'consume', ref? }
--
-- Takes stock out in the pick order (§3). 'base' drains qty base units, finishing open packs, opening
-- sealed ones and spilling across packs and cases as it goes. 'pack' takes qty whole sealed packs.
-- One movement per pack touched. Short stock raises insufficient_stock and draws nothing. Returns
-- [{ pack_id, code, qty }] for the caller's record. The Register (a sale) and recipes (consume) call it.
create or replace function public.draw_stock(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.products;
  v_qty numeric := (payload ->> 'qty')::numeric;
  v_mode text := coalesce(payload ->> 'mode', 'base');
  v_kind public.stock_movement_kind := coalesce(payload ->> 'kind', 'sale')::public.stock_movement_kind;
  v_ref text := nullif(btrim(payload ->> 'ref'), '');
  v_left numeric;
  v_take numeric;
  q record;
  v_out jsonb := '[]';
begin
  if v_kind not in ('sale', 'consume') or v_mode not in ('base', 'pack')
     or v_qty is null or v_qty <= 0 or (v_mode = 'pack' and v_qty <> trunc(v_qty)) then
    raise exception 'draw_invalid' using errcode = '22023';
  end if;

  select * into v_item from public.products where id = (payload ->> 'product_id')::uuid and type = 'stock';
  if v_item.id is null then
    raise exception 'stock_item_not_found' using errcode = 'P0002';
  end if;
  perform private.assert_member(v_item.merchant_id);
  -- The item lock serializes draws on it, so the queue read below cannot change underneath.
  perform 1 from public.products where id = v_item.id for update;

  v_left := v_qty;
  for q in
    select k.pack_id, k.code, k.lot_id, k.qty_remaining
    from public.stock_pick_queue k
    where k.product_id = v_item.id and (v_mode = 'base' or k.whole_rank is not null)
    order by case when v_mode = 'base' then k.pick_rank else k.whole_rank end
  loop
    exit when v_left <= 0;
    v_take := case when v_mode = 'base' then least(v_left, q.qty_remaining) else q.qty_remaining end;

    update public.stock_packs
    set qty_remaining = qty_remaining - v_take, opened_at = coalesce(opened_at, now())
    where id = q.pack_id;

    insert into public.stock_movements (merchant_id, product_id, lot_id, pack_id, kind, qty, ref, created_by)
    values (v_item.merchant_id, v_item.id, q.lot_id, q.pack_id, v_kind, -v_take, v_ref, (select auth.uid()));

    v_out := v_out || jsonb_build_object('pack_id', q.pack_id, 'code', q.code, 'qty', v_take);
    v_left := v_left - case when v_mode = 'base' then v_take else 1 end;
  end loop;

  if v_left > 0 then
    raise exception 'insufficient_stock' using errcode = '23514';
  end if;

  perform private.recompute_stock(v_item.id);
  return v_out;
end;
$$;

revoke execute on function public.draw_stock(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.draw_stock(jsonb) to authenticated;


-- record_stock_movement(payload): { kind, pack_id, qty, reason?, note? }
--
-- A pack's row actions: adjust (signed qty, note required), write_off (amount removed, reason required,
-- and a note when the reason is Other), return_supplier (amount removed; only stock that came on a
-- receipt, which names the supplier).
create or replace function public.record_stock_movement(payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind public.stock_movement_kind := (payload ->> 'kind')::public.stock_movement_kind;
  v_qty numeric := (payload ->> 'qty')::numeric;
  v_reason public.write_off_reason := (payload ->> 'reason')::public.write_off_reason;
  v_note text := nullif(btrim(payload ->> 'note'), '');
  v_pack public.stock_packs;
  v_lot public.stock_lots;
begin
  if v_kind not in ('adjust', 'write_off', 'return_supplier') then
    raise exception 'stock_movement_kind_invalid' using errcode = '22023';
  end if;
  if v_qty is null or v_qty = 0 or (v_kind <> 'adjust' and v_qty < 0) then
    raise exception 'stock_movement_qty_invalid' using errcode = '22023';
  end if;
  if v_kind = 'adjust' and v_note is null then
    raise exception 'stock_movement_note_required' using errcode = '23514';
  end if;
  if v_kind = 'write_off' and (v_reason is null or (v_reason = 'other' and v_note is null)) then
    raise exception 'write_off_reason_required' using errcode = '23514';
  end if;

  -- Write-offs and returns take the amount removed; the ledger stores it negative.
  if v_kind <> 'adjust' then
    v_qty := -v_qty;
  end if;
  if v_kind <> 'write_off' then
    v_reason := null;
  end if;

  select * into v_pack from public.stock_packs where id = (payload ->> 'pack_id')::uuid;
  if v_pack.id is null then
    raise exception 'stock_target_not_found' using errcode = 'P0002';
  end if;
  perform private.assert_member(v_pack.merchant_id);

  perform 1 from public.products where id = v_pack.product_id for update;
  select * into v_pack from public.stock_packs where id = v_pack.id for update;
  select * into v_lot from public.stock_lots where id = v_pack.lot_id;

  if exists (select 1 from public.stock_receipts sr where sr.id = v_lot.receipt_id and sr.voided_at is not null) then
    raise exception 'receipt_voided' using errcode = '23514';
  end if;
  if v_kind = 'return_supplier' and v_lot.source <> 'stock' then
    raise exception 'receipt_has_no_supplier' using errcode = '23514';
  end if;
  if v_pack.qty_remaining + v_qty < 0 then
    raise exception 'insufficient_stock' using errcode = '23514';
  end if;
  if v_pack.qty_remaining + v_qty > v_pack.units then
    raise exception 'pack_over_capacity' using errcode = '23514';
  end if;

  update public.stock_packs
  set qty_remaining = qty_remaining + v_qty,
      opened_at = case when qty_remaining + v_qty < units then coalesce(opened_at, now()) else opened_at end
  where id = v_pack.id;

  insert into public.stock_movements (merchant_id, product_id, lot_id, pack_id, kind, qty, reason, note, ref, created_by)
  values (
    v_pack.merchant_id, v_pack.product_id, v_lot.id, v_pack.id, v_kind, v_qty, v_reason, v_note,
    coalesce((select sr.code from public.stock_receipts sr where sr.id = v_lot.receipt_id), v_lot.code),
    (select auth.uid())
  );

  perform private.recompute_stock(v_pack.product_id);
end;
$$;

revoke execute on function public.record_stock_movement(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.record_stock_movement(jsonb) to authenticated;


-- void_receipt: takes every pack of a receipt back to zero with a void movement each. Allowed only while
-- nothing but the receipt itself has touched its stock; after that, corrections are adjustments, which
-- keep the history.
create or replace function public.void_receipt(p_receipt uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.stock_receipts;
begin
  select * into r from public.stock_receipts where id = p_receipt;
  if r.id is null then
    raise exception 'receipt_not_found' using errcode = 'P0002';
  end if;
  perform private.assert_member(r.merchant_id);

  perform 1 from public.products
  where id in (select l.product_id from public.stock_lots l where l.receipt_id = r.id)
  order by id
  for update;

  select * into r from public.stock_receipts where id = p_receipt for update;
  if r.voided_at is not null then
    raise exception 'receipt_voided' using errcode = '23514';
  end if;

  if exists (
    select 1 from public.stock_movements m
    join public.stock_lots l on l.id = m.lot_id
    where l.receipt_id = r.id and m.kind <> 'receive'
  ) then
    raise exception 'receipt_in_use'
      using errcode = '23514', detail = 'Stock from this receipt has already moved.';
  end if;

  insert into public.stock_movements (merchant_id, product_id, lot_id, pack_id, kind, qty, note, ref, created_by)
  select k.merchant_id, k.product_id, k.lot_id, k.id, 'void', -k.qty_remaining, nullif(btrim(p_reason), ''),
    r.code, (select auth.uid())
  from public.stock_packs k
  join public.stock_lots l on l.id = k.lot_id
  where l.receipt_id = r.id and k.qty_remaining > 0;

  update public.stock_packs set qty_remaining = 0
  where lot_id in (select l.id from public.stock_lots l where l.receipt_id = r.id);

  update public.stock_receipts set voided_at = now(), void_reason = nullif(btrim(p_reason), '')
  where id = r.id;

  perform private.recompute_stock(l.product_id)
  from (select distinct product_id from public.stock_lots where receipt_id = r.id) l;
end;
$$;

revoke execute on function public.void_receipt(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.void_receipt(uuid, text) to authenticated;


-- 6. Policies: select only, and §5 is the only way in.
do $$
declare
  t text;
begin
  foreach t in array array['stock_receipts', 'stock_lots', 'stock_cases', 'stock_packs', 'stock_movements'] loop
    execute format('drop policy if exists %I on public.%I', t || '_select_own_merchant', t);
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (merchant_id in (select private.current_merchant_ids()))',
      t || '_select_own_merchant', t
    );
  end loop;
end
$$;


-- 7. Stock on hand from before this file.
--
-- Reverting the older ledger left each item's qty_on_hand as a plain number. Every stock item holding
-- some and no lot gets it back as Inventory-added stock, costed at its current cost_price, so nothing
-- disappears and every unit is on a pack from here on. An item left negative or null is set to zero.
-- Re-runnable: an item that already has a lot is skipped.
do $$
declare
  p public.products;
  v_upp numeric;
  v_packs integer;
begin
  for p in
    select * from public.products pr
    where pr.type = 'stock' and pr.qty_on_hand > 0
      and not exists (select 1 from public.stock_lots l where l.product_id = pr.id)
    order by pr.merchant_id, pr.created_at, pr.id
  loop
    v_upp := coalesce(p.conversion_factor, 1);
    v_packs := floor(p.qty_on_hand / v_upp);
    perform private.create_lot(p, null, 0, jsonb_build_object(
      'packs', v_packs,
      'loose_units', p.qty_on_hand - v_packs * v_upp,
      'cost_per_pack', coalesce(p.cost_price, 0) * v_upp,
      'expires_on', p.expiry_date,
      'notes', 'Stock on hand before the ledger'
    ));
  end loop;

  perform private.recompute_stock(pr.id) from public.products pr where pr.type = 'stock';
end
$$;
