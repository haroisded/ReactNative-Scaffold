-- The New stock receipt's inputs, as the merchant fills them in (.claude/my-prompt-this-session.md).
--
-- 1. A receipt's supplier is optional. The app asks for a supplier and a date together or neither;
--    received_on stays not null and falls back to today.
-- 2. A blank lot number stays blank. Nothing issues LOT-… any more; the unique constraint allows many
--    nulls, and stock_lots_code_length passes on null.
-- 3. A lot keeps the packs it was expected to hold (packs_expected) beside the packs that arrived
--    (packs_received, which the stock is made from), and the base units counted in one pack
--    (units_per_pack_received) beside the item's own units_per_pack. Both are a record only.
-- 4. The cost per base unit is the merchant's when they type one; otherwise it is the pack cost over the
--    units. The receipt's freight (Shipping cost) is recorded and no longer spread into unit_cost, so
--    freight_share stays 0 on new lots.
--
-- Rejected: a server check pairing supplier and date. received_on has always defaulted to today, and a
-- receipt with a supplier and no typed date is still a delivery that happened today.

alter table public.stock_receipts alter column supplier_id drop not null;

alter table public.stock_lots alter column code drop not null;
alter table public.stock_lots add column if not exists packs_expected integer;
alter table public.stock_lots add column if not exists units_per_pack_received numeric(14, 4);
alter table public.stock_lots drop constraint if exists stock_lots_expected_positive;
alter table public.stock_lots add constraint stock_lots_expected_positive check (
  coalesce(packs_expected, 1) > 0 and coalesce(units_per_pack_received, 1) > 0
);

-- Explicit, as in every migration (CLAUDE.md §6.1); both tables already have it.
alter table public.stock_receipts enable row level security;
alter table public.stock_lots enable row level security;


-- One lot, its cases and a row per pack, and a receive movement per pack. Shared by save_receipt,
-- add_inventory_stock and §7 of 20260929100100_stock_ledger.sql. The caller has locked the item and
-- checked membership.
--
-- p_line: { cases?, packs_per_case?, cost_per_case?, case_sscc?, packs_expected?, packs?, cost_per_pack?,
--           unit_cost?, units_per_pack_received?, loose_units?, unit_loads?, pallets_per_unit_load?,
--           unit_load_sscc?, pallets?, cases_per_pallet?, pallet_sscc?, lot_code?, expires_on?, location?,
--           notes?, serials?: text[] }
-- `packs` is what arrived; blank, the expected count (packs_expected, or cases × packs_per_case) is
-- taken as received. Packs fill the cases in order, so a short delivery leaves the last cases short.
create or replace function private.create_lot(
  p_item public.products, p_receipt public.stock_receipts, p_position integer, p_line jsonb
)
returns public.stock_lots
language plpgsql
set search_path = ''
as $$
declare
  v_merchant uuid := p_item.merchant_id;
  v_upp numeric := coalesce(p_item.conversion_factor, 1);
  v_cases integer := nullif((p_line ->> 'cases')::integer, 0);
  v_per_case integer;
  v_expected integer := (p_line ->> 'packs_expected')::integer;
  v_packs integer;
  v_loose numeric := coalesce((p_line ->> 'loose_units')::numeric, 0);
  v_cost numeric;
  v_serials text[];
  v_lot public.stock_lots;
  v_case_id uuid;
  v_pack public.stock_packs;
begin
  -- Case tier: cost is entered per case, and the pack cost and the expected count follow.
  if v_cases is not null then
    v_per_case := (p_line ->> 'packs_per_case')::integer;
    if coalesce(v_per_case, 0) <= 0 or (p_line ->> 'cost_per_case') is null then
      raise exception 'receipt_line_case_tier' using errcode = '23514';
    end if;
    v_expected := v_cases * v_per_case;
    v_cost := (p_line ->> 'cost_per_case')::numeric / v_per_case;
  else
    v_cost := coalesce((p_line ->> 'cost_per_pack')::numeric, coalesce(p_item.cost_price, 0) * v_upp);
  end if;
  v_packs := coalesce((p_line ->> 'packs')::integer, v_expected, 0);

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

  insert into public.stock_lots (
    merchant_id, source, receipt_id, position, product_id, code, units_per_pack, units_per_pack_received,
    unit_loads, pallets_per_unit_load, unit_load_sscc, pallets, cases_per_pallet, pallet_sscc,
    cases, packs_per_case, cost_per_case, case_sscc,
    packs_expected, packs_received, loose_units, cost_per_pack, expires_on, location, notes
  ) values (
    v_merchant, case when p_receipt.id is null then 'inventory' else 'stock' end::public.stock_lot_source,
    p_receipt.id, p_position, p_item.id,
    nullif(btrim(p_line ->> 'lot_code'), ''),
    v_upp, nullif((p_line ->> 'units_per_pack_received')::numeric, 0),
    nullif((p_line ->> 'unit_loads')::integer, 0), nullif((p_line ->> 'pallets_per_unit_load')::integer, 0),
    nullif(btrim(p_line ->> 'unit_load_sscc'), ''),
    nullif((p_line ->> 'pallets')::integer, 0), nullif((p_line ->> 'cases_per_pallet')::integer, 0),
    nullif(btrim(p_line ->> 'pallet_sscc'), ''),
    v_cases, v_per_case, case when v_cases is not null then (p_line ->> 'cost_per_case')::numeric end,
    nullif(btrim(p_line ->> 'case_sscc'), ''),
    nullif(v_expected, 0), v_packs, v_loose, v_cost,
    (p_line ->> 'expires_on')::date,
    coalesce(nullif(btrim(p_line ->> 'location'), ''), p_receipt.location, p_item.storage_location),
    nullif(btrim(p_line ->> 'notes'), '')
  )
  returning * into v_lot;

  -- Packs fill the cases in order; any past the last case are loose. A case row is made when its first
  -- pack is, so a case that never arrived has none.
  v_case_id := null;
  for n in 1 .. v_packs loop
    if v_cases is not null and (n - 1) % v_per_case = 0 then
      v_case_id := null;
      if (n - 1) / v_per_case < v_cases then
        insert into public.stock_cases (merchant_id, lot_id, code, sscc)
        values (
          v_merchant, v_lot.id,
          private.issue_code(v_merchant, 'case', 'CS-', 4, 'public.stock_cases', 'code'),
          -- The one SSCC typed on the form labels the first case.
          case when n = 1 then v_lot.case_sscc end
        )
        returning id into v_case_id;
      end if;
    end if;

    insert into public.stock_packs (merchant_id, product_id, lot_id, case_id, code, serial, units, qty_remaining)
    values (
      v_merchant, p_item.id, v_lot.id, v_case_id,
      private.issue_code(v_merchant, 'pack', 'PK-', 6, 'public.stock_packs', 'code'),
      v_serials[n], v_upp, v_upp
    )
    returning * into v_pack;

    -- A lot with no number and no receipt (an Inventory add) is referred to by its pack.
    insert into public.stock_movements (merchant_id, product_id, lot_id, pack_id, kind, qty, ref, created_by)
    values (v_merchant, p_item.id, v_lot.id, v_pack.id, 'receive', v_upp,
      coalesce(p_receipt.code, v_lot.code, v_pack.code), (select auth.uid()));
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
    values (v_merchant, p_item.id, v_lot.id, v_pack.id, 'receive', v_loose,
      coalesce(p_receipt.code, v_lot.code, v_pack.code), (select auth.uid()));
  end if;

  -- The merchant's cost per base unit is final; blank, it is the lot's cost over its units.
  update public.stock_lots
  set unit_cost = coalesce((p_line ->> 'unit_cost')::numeric, line_cost / qty_received)
  where id = v_lot.id
  returning * into v_lot;
  return v_lot;
end;
$$;

revoke execute on function private.create_lot(public.products, public.stock_receipts, integer, jsonb)
  from public, anon, authenticated, service_role;


-- save_receipt(payload): {
--   merchant_id, supplier_id?, invoice_no?, received_on?, received_by?, location?, freight?, notes?,
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
  v_line jsonb;
  v_pos integer := 0;
  v_item public.products;
  v_item_id uuid;
begin
  perform private.assert_member(v_merchant);

  -- No supplier is allowed; a named one must be this merchant's and active.
  if v_supplier is not null and not exists (
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
    coalesce((payload ->> 'freight')::numeric, 0),
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

  perform private.recompute_stock(l.product_id)
  from (select distinct product_id from public.stock_lots where receipt_id = r.id) l;

  return r.id;
end;
$$;

revoke execute on function public.save_receipt(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.save_receipt(jsonb) to authenticated;
