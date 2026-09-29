-- Inventory items (.claude/inventory-stock/instructions.txt, Inventory.html).
--
-- 1. stock_sell_by and stock_role.
-- 2. product_groups: the parent a variant hangs under. Each variant is its own stock row.
-- 3. The stock columns on products, the link from a Products-screen face to the item it sells, and
--    category made optional for drafts and stock items.
-- 4. A generated SKU for every stock item that is saved without one.
-- 5. product_groups' policies.
-- 6. Register faces: the draft Products-screen rows an item is sold through, kept in step by a trigger.
-- 7. save_stock_item: the Inventory form's writer.
--
-- The item is the master record (name, SKU, units, role, category). Price, tax and recipe live on its
-- faces, one per Sell By unit, because a pack and a tablet are priced apart. The physical stock — lots
-- and packs, with their lot numbers, serials and expiry — is 20260929100100_stock_ledger.sql.
--
-- Column reuse, rather than a second column meaning the same thing:
--   conversion_factor   base units per pack (1 when the item is sold by the pack only)
--   perishable          "has expiry": when true, every receipt line needs an expiry date
--   reorder_threshold   re-order point, in base units
--   internal_notes      the form's Notes

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
alter table public.products
  add column if not exists pack_unit_name text,
  add column if not exists base_unit_name text,
  add column if not exists sell_by public.stock_sell_by,
  add column if not exists stock_role public.stock_role,
  add column if not exists group_id uuid,
  add column if not exists attributes text[] not null default '{}',
  -- Set on a Products-screen face; points at the stock item it sells.
  add column if not exists source_item_id uuid;

alter table public.products drop constraint if exists products_group_fk;
alter table public.products drop constraint if exists products_source_item_fk;
alter table public.products drop constraint if exists products_unit_names_length;
alter table public.products drop constraint if exists products_category_required;
alter table public.products drop constraint if exists products_stock_fields;

alter table public.products
  add constraint products_group_fk foreign key (group_id, merchant_id)
    references public.product_groups (id, merchant_id) on delete set null (group_id);
-- NO ACTION: a face's component row already refuses deleting the item while the face exists.
alter table public.products
  add constraint products_source_item_fk foreign key (source_item_id, merchant_id)
    references public.products (id, merchant_id);
-- 20 characters keeps a face's name, "<item> (<unit>)", inside products_name_length.
alter table public.products
  add constraint products_unit_names_length check (
    (pack_unit_name is null or length(btrim(pack_unit_name)) between 1 and 20)
    and (base_unit_name is null or length(btrim(base_unit_name)) between 1 and 20)
  );
-- A stock row from before this file is a component sold by the pack until someone says otherwise.
update public.products set sell_by = coalesce(sell_by, 'pack'), stock_role = coalesce(stock_role, 'component')
where type = 'stock' and (sell_by is null or stock_role is null);

-- A face is made with no category (the item's category belongs to Inventory, not to Products), and the
-- Inventory form marks Category optional. Everything else still needs one.
alter table public.products alter column category_id drop not null;
alter table public.products
  add constraint products_category_required check (category_id is not null or status = 'draft' or type = 'stock');

create index if not exists products_group_id_idx on public.products (group_id);
create index if not exists products_source_item_id_idx on public.products (source_item_id);


-- 4. SKUs. A stock item saved without one gets SKU-#####, unique per merchant and never reissued. A
-- blank SKU counts as none, so clearing it on the form issues a new one.
drop trigger if exists products_assign_sku on public.products;
create trigger products_assign_sku
  before insert or update of sku on public.products
  for each row when (new.type = 'stock' and (new.sku is null or btrim(new.sku) = ''))
  execute function private.assign_code('sku', 'SKU-', '5', 'sku');

-- Stock rows from before this file, oldest first. `set sku = null` fires the trigger above.
do $$
declare
  v_id uuid;
begin
  for v_id in
    select id from public.products where type = 'stock' and sku is null order by merchant_id, created_at, id
  loop
    update public.products set sku = null where id = v_id;
  end loop;
end
$$;

-- A stock item always has a SKU, and knows how it is sold and used. The trigger above fills the SKU
-- before this is checked.
alter table public.products
  add constraint products_stock_fields check (
    type <> 'stock' or (sku is not null and sell_by is not null and stock_role is not null)
  );


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


-- 6. Register faces.
--
-- An item that is Sellable or Both is sold through one draft 'flat' product per Sell By unit: "<item>
-- (<pack unit>)" drawing one pack, and "<item> (<base unit>)" drawing one base unit, each through a
-- single product_components row. The draft lands in Products with no price; staff price it and publish
-- it before the Register can sell it. A face's name, price and category are staff's once made, so
-- nothing here writes them again.
--
-- A unit no longer wanted — Component, a narrower Sell By, an archived item:
--   still a draft, used by nothing   deleted; wanting the unit again makes a fresh draft
--   published (active or inactive)   archived, keeping its price and category; wanting it restores it
--                                    as a draft, so staff re-publish it on purpose
--   a draft another recipe uses      left alone
-- A draft is never archived: products_price_when_sold and products_category_required only let a
-- product without price or category exist as a draft.
--
-- Security invoker: RLS gates every statement. Callable directly by "Add from Inventory" (a face deleted
-- by hand comes back), and by the trigger below whenever role, Sell By or status changes.
create or replace function public.ensure_register_faces(p_item uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item public.products;
  v_unit public.measure_unit;
  v_want boolean;
  v_face uuid;
  v_face_status public.product_status;
begin
  select * into v_item from public.products where id = p_item and type = 'stock';
  if v_item.id is null then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;

  foreach v_unit in array array['pack', 'piece']::public.measure_unit[] loop
    v_want := coalesce(
      v_item.status <> 'archived'
        and v_item.stock_role in ('sellable', 'both')
        and (v_item.sell_by = 'both' or (v_unit = 'pack') = (v_item.sell_by = 'pack')),
      false
    );

    v_face := null;
    v_face_status := null;
    select d.id, d.status into v_face, v_face_status
    from public.products d
    join public.product_components c on c.product_id = d.id and c.component_id = v_item.id
    where d.source_item_id = v_item.id and c.unit = v_unit
    limit 1;

    if v_want and v_face is null then
      insert into public.products (merchant_id, type, name, status, sold_directly, is_composite, source_item_id)
      values (
        v_item.merchant_id, 'flat',
        left(v_item.name, 96) || ' (' || case v_unit
          when 'pack' then coalesce(v_item.pack_unit_name, 'pack')
          else coalesce(v_item.base_unit_name, 'pc')
        end || ')',
        'draft', true, true, v_item.id
      )
      returning id into v_face;

      insert into public.product_components (product_id, merchant_id, component_id, qty, unit)
      values (v_face, v_item.merchant_id, v_item.id, 1, v_unit);
    elsif v_want and v_face_status = 'archived' then
      update public.products set status = 'draft', updated_at = now() where id = v_face;
    elsif not v_want and v_face_status = 'draft' then
      delete from public.products d
      where d.id = v_face
        and not exists (select 1 from public.product_components c where c.component_id = v_face);
    elsif not v_want and v_face_status in ('active', 'inactive') then
      update public.products set status = 'archived', updated_at = now() where id = v_face;
    end if;
  end loop;
end;
$$;

revoke execute on function public.ensure_register_faces(uuid) from public, anon, authenticated, service_role;
grant execute on function public.ensure_register_faces(uuid) to authenticated;

-- The trigger's own wrapper, so the inline Type toggle on the Inventory list is a plain update.
create or replace function private.sync_register_faces()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.ensure_register_faces(new.id);
  return null;
end;
$$;

revoke execute on function private.sync_register_faces() from public, anon, authenticated, service_role;

drop trigger if exists products_sync_register_faces on public.products;
create trigger products_sync_register_faces
  after insert or update of stock_role, sell_by, status on public.products
  for each row when (new.type = 'stock')
  execute function private.sync_register_faces();


-- 7. save_stock_item(payload): { item, group_name?, opening? }
--
-- The Inventory form's writer. `item` is a products row as JSON (id present to update). `group_name`
-- makes the variant's parent group inside the same transaction. `opening` — { packs, loose_units,
-- cost_per_pack } — is the form's optional stock on hand, written by add_inventory_stock
-- (20260929100100_stock_ledger.sql) so item and stock land together or not at all. Faces follow from
-- §6's trigger. qty_on_hand and cost_price are never written here; they belong to the ledger.
create or replace function public.save_stock_item(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  p public.products;
  v_id uuid;
  v_group uuid;
  v_group_name text := nullif(btrim(payload ->> 'group_name'), '');
begin
  p := jsonb_populate_record(null::public.products, payload -> 'item');
  v_group := p.group_id;

  if v_group is null and v_group_name is not null then
    insert into public.product_groups (merchant_id, name) values (p.merchant_id, v_group_name)
    on conflict (merchant_id, name) do update set name = excluded.name
    returning id into v_group;
  end if;

  if p.id is null then
    insert into public.products (
      merchant_id, type, name, category_id, subcategory_id, sku, barcode, description, tags, status,
      sold_directly, track_inventory, storage_location, reorder_threshold, expiry_alert_days, perishable,
      conversion_factor, pack_unit_name, base_unit_name, sell_by, stock_role, group_id, attributes,
      internal_notes
    ) values (
      p.merchant_id, 'stock', p.name, p.category_id, p.subcategory_id, p.sku, p.barcode, p.description,
      coalesce(p.tags, '{}'), coalesce(p.status, 'active'),
      false, true, p.storage_location, p.reorder_threshold, p.expiry_alert_days, coalesce(p.perishable, true),
      coalesce(p.conversion_factor, 1), p.pack_unit_name, p.base_unit_name, p.sell_by, p.stock_role, v_group,
      coalesce(p.attributes, '{}'), p.internal_notes
    )
    returning id into v_id;
  else
    update public.products set
      name = p.name, category_id = p.category_id, subcategory_id = p.subcategory_id, sku = p.sku,
      barcode = p.barcode, description = p.description, tags = coalesce(p.tags, '{}'),
      status = coalesce(p.status, status), storage_location = p.storage_location,
      reorder_threshold = p.reorder_threshold, expiry_alert_days = p.expiry_alert_days,
      perishable = coalesce(p.perishable, perishable), conversion_factor = coalesce(p.conversion_factor, 1),
      pack_unit_name = p.pack_unit_name, base_unit_name = p.base_unit_name, sell_by = p.sell_by,
      stock_role = p.stock_role, group_id = v_group, attributes = coalesce(p.attributes, '{}'),
      internal_notes = p.internal_notes, updated_at = now()
    where id = p.id and type = 'stock'
    returning id into v_id;

    if v_id is null then
      raise exception 'product_not_found' using errcode = 'P0002';
    end if;
  end if;

  if p.id is null and coalesce((payload -> 'opening' ->> 'packs')::integer, 0)
       + coalesce((payload -> 'opening' ->> 'loose_units')::numeric, 0) > 0 then
    perform public.add_inventory_stock((payload -> 'opening') || jsonb_build_object('product_id', v_id));
  end if;

  return v_id;
end;
$$;

revoke execute on function public.save_stock_item(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.save_stock_item(jsonb) to authenticated;


-- Faces for every item already saved as Sellable or Both. Re-runnable: an item with its faces is left as
-- it is.
select public.ensure_register_faces(id) from public.products where type = 'stock';
