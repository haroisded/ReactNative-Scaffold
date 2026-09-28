-- Receipts and the stock ledger (.claude/inventory-stock/design.md §1, §3 and §7).
--
-- 1. Enums: stock_movement_kind, write_off_reason.
-- 2. stock_receipts, stock_lots, stock_cases, stock_packs, stock_movements.
-- 3. The balance guard on products: qty_on_hand and cost_price belong to the ledger.
-- 4. The writers: save_receipt, void_receipt, record_stock_movement, and the recompute they share.
-- 5. Policies: read-only for the client. Every write goes through a function in §4.
-- 6. The opening-stock backfill.
--
-- A receipt line and its lot are one row (stock_lots). design.md §1 fixes them one to one, so a
-- separate lines table would be a join with nothing on its far side.
--
-- Quantities are base units throughout. A lot records units_per_pack as it was on the day of receipt,
-- so its pack count still reads right after the item's conversion factor changes.

-- 1. Enums. sale, consume and open arrive with the register (Phase 2); nothing writes them yet.
do $$
begin
  if to_regtype('public.stock_movement_kind') is null then
    create type public.stock_movement_kind as enum (
      'receive', 'sale', 'consume', 'open', 'adjust', 'write_off', 'return_supplier', 'void'
    );
  end if;
  if to_regtype('public.write_off_reason') is null then
    create type public.write_off_reason as enum ('expired', 'damaged', 'lost', 'other');
  end if;
end
$$;


-- 2. Tables. Every key is composite with merchant_id, so a lot, case, pack or movement can only ever
-- point at rows of its own merchant. Keys are NO ACTION: receipts are voided, never deleted, and a
-- supplier or item with receipts refuses deletion (23503), which the client turns into "deactivate" or
-- "archive" copy.

create table if not exists public.stock_receipts (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  code text not null,
  -- Null is "no supplier / opening stock".
  supplier_id uuid,
  invoice_no text,
  received_on date not null default current_date,
  -- Free text: whoever unloaded the delivery. The staff account is on every movement instead.
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

-- A receipt line, and the balance it leaves on the shelf.
create table if not exists public.stock_lots (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  receipt_id uuid not null,
  position smallint not null default 0,
  product_id uuid not null,
  code text not null,
  units_per_pack numeric(14, 4) not null,

  -- The Case tier, when used. Unit Load and Pallet are calculators on the form and are not stored.
  cases integer,
  packs_per_case integer,
  cost_per_case numeric(14, 4),
  sscc text,

  packs_received integer not null,
  -- Loose base units beyond the whole packs: one partial pack.
  loose_units numeric(12, 3) not null default 0,
  qty_received numeric(12, 3) generated always as (packs_received * units_per_pack + loose_units) stored,
  qty_remaining numeric(12, 3) not null,

  cost_per_pack numeric(14, 4) not null,
  line_cost numeric(12, 2) generated always as (
    packs_received * cost_per_pack + loose_units * cost_per_pack / units_per_pack
  ) stored,
  freight_share numeric(12, 2) not null default 0,
  -- Landed cost of one base unit, fixed when the receipt is saved.
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
  constraint stock_lots_code_length check (length(btrim(code)) between 1 and 64),
  constraint stock_lots_units_per_pack_positive check (units_per_pack > 0),
  constraint stock_lots_case_tier check (
    (cases is null) = (packs_per_case is null) and coalesce(cases, 1) > 0 and coalesce(packs_per_case, 1) > 0
  ),
  constraint stock_lots_quantities check (
    packs_received >= 0 and loose_units >= 0 and loose_units < units_per_pack
    and packs_received * units_per_pack + loose_units > 0
  ),
  constraint stock_lots_remaining_non_negative check (qty_remaining >= 0),
  constraint stock_lots_costs_non_negative check (
    cost_per_pack >= 0 and coalesce(cost_per_case, 0) >= 0 and freight_share >= 0 and unit_cost >= 0
  ),
  constraint stock_lots_text_length check (
    (sscc is null or length(sscc) <= 64)
    and (location is null or length(location) <= 120)
    and (notes is null or length(notes) <= 2000)
  )
);

alter table public.stock_lots enable row level security;
create index if not exists stock_lots_receipt_id_idx on public.stock_lots (receipt_id);
create index if not exists stock_lots_product_id_idx on public.stock_lots (product_id);

-- One row per case when the Case tier is used (design.md §1): stock lives at the lowest container
-- received. A lot's loose units sit outside any case.
create table if not exists public.stock_cases (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  lot_id uuid not null,
  code text not null,
  qty_remaining numeric(12, 3) not null,
  location text,
  created_at timestamptz not null default now(),

  constraint stock_cases_id_merchant unique (id, merchant_id),
  constraint stock_cases_code_unique unique (merchant_id, code),
  constraint stock_cases_lot_fk foreign key (lot_id, merchant_id)
    references public.stock_lots (id, merchant_id),
  constraint stock_cases_remaining_non_negative check (qty_remaining >= 0),
  constraint stock_cases_location_length check (location is null or length(location) <= 120)
);

alter table public.stock_cases enable row level security;
create index if not exists stock_cases_lot_id_idx on public.stock_cases (lot_id);

-- A pack gets a row when it is serial-tracked (at receipt) or opened (Phase 2). Sealed packs of other
-- items are counted on their lot or case, not stored one by one.
create table if not exists public.stock_packs (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  lot_id uuid not null,
  case_id uuid,
  code text not null,
  serial text,
  units numeric(14, 4) not null,
  qty_remaining numeric(12, 3) not null,
  opened_at timestamptz,
  created_at timestamptz not null default now(),

  constraint stock_packs_id_merchant unique (id, merchant_id),
  constraint stock_packs_code_unique unique (merchant_id, code),
  -- A serial is unique for good, like a lot number.
  constraint stock_packs_serial_unique unique (merchant_id, serial),
  constraint stock_packs_lot_fk foreign key (lot_id, merchant_id)
    references public.stock_lots (id, merchant_id),
  constraint stock_packs_case_fk foreign key (case_id, merchant_id)
    references public.stock_cases (id, merchant_id),
  constraint stock_packs_serial_length check (serial is null or length(btrim(serial)) between 1 and 64),
  constraint stock_packs_remaining check (qty_remaining >= 0 and qty_remaining <= units)
);

alter table public.stock_packs enable row level security;
create index if not exists stock_packs_lot_id_idx on public.stock_packs (lot_id);
create index if not exists stock_packs_case_id_idx on public.stock_packs (case_id);

-- The ledger. Append-only: no client policy writes it, and no function updates or deletes a row.
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  product_id uuid not null,
  lot_id uuid not null,
  case_id uuid,
  pack_id uuid,
  kind public.stock_movement_kind not null,
  -- Signed, in base units: positive adds stock, negative removes it.
  qty numeric(12, 3) not null,
  reason public.write_off_reason,
  note text,
  -- A draw other than the pick engine's default (Phase 2).
  override boolean not null default false,
  -- The document behind the movement: a receipt code today, a sale later.
  ref text,
  -- The signed-in staff account. Null only on the opening-stock backfill.
  created_by uuid,
  created_at timestamptz not null default now(),

  constraint stock_movements_product_fk foreign key (product_id, merchant_id)
    references public.products (id, merchant_id),
  constraint stock_movements_lot_fk foreign key (lot_id, merchant_id)
    references public.stock_lots (id, merchant_id),
  constraint stock_movements_case_fk foreign key (case_id, merchant_id)
    references public.stock_cases (id, merchant_id),
  constraint stock_movements_pack_fk foreign key (pack_id, merchant_id)
    references public.stock_packs (id, merchant_id),
  constraint stock_movements_qty_non_zero check (qty <> 0),
  constraint stock_movements_note_length check (note is null or length(note) <= 500),
  constraint stock_movements_ref_length check (ref is null or length(ref) <= 64)
);

alter table public.stock_movements enable row level security;
create index if not exists stock_movements_product_id_idx on public.stock_movements (product_id, created_at desc);
create index if not exists stock_movements_lot_id_idx on public.stock_movements (lot_id);
create index if not exists stock_movements_case_id_idx on public.stock_movements (case_id);
create index if not exists stock_movements_pack_id_idx on public.stock_movements (pack_id);


-- 3. The balance guard.
--
-- qty_on_hand is the sum of the item's lots and cost_price their weighted average cost per base unit.
-- Only the functions in §4 write them, and they run as the owner. A client role writing either on a
-- stock item keeps the ledger's numbers instead of failing, so a stale edit screen still saves
-- everything else. A new stock item starts at zero.
--
-- Two changes are refused outright while stock is on hand: archiving (design.md §1), and a new
-- conversion factor or serial switch, either of which would change what the lots already hold.
create or replace function private.guard_stock_item()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.type = 'stock' and current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.qty_on_hand := 0;
      new.cost_price := null;
    else
      new.qty_on_hand := old.qty_on_hand;
      new.cost_price := old.cost_price;
    end if;
  end if;

  if tg_op = 'UPDATE' and old.type = 'stock' and coalesce(old.qty_on_hand, 0) > 0 then
    if new.status = 'archived' and old.status <> 'archived' then
      raise exception 'stock_on_hand'
        using errcode = '23514', detail = 'An item can be archived only once its stock is gone.';
    end if;
    if new.conversion_factor is distinct from old.conversion_factor
      or new.serial_tracked is distinct from old.serial_tracked then
      raise exception 'stock_item_units_locked'
        using errcode = '23514', detail = 'Units per pack and serial tracking change only while nothing is on hand.';
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


-- 4. The writers.
--
-- Public and security definer, so the ledger tables need no write policy at all. Each one carries
-- CLAUDE.md §6.2's three requirements: execute granted to authenticated alone, search_path pinned
-- with every name qualified, and private.assert_member() on the merchant it is about to touch. As the
-- owner they bypass RLS, so every query in them names its merchant or reaches rows through one that did.
--
-- Lock order, everywhere: the item's products row first, then its lot, case and pack. Two writers on one
-- item queue up behind the first lock rather than deadlocking further down.

create or replace function private.recompute_stock(p_product uuid)
returns void
language sql
set search_path = ''
as $$
  update public.products p set
    qty_on_hand = s.qty,
    -- An empty item keeps its last cost, so a reorder still shows what it cost last time.
    cost_price = case when s.qty > 0 then round(s.value / s.qty, 2) else p.cost_price end,
    updated_at = now()
  from (
    select coalesce(sum(l.qty_remaining), 0) as qty, coalesce(sum(l.qty_remaining * l.unit_cost), 0) as value
    from public.stock_lots l
    where l.product_id = p_product
  ) s
  where p.id = p_product;
$$;

revoke execute on function private.recompute_stock(uuid) from public, anon, authenticated, service_role;


-- save_receipt(payload): {
--   merchant_id, supplier_id?, invoice_no?, received_on?, received_by?, location?, freight?, notes?,
--   lines: [{
--     product_id | new_item: { item, group_name? },
--     cases?, packs_per_case?, cost_per_case?, sscc?,   -- the Case tier
--     packs?, cost_per_pack?,                           -- used when cases is absent
--     loose_units?, lot_code?, expires_on?, location?, notes?,
--     serials?: text[]                                  -- one per pack, serial-tracked items only
--   }]
-- }
-- Returns the receipt id. A saved receipt never changes; void_receipt and record_stock_movement are the
-- corrections.
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
  v_upp numeric;
  v_cases integer;
  v_per_case integer;
  v_packs integer;
  v_loose numeric;
  v_cost numeric;
  v_serials text[];
  v_lot public.stock_lots;
  v_case_ids uuid[];
  v_case_id uuid;
  v_value_total numeric;
  v_qty_total numeric;
  v_left numeric;
  v_share numeric;
  i integer;
begin
  perform private.assert_member(v_merchant);

  if v_supplier is not null and not exists (
    select 1 from public.suppliers s where s.id = v_supplier and s.merchant_id = v_merchant and s.active
  ) then
    raise exception 'supplier_inactive' using errcode = '23514';
  end if;

  if jsonb_array_length(coalesce(payload -> 'lines', '[]')) = 0 then
    raise exception 'receipt_empty' using errcode = '23514';
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

    -- "+ New item": made inside this transaction, so an abandoned receipt leaves no orphan item.
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

    v_upp := coalesce(v_item.conversion_factor, 1);
    v_cases := nullif((v_line ->> 'cases')::integer, 0);
    v_loose := coalesce((v_line ->> 'loose_units')::numeric, 0);

    -- Case tier: cost is entered per case, and the pack cost follows from it (design.md §3).
    if v_cases is not null then
      v_per_case := (v_line ->> 'packs_per_case')::integer;
      if coalesce(v_per_case, 0) <= 0 then
        raise exception 'receipt_line_packs_per_case' using errcode = '23514';
      end if;
      v_packs := v_cases * v_per_case;
      v_cost := (v_line ->> 'cost_per_case')::numeric / v_per_case;
    else
      v_per_case := null;
      v_packs := coalesce((v_line ->> 'packs')::integer, 0);
      v_cost := (v_line ->> 'cost_per_pack')::numeric;
    end if;

    if v_cost is null or v_cost < 0 then
      raise exception 'receipt_line_cost_required' using errcode = '23514';
    end if;

    v_serials := case when v_item.serial_tracked
      then array(select jsonb_array_elements_text(coalesce(v_line -> 'serials', '[]')))
      else '{}'::text[]
    end;

    if v_item.serial_tracked and (
      v_loose <> 0 or cardinality(v_serials) <> v_packs
      or exists (select 1 from unnest(v_serials) as s (serial) where btrim(s.serial) = '')
    ) then
      raise exception 'receipt_line_serials'
        using errcode = '23514', detail = 'A serial-tracked item needs one serial per pack and no loose units.';
    end if;

    -- coalesce stops at the first non-null argument, so a typed lot number never burns a counter value.
    insert into public.stock_lots (
      merchant_id, receipt_id, position, product_id, code, units_per_pack,
      cases, packs_per_case, cost_per_case, sscc,
      packs_received, loose_units, qty_remaining, cost_per_pack, expires_on, location, notes
    ) values (
      v_merchant, r.id, v_pos, v_item.id,
      coalesce(
        nullif(btrim(v_line ->> 'lot_code'), ''),
        private.issue_code(
          v_merchant, 'lot', 'LOT-' || to_char(r.received_on, 'YYYYMMDD') || '-', 3, 'public.stock_lots', 'code'
        )
      ),
      v_upp,
      v_cases, v_per_case, case when v_cases is not null then (v_line ->> 'cost_per_case')::numeric end,
      nullif(btrim(v_line ->> 'sscc'), ''),
      v_packs, v_loose, v_packs * v_upp + v_loose, v_cost,
      (v_line ->> 'expires_on')::date,
      coalesce(nullif(btrim(v_line ->> 'location'), ''), r.location, v_item.storage_location),
      nullif(btrim(v_line ->> 'notes'), '')
    )
    returning * into v_lot;

    v_case_ids := '{}';
    for i in 1 .. coalesce(v_cases, 0) loop
      insert into public.stock_cases (merchant_id, lot_id, code, qty_remaining, location)
      values (
        v_merchant, v_lot.id,
        private.issue_code(v_merchant, 'case', 'CS-', 4, 'public.stock_cases', 'code'),
        v_per_case * v_upp, v_lot.location
      )
      returning id into v_case_id;
      v_case_ids := v_case_ids || v_case_id;
    end loop;

    -- Serial packs fill the cases in order; with no cases, (i - 1) / null leaves case_id null.
    for i in 1 .. cardinality(v_serials) loop
      insert into public.stock_packs (merchant_id, lot_id, case_id, code, serial, units, qty_remaining)
      values (
        v_merchant, v_lot.id, v_case_ids[(i - 1) / v_per_case + 1],
        private.issue_code(v_merchant, 'pack', 'PK-', 6, 'public.stock_packs', 'code'),
        btrim(v_serials[i]), v_upp, v_upp
      );
    end loop;

    insert into public.stock_movements (merchant_id, product_id, lot_id, kind, qty, ref, created_by)
    values (v_merchant, v_item.id, v_lot.id, 'receive', v_lot.qty_received, r.code, (select auth.uid()));
  end loop;

  -- Freight follows each line's value (design.md §3). The last line takes the rounding remainder so the
  -- shares add up to the header exactly; a receipt of free goods splits it by quantity instead.
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


-- void_receipt: takes every lot of a receipt back to zero with a void movement each. Allowed only while
-- nothing but the receive itself has touched its stock (design.md §3); after that, corrections are
-- adjustments, which keep the history.
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
    raise exception 'receipt_has_movements'
      using errcode = '23514', detail = 'Stock from this receipt has already moved; correct it with an adjustment.';
  end if;

  insert into public.stock_movements (merchant_id, product_id, lot_id, kind, qty, note, ref, created_by)
  select l.merchant_id, l.product_id, l.id, 'void', -l.qty_remaining, nullif(btrim(p_reason), ''), r.code,
    (select auth.uid())
  from public.stock_lots l
  where l.receipt_id = r.id and l.qty_remaining > 0;

  update public.stock_packs set qty_remaining = 0
  where lot_id in (select l.id from public.stock_lots l where l.receipt_id = r.id);
  update public.stock_cases set qty_remaining = 0
  where lot_id in (select l.id from public.stock_lots l where l.receipt_id = r.id);
  update public.stock_lots set qty_remaining = 0 where receipt_id = r.id;

  update public.stock_receipts set voided_at = now(), void_reason = nullif(btrim(p_reason), '')
  where id = r.id;

  perform private.recompute_stock(l.product_id)
  from (select distinct product_id from public.stock_lots where receipt_id = r.id) l;
end;
$$;

revoke execute on function public.void_receipt(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.void_receipt(uuid, text) to authenticated;


-- record_stock_movement(payload): { kind, lot_id | case_id | pack_id, qty, reason?, note? }
--
-- The three row actions (design.md §6): adjust (signed qty, note required), write_off (amount removed,
-- reason required, and a note when the reason is Other), return_supplier (amount removed, only from a
-- receipt that had a supplier). The deepest id given is the target; the rows above it are read from it,
-- never taken from the payload.
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
  v_case public.stock_cases;
  v_lot public.stock_lots;
  v_item public.products;
  v_pack_id uuid := (payload ->> 'pack_id')::uuid;
  v_case_id uuid := (payload ->> 'case_id')::uuid;
  v_lot_id uuid := (payload ->> 'lot_id')::uuid;
begin
  if v_kind is null or v_kind not in ('adjust', 'write_off', 'return_supplier') then
    raise exception 'stock_movement_kind' using errcode = '22023';
  end if;
  if v_qty is null or v_qty = 0 or (v_kind <> 'adjust' and v_qty < 0) then
    raise exception 'stock_movement_qty' using errcode = '22023';
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

  -- Resolve the target without locks, lock its item, then lock and re-read the rows themselves.
  if v_pack_id is not null then
    select p.lot_id, p.case_id into v_lot_id, v_case_id from public.stock_packs p where p.id = v_pack_id;
  elsif v_case_id is not null then
    select c.lot_id into v_lot_id from public.stock_cases c where c.id = v_case_id;
  end if;

  select * into v_lot from public.stock_lots where id = v_lot_id;
  if v_lot.id is null then
    raise exception 'stock_target_not_found' using errcode = 'P0002';
  end if;
  perform private.assert_member(v_lot.merchant_id);

  select * into v_item from public.products where id = v_lot.product_id for update;
  select * into v_lot from public.stock_lots where id = v_lot_id for update;
  select * into v_case from public.stock_cases where id = v_case_id for update;
  select * into v_pack from public.stock_packs where id = v_pack_id for update;

  if v_item.serial_tracked and v_pack.id is null then
    raise exception 'stock_target_pack_required'
      using errcode = '23514', detail = 'A serial-tracked item moves one pack at a time.';
  end if;

  -- A voided receipt's lots stay at zero; stock found later arrives on a new receipt.
  if exists (select 1 from public.stock_receipts sr where sr.id = v_lot.receipt_id and sr.voided_at is not null) then
    raise exception 'receipt_voided' using errcode = '23514';
  end if;

  if v_kind = 'return_supplier' and not exists (
    select 1 from public.stock_receipts sr where sr.id = v_lot.receipt_id and sr.supplier_id is not null
  ) then
    raise exception 'receipt_has_no_supplier' using errcode = '23514';
  end if;

  -- Balances never go negative (design.md §1). A null case or pack compares as null, which is not true.
  if v_lot.qty_remaining + v_qty < 0 or v_case.qty_remaining + v_qty < 0 or v_pack.qty_remaining + v_qty < 0 then
    raise exception 'insufficient_stock' using errcode = '23514';
  end if;
  if v_pack.qty_remaining + v_qty > v_pack.units then
    raise exception 'pack_over_capacity' using errcode = '23514';
  end if;

  update public.stock_packs set qty_remaining = qty_remaining + v_qty where id = v_pack.id;
  update public.stock_cases set qty_remaining = qty_remaining + v_qty where id = v_case.id;
  update public.stock_lots set qty_remaining = qty_remaining + v_qty where id = v_lot.id;

  -- A lot or case moves only its unassigned part. Twelve units written off "from the lot" while every
  -- unit sits in a case would leave the cases claiming stock the lot no longer has.
  if (select l.qty_remaining from public.stock_lots l where l.id = v_lot.id)
      < (select coalesce(sum(c.qty_remaining), 0) from public.stock_cases c where c.lot_id = v_lot.id)
        + (select coalesce(sum(p.qty_remaining), 0) from public.stock_packs p
           where p.lot_id = v_lot.id and p.case_id is null)
    or (select c.qty_remaining from public.stock_cases c where c.id = v_case.id)
      < (select coalesce(sum(p.qty_remaining), 0) from public.stock_packs p where p.case_id = v_case.id)
  then
    raise exception 'stock_target_too_high'
      using errcode = '23514', detail = 'Choose the case or pack the units are in.';
  end if;

  insert into public.stock_movements (
    merchant_id, product_id, lot_id, case_id, pack_id, kind, qty, reason, note, created_by
  ) values (
    v_lot.merchant_id, v_lot.product_id, v_lot.id, v_case.id, v_pack.id, v_kind, v_qty, v_reason, v_note,
    (select auth.uid())
  );

  perform private.recompute_stock(v_lot.product_id);
end;
$$;

revoke execute on function public.record_stock_movement(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.record_stock_movement(jsonb) to authenticated;


-- 5. Policies: select only, keyed on membership like every business table. No insert, update or delete
-- policy exists, so a direct write from the client is refused and §4 is the only way in.
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


-- 6. Opening stock (design.md §7).
--
-- Every stock item that already has a quantity on hand and no lot becomes one lot on a per-merchant
-- "Opening stock" receipt with no supplier, costed at its current cost_price, so no stock disappears
-- and every unit is traceable from the start. The old quantity is read as base units. The lots are
-- written straight to their balance, so qty_on_hand and cost_price do not change.
--
-- An item left with a negative or null quantity has no lot to hold it, and is set to zero.
-- Re-runnable: an item that already has a lot is skipped.
do $$
declare
  v_merchant uuid;
  v_receipt public.stock_receipts;
  p public.products;
  v_upp numeric;
  v_packs integer;
  v_lot uuid;
  v_pos integer;
begin
  for v_merchant in
    select distinct pr.merchant_id from public.products pr
    where pr.type = 'stock' and pr.qty_on_hand > 0
      and not exists (select 1 from public.stock_lots l where l.product_id = pr.id)
  loop
    insert into public.stock_receipts (merchant_id, code, notes)
    values (
      v_merchant,
      private.issue_code(v_merchant, 'receipt', 'RC-', 4, 'public.stock_receipts', 'code'),
      'Opening stock: the quantities on hand when receipts were introduced.'
    )
    returning * into v_receipt;

    v_pos := 0;
    for p in
      select * from public.products pr
      where pr.merchant_id = v_merchant and pr.type = 'stock' and pr.qty_on_hand > 0
        and not exists (select 1 from public.stock_lots l where l.product_id = pr.id)
      order by pr.name, pr.id
    loop
      v_pos := v_pos + 1;
      v_upp := coalesce(p.conversion_factor, 1);
      v_packs := floor(p.qty_on_hand / v_upp);

      insert into public.stock_lots (
        merchant_id, receipt_id, position, product_id, code, units_per_pack,
        packs_received, loose_units, qty_remaining, cost_per_pack, unit_cost, expires_on, location
      ) values (
        v_merchant, v_receipt.id, v_pos, p.id,
        private.issue_code(
          v_merchant, 'lot', 'LOT-' || to_char(v_receipt.received_on, 'YYYYMMDD') || '-', 3,
          'public.stock_lots', 'code'
        ),
        v_upp, v_packs, p.qty_on_hand - v_packs * v_upp, p.qty_on_hand,
        coalesce(p.cost_price, 0) * v_upp, coalesce(p.cost_price, 0), p.expiry_date, p.storage_location
      )
      returning id into v_lot;

      insert into public.stock_movements (merchant_id, product_id, lot_id, kind, qty, ref)
      values (v_merchant, p.id, v_lot, 'receive', p.qty_on_hand, v_receipt.code);
    end loop;
  end loop;

  perform private.recompute_stock(pr.id)
  from public.products pr
  where pr.type = 'stock' and pr.qty_on_hand is distinct from 0
    and not exists (select 1 from public.stock_lots l where l.product_id = pr.id);
end
$$;
