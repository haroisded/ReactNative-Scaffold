-- Inventory items (.claude/inventory-stock/design.md §1 and §4).
--
-- 1. stock_sell_by and stock_role.
-- 2. product_groups: the parent a variant hangs under. Each variant is its own stock row.
-- 3. The stock columns on products, the link from a register draft to the item it sells, and category
--    made optional for drafts and stock items.
-- 4. A generated SKU for every stock item.
-- 5. product_groups' policies.
-- 6. save_stock_item: the Inventory form's writer, which also keeps the item's register drafts in step.
--
-- qty_on_hand and cost_price are not written here. They belong to the ledger in
-- 20260928100200_stock_receipts.sql.

-- 1. Enums.
do $$
begin
  if to_regtype('public.stock_sell_by') is null then
    create type public.stock_sell_by as enum ('pack', 'base', 'both');
  end if;
  if to_regtype('public.stock_role') is null then
    create type public.stock_role as enum ('sellable', 'component', 'both');
  end if;
end
$$;


-- 2. Product groups.
create table if not exists public.product_groups (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),

  constraint product_groups_id_merchant unique (id, merchant_id),
  constraint product_groups_name_length check (length(btrim(name)) between 1 and 120),
  constraint product_groups_name_unique unique (merchant_id, name)
);

alter table public.product_groups enable row level security;


-- 3. Stock columns.
--
-- conversion_factor keeps its column and gains one meaning: base units per pack. Only stock items use
-- it, and the Inventory form is its only writer.
alter table public.products
  add column if not exists pack_unit_name text,
  add column if not exists base_unit_name text,
  add column if not exists sell_by public.stock_sell_by,
  add column if not exists stock_role public.stock_role,
  -- Manufacturer serials: one pack row per pack at receipt. The system never makes serials up.
  add column if not exists serial_tracked boolean not null default false,
  add column if not exists group_id uuid,
  add column if not exists attributes text[] not null default '{}',
  -- Set on a register draft save_stock_item made; points at the stock item it sells.
  add column if not exists source_item_id uuid;

alter table public.products drop constraint if exists products_group_fk;
alter table public.products drop constraint if exists products_source_item_fk;
alter table public.products drop constraint if exists products_unit_names_length;
alter table public.products drop constraint if exists products_category_required;

alter table public.products
  add constraint products_group_fk foreign key (group_id, merchant_id)
    references public.product_groups (id, merchant_id) on delete set null (group_id);
-- NO ACTION: the draft's component row already refuses deleting the item while the draft exists.
alter table public.products
  add constraint products_source_item_fk foreign key (source_item_id, merchant_id)
    references public.products (id, merchant_id);
-- 20 characters keeps a draft's name, "<item> (<unit>)", inside products_name_length.
alter table public.products
  add constraint products_unit_names_length check (
    (pack_unit_name is null or length(btrim(pack_unit_name)) between 1 and 20)
    and (base_unit_name is null or length(btrim(base_unit_name)) between 1 and 20)
  );

-- A register draft is created with no category (the item's category belongs to Inventory, not to
-- Products), and the Inventory form marks Category optional. Everything else still needs one.
alter table public.products alter column category_id drop not null;
alter table public.products
  add constraint products_category_required check (category_id is not null or status = 'draft' or type = 'stock');

create index if not exists products_group_id_idx on public.products (group_id);
create index if not exists products_source_item_id_idx on public.products (source_item_id);


-- 4. SKUs. Every stock item gets one, unique per merchant (products_sku_unique) and never issued twice.
-- A typed SKU is kept; a blank one is generated, on insert or when an edit clears it.
drop trigger if exists products_assign_sku on public.products;
create trigger products_assign_sku
  before insert or update of sku, type on public.products
  for each row when (new.type = 'stock' and new.sku is null)
  execute function private.assign_code('sku', 'SKU-', '5', 'sku');

do $$
declare
  p record;
begin
  for p in
    select id, merchant_id from public.products
    where type = 'stock' and sku is null
    order by merchant_id, created_at, id
  loop
    update public.products
    set sku = private.issue_code(p.merchant_id, 'sku', 'SKU-', 5, 'public.products', 'sku')
    where id = p.id;
  end loop;
end
$$;


-- 5. Policies on product_groups, the same four as 20260914092147_products.sql §6.
do $$
declare
  t text := 'product_groups';
begin
  execute format('drop policy if exists %I on public.%I', t || '_select_own_merchant', t);
  execute format(
    'create policy %I on public.%I for select to authenticated
       using (merchant_id in (select private.current_merchant_ids()))',
    t || '_select_own_merchant', t
  );

  execute format('drop policy if exists %I on public.%I', t || '_insert_own_merchant', t);
  execute format(
    'create policy %I on public.%I for insert to authenticated
       with check (merchant_id in (select private.current_merchant_ids()))',
    t || '_insert_own_merchant', t
  );

  execute format('drop policy if exists %I on public.%I', t || '_update_own_merchant', t);
  execute format(
    'create policy %I on public.%I for update to authenticated
       using (merchant_id in (select private.current_merchant_ids()))
       with check (merchant_id in (select private.current_merchant_ids()))',
    t || '_update_own_merchant', t
  );

  execute format('drop policy if exists %I on public.%I', t || '_delete_own_merchant', t);
  execute format(
    'create policy %I on public.%I for delete to authenticated
       using (merchant_id in (select private.current_merchant_ids()))',
    t || '_delete_own_merchant', t
  );
end
$$;


-- 6. save_stock_item(payload): { item: <products columns>, group_name?: text }.
--
-- Security invoker, like save_product: every statement runs as the caller and the policies gate it.
-- save_receipt calls it for "+ New item" as the owner, after its own membership check, with merchant_id
-- forced to the receipt's.
--
-- The register side (design.md §4): an item that is Sellable or Both gets one draft register product per
-- Sell By unit, each drawing 1 of that unit through product_components (unit 'pack' draws a pack,
-- 'piece' a base unit). A unit no longer wanted — Component, a narrower Sell By, an archived item —
-- archives its draft instead of deleting it, and wanting it again restores it.
create or replace function public.save_stock_item(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  p public.products;
  v_item public.products;
  v_group uuid;
  v_group_name text := nullif(btrim(payload ->> 'group_name'), '');
  v_unit public.measure_unit;
  v_want boolean;
  v_draft uuid;
  v_draft_status public.product_status;
begin
  p := jsonb_populate_record(null::public.products, payload -> 'item');
  v_group := p.group_id;

  -- "New parent group" on the form: made here, so the item and its group land together or not at all.
  if v_group is null and v_group_name is not null then
    insert into public.product_groups (merchant_id, name) values (p.merchant_id, v_group_name)
    on conflict (merchant_id, name) do update set name = excluded.name
    returning id into v_group;
  end if;

  if p.id is null then
    insert into public.products (
      merchant_id, type, name, category_id, subcategory_id, sku, barcode, description, tags, status,
      sold_directly, track_inventory, storage_location, reorder_threshold, expiry_alert_days,
      conversion_factor, pack_unit_name, base_unit_name, sell_by, stock_role, serial_tracked,
      group_id, attributes, internal_notes
    ) values (
      p.merchant_id, 'stock', p.name, p.category_id, p.subcategory_id, p.sku, p.barcode, p.description,
      coalesce(p.tags, '{}'), coalesce(p.status, 'active'),
      false, true, p.storage_location, p.reorder_threshold, p.expiry_alert_days,
      p.conversion_factor, p.pack_unit_name, p.base_unit_name, p.sell_by, p.stock_role,
      coalesce(p.serial_tracked, false), v_group, coalesce(p.attributes, '{}'), p.internal_notes
    )
    returning * into v_item;
  else
    update public.products set
      name = p.name, category_id = p.category_id, subcategory_id = p.subcategory_id, sku = p.sku,
      barcode = p.barcode, description = p.description, tags = coalesce(p.tags, '{}'),
      status = coalesce(p.status, 'active'), storage_location = p.storage_location,
      reorder_threshold = p.reorder_threshold, expiry_alert_days = p.expiry_alert_days,
      conversion_factor = p.conversion_factor, pack_unit_name = p.pack_unit_name,
      base_unit_name = p.base_unit_name, sell_by = p.sell_by, stock_role = p.stock_role,
      serial_tracked = coalesce(p.serial_tracked, false), group_id = v_group,
      attributes = coalesce(p.attributes, '{}'), internal_notes = p.internal_notes, updated_at = now()
    where id = p.id and type = 'stock'
    returning * into v_item;

    if v_item.id is null then
      raise exception 'product_not_found' using errcode = 'P0002';
    end if;
  end if;

  foreach v_unit in array array['pack', 'piece']::public.measure_unit[] loop
    v_want := coalesce(
      v_item.status <> 'archived'
      and v_item.stock_role in ('sellable', 'both')
      and (v_item.sell_by = 'both' or (v_unit = 'pack') = (v_item.sell_by = 'pack')),
      false
    );

    select d.id, d.status into v_draft, v_draft_status
    from public.products d
    join public.product_components c on c.product_id = d.id and c.component_id = v_item.id
    where d.source_item_id = v_item.id and c.unit = v_unit
    limit 1;

    if v_want and v_draft is null then
      insert into public.products (merchant_id, type, name, status, sold_directly, is_composite, source_item_id)
      values (
        v_item.merchant_id, 'flat',
        left(v_item.name, 96) || ' (' || case v_unit
          when 'pack' then coalesce(v_item.pack_unit_name, 'pack')
          else coalesce(v_item.base_unit_name, 'unit')
        end || ')',
        'draft', true, true, v_item.id
      )
      returning id into v_draft;

      insert into public.product_components (product_id, merchant_id, component_id, qty, unit)
      values (v_draft, v_item.merchant_id, v_item.id, 1, v_unit);
    elsif v_want and v_draft_status = 'archived' then
      update public.products set status = 'draft', updated_at = now() where id = v_draft;
    elsif not v_want and v_draft is not null and v_draft_status <> 'archived' then
      update public.products set status = 'archived', updated_at = now() where id = v_draft;
    end if;
  end loop;

  return v_item.id;
end;
$$;

revoke execute on function public.save_stock_item(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.save_stock_item(jsonb) to authenticated;
