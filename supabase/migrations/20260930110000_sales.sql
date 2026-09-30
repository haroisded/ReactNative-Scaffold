-- Sales: what the Register writes and the Receipts screen lists (.claude/register-receipts/context.md).
--
-- 1. sales and sale_lines.
-- 2. record_sale: a whole sale in one call — lines, totals, and every stock draw it causes.
-- 3. void_sale: puts back every unit a sale drew, pack by pack.
-- 4. Policies: read-only for the client, like the stock ledger. Every write goes through §2 or §3.
--
-- Cash only, and prices include tax: a line's tax is the part of its total its tax class makes up,
-- total × rate / (100 + rate), rounded per line. Price, name and rate are read here, never taken from the
-- client, and kept on the line so a later price change or a deleted product leaves the receipt as sold.
--
-- The stock side is 20260929100100_stock_ledger.sql's draw_stock, unchanged. Every movement a sale makes
-- carries the sale's code as its ref, which is how void_sale and the receipt's "Stock drawn" find them.


-- 1. Tables.
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  code text not null,
  -- Made by the Register once per sale, so a request retried after a dropped connection returns the sale
  -- already made instead of charging and drawing twice.
  client_key text not null,
  total numeric(12, 2) not null,
  -- The tax already inside total.
  tax_total numeric(12, 2) not null,
  tendered numeric(12, 2) not null,
  change_due numeric(12, 2) generated always as (tendered - total) stored,
  voided_at timestamptz,
  void_reason text,
  -- The signed-in staff account.
  created_by uuid,
  created_at timestamptz not null default now(),

  constraint sales_id_merchant unique (id, merchant_id),
  constraint sales_code_unique unique (merchant_id, code),
  constraint sales_client_key_unique unique (merchant_id, client_key),
  constraint sales_amounts check (total >= 0 and tax_total >= 0 and tax_total <= total and tendered >= total),
  constraint sales_text_length check (
    length(client_key) between 1 and 64 and (void_reason is null or length(void_reason) <= 500)
  )
);

alter table public.sales enable row level security;
create index if not exists sales_created_at_idx on public.sales (merchant_id, created_at desc);

create table if not exists public.sale_lines (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  sale_id uuid not null,
  position smallint not null default 0,
  -- Nulled, not refused, when the product is deleted: the line keeps its own name and price.
  product_id uuid,
  name text not null,
  unit_price numeric(12, 2) not null,
  qty numeric(12, 3) not null,
  tax_rate numeric(5, 2) not null default 0,
  line_total numeric(12, 2) generated always as (round(unit_price * qty, 2)) stored,

  constraint sale_lines_sale_fk foreign key (sale_id, merchant_id)
    references public.sales (id, merchant_id) on delete cascade,
  constraint sale_lines_product_fk foreign key (product_id, merchant_id)
    references public.products (id, merchant_id) on delete set null (product_id),
  constraint sale_lines_qty_positive check (qty > 0),
  constraint sale_lines_amounts check (unit_price >= 0 and tax_rate between 0 and 100)
);

alter table public.sale_lines enable row level security;
create index if not exists sale_lines_sale_id_idx on public.sale_lines (sale_id);
create index if not exists sale_lines_product_id_idx on public.sale_lines (product_id);
-- void_sale and the receipt's "Stock drawn" find a sale's movements by its code.
create index if not exists stock_movements_ref_idx on public.stock_movements (merchant_id, ref);


-- 2. record_sale(payload): { merchant_id, client_key, tendered, lines: [{ product_id, qty }] }
--
-- Sells only what the Register lists: a Products-screen row — flat, active, sold directly, priced. Any
-- other raises sale_product_unavailable with the product's name in detail.
--
-- Stock follows the recipe tree down from each line: a component that is a stock item is drawn, one that
-- is another flat product is walked in turn, and quantities multiply on the way down. A face's own item
-- is drawn as a sale; everything a recipe uses is drawn as consume. A component counted in packs takes
-- whole sealed packs, or its base units when the total is a fraction of a pack; any other unit is base
-- units. A flat product with no components draws nothing.
--
-- Draws are summed per item and made in item order, so two sales sharing items lock them in the same
-- order. Short stock raises insufficient_stock with the item's name in detail, and nothing of the sale is
-- kept. Short cash raises tendered_short. Returns { id, code, total, tax_total, change_due }.
create or replace function public.record_sale(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_merchant uuid := (payload ->> 'merchant_id')::uuid;
  v_key text := nullif(btrim(payload ->> 'client_key'), '');
  v_tendered numeric := (payload ->> 'tendered')::numeric;
  v_lines jsonb := payload -> 'lines';
  v_sale public.sales;
  v_bad text;
  v_total numeric;
  v_tax numeric;
  d record;
begin
  perform private.assert_member(v_merchant);

  if v_key is null or jsonb_typeof(v_lines) is distinct from 'array' or jsonb_array_length(v_lines) = 0
     or exists (select 1 from jsonb_to_recordset(v_lines) as l (product_id uuid, qty numeric)
                where l.product_id is null or l.qty is null or l.qty <= 0) then
    raise exception 'sale_invalid' using errcode = '22023';
  end if;

  select * into v_sale from public.sales where merchant_id = v_merchant and client_key = v_key;
  if v_sale.id is not null then
    return jsonb_build_object('id', v_sale.id, 'code', v_sale.code, 'total', v_sale.total,
      'tax_total', v_sale.tax_total, 'change_due', v_sale.change_due);
  end if;

  select coalesce(p.name, '') into v_bad
  from jsonb_to_recordset(v_lines) as l (product_id uuid, qty numeric)
  left join public.products p on p.id = l.product_id and p.merchant_id = v_merchant
  where p.id is null or p.type <> 'flat' or p.status <> 'active' or not p.sold_directly or p.selling_price is null
  limit 1;
  if found then
    raise exception 'sale_product_unavailable' using errcode = '23514', detail = v_bad;
  end if;

  select
    coalesce(sum(round(p.selling_price * l.qty, 2)), 0),
    coalesce(sum(round(round(p.selling_price * l.qty, 2) * coalesce(t.rate, 0) / (100 + coalesce(t.rate, 0)), 2)), 0)
  into v_total, v_tax
  from jsonb_to_recordset(v_lines) as l (product_id uuid, qty numeric)
  join public.products p on p.id = l.product_id
  left join public.tax_classes t on t.id = p.tax_class_id;

  if v_tendered is null or v_tendered < v_total then
    raise exception 'tendered_short' using errcode = '23514';
  end if;

  insert into public.sales (merchant_id, code, client_key, total, tax_total, tendered, created_by)
  values (
    v_merchant, private.issue_code(v_merchant, 'sale', 'SL-', 5, 'public.sales', 'code'), v_key,
    v_total, v_tax, v_tendered, (select auth.uid())
  )
  returning * into v_sale;

  insert into public.sale_lines (merchant_id, sale_id, position, product_id, name, unit_price, qty, tax_rate)
  select v_merchant, v_sale.id, l.n - 1, p.id, p.name, p.selling_price, l.qty, coalesce(t.rate, 0)
  from rows from (jsonb_to_recordset(v_lines) as (product_id uuid, qty numeric)) with ordinality as l (product_id, qty, n)
  join public.products p on p.id = l.product_id
  left join public.tax_classes t on t.id = p.tax_class_id;

  for d in
    with recursive walk (line_product, product_id, qty, unit, depth) as (
      select l.product_id, c.component_id, l.qty * c.qty, c.unit, 1
      from jsonb_to_recordset(v_lines) as l (product_id uuid, qty numeric)
      join public.product_components c on c.product_id = l.product_id
      union all
      select w.line_product, c.component_id, w.qty * c.qty, c.unit, w.depth + 1
      from walk w
      join public.products p on p.id = w.product_id and p.type = 'flat'
      join public.product_components c on c.product_id = w.product_id
      -- assert_no_bundle_cycle keeps the tree acyclic; this only stops a runaway walk if it ever isn't.
      where w.depth < 16
    ),
    leaves as (
      select
        s.id, s.name, s.conversion_factor,
        case when w.depth = 1 and s.id = f.source_item_id then 'sale' else 'consume' end as kind,
        case when w.unit = 'pack' then 'pack' else 'base' end as mode,
        sum(w.qty) as qty
      from walk w
      join public.products s on s.id = w.product_id and s.type = 'stock'
      join public.products f on f.id = w.line_product
      group by 1, 2, 3, 4, 5
    )
    select
      id, name, kind,
      case when mode = 'pack' and qty <> trunc(qty) then 'base' else mode end as mode,
      case when mode = 'pack' and qty <> trunc(qty) then qty * coalesce(conversion_factor, 1) else qty end as qty
    from leaves
    -- Sealed packs before loose units of the same item, so a loose draw never opens the pack a pack sale
    -- was about to take.
    order by id, mode desc, kind
  loop
    begin
      perform public.draw_stock(jsonb_build_object(
        'product_id', d.id, 'qty', d.qty, 'mode', d.mode, 'kind', d.kind, 'ref', v_sale.code
      ));
    exception when check_violation then
      if sqlerrm = 'insufficient_stock' then
        raise exception 'insufficient_stock' using errcode = '23514', detail = d.name;
      end if;
      raise;
    end;
  end loop;

  return jsonb_build_object('id', v_sale.id, 'code', v_sale.code, 'total', v_sale.total,
    'tax_total', v_sale.tax_total, 'change_due', v_sale.change_due);
end;
$$;

revoke execute on function public.record_sale(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.record_sale(jsonb) to authenticated;


-- 3. void_sale: every unit the sale drew goes back to the pack it came from, with a void movement each,
-- and the sale is marked void. A pack filled since — an adjustment topped it up — raises
-- pack_over_capacity rather than holding more than it can.
create or replace function public.void_sale(p_sale uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.sales;
begin
  select * into s from public.sales where id = p_sale;
  if s.id is null then
    raise exception 'sale_not_found' using errcode = 'P0002';
  end if;
  perform private.assert_member(s.merchant_id);

  -- Items first, then the sale: the ledger's lock order (20260929100100_stock_ledger.sql §5).
  perform 1 from public.products
  where id in (
    select m.product_id from public.stock_movements m
    where m.merchant_id = s.merchant_id and m.ref = s.code and m.kind in ('sale', 'consume')
  )
  order by id
  for update;

  select * into s from public.sales where id = p_sale for update;
  if s.voided_at is not null then
    raise exception 'sale_voided' using errcode = '23514';
  end if;

  if exists (
    select 1 from public.stock_packs k
    join (
      select m.pack_id, -sum(m.qty) as back from public.stock_movements m
      where m.merchant_id = s.merchant_id and m.ref = s.code and m.kind in ('sale', 'consume')
      group by m.pack_id
    ) b on b.pack_id = k.id
    where k.qty_remaining + b.back > k.units
  ) then
    raise exception 'pack_over_capacity' using errcode = '23514';
  end if;

  insert into public.stock_movements (merchant_id, product_id, lot_id, pack_id, kind, qty, note, ref, created_by)
  select m.merchant_id, m.product_id, m.lot_id, m.pack_id, 'void', -m.qty, nullif(btrim(p_reason), ''),
    s.code, (select auth.uid())
  from public.stock_movements m
  where m.merchant_id = s.merchant_id and m.ref = s.code and m.kind in ('sale', 'consume');

  update public.stock_packs k set qty_remaining = k.qty_remaining + b.back
  from (
    select m.pack_id, -sum(m.qty) as back from public.stock_movements m
    where m.merchant_id = s.merchant_id and m.ref = s.code and m.kind in ('sale', 'consume')
    group by m.pack_id
  ) b
  where b.pack_id = k.id;

  update public.sales set voided_at = now(), void_reason = nullif(btrim(p_reason), '') where id = s.id;

  perform private.recompute_stock(m.product_id)
  from (
    select distinct product_id from public.stock_movements
    where merchant_id = s.merchant_id and ref = s.code and kind in ('sale', 'consume')
  ) m;
end;
$$;

revoke execute on function public.void_sale(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.void_sale(uuid, text) to authenticated;


-- 4. Policies: select only, and §2 and §3 are the only way in.
do $$
declare
  t text;
begin
  foreach t in array array['sales', 'sale_lines'] loop
    execute format('drop policy if exists %I on public.%I', t || '_select_own_merchant', t);
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (merchant_id in (select private.current_merchant_ids()))',
      t || '_select_own_merchant', t
    );
  end loop;
end
$$;
