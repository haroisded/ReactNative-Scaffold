-- Suppliers, extended for the Stock screen (.claude/inventory-stock/design.md §2).
--
-- 1. private.merchant_counters and the code issuer every generated code goes through: SUP here, SKU in
--    20260928100100_stock_items.sql, RC / LOT / CS / PK in 20260928100200_stock_receipts.sql.
-- 2. supplier_types, the per-merchant lookup the supplier form manages inline.
-- 3. suppliers: contact becomes contact_person, and the Profile / Terms / Extra columns arrive.
--
-- Re-runnable, like the rest of supabase/migrations.

create schema if not exists private;


-- 1. Codes.
--
-- A counter row per (merchant, kind) rather than a Postgres sequence per merchant: a sequence is a
-- schema object, and making one per merchant at signup would be DDL from application code. The upsert
-- takes a row lock, so two concurrent saves for one merchant get consecutive numbers, never the same
-- one. A rolled-back save rolls its number back with it; a committed one is never issued again, which is
-- what "never reused" asks of a SKU or a lot number.
create table if not exists private.merchant_counters (
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  kind text not null,
  next bigint not null,
  primary key (merchant_id, kind)
);

-- No policies: only functions owned by the table owner write it. RLS is on anyway (CLAUDE.md §6.1), and
-- the grants below keep the USAGE authenticated holds on `private` from reaching it.
alter table private.merchant_counters enable row level security;
revoke all on private.merchant_counters from public, anon, authenticated;

create or replace function private.next_number(p_merchant uuid, p_kind text)
returns bigint
language sql
set search_path = ''
as $$
  insert into private.merchant_counters as c (merchant_id, kind, next)
  values (p_merchant, p_kind, 2)
  on conflict (merchant_id, kind) do update set next = c.next + 1
  returning c.next - 1;
$$;

-- The next free code of a kind: the prefix, then the counter zero-padded to p_width (and longer once it
-- outgrows it). Skips a value already present in p_table.p_column, because a merchant may type a code of
-- their own that a later generated one would otherwise collide with.
create or replace function private.issue_code(
  p_merchant uuid, p_kind text, p_prefix text, p_width integer, p_table regclass, p_column text
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_number text;
  v_code text;
  v_taken boolean;
begin
  loop
    v_number := private.next_number(p_merchant, p_kind)::text;
    v_code := p_prefix || repeat('0', greatest(p_width - length(v_number), 0)) || v_number;
    execute format('select exists (select 1 from %s where merchant_id = $1 and %I = $2)', p_table, p_column)
      into v_taken using p_merchant, v_code;
    exit when not v_taken;
  end loop;
  return v_code;
end;
$$;

-- The membership check the stock functions open with (CLAUDE.md §6.2 item 3): current_merchant_ids()
-- answers for (select auth.uid()), so a caller can only ever act on their own merchant's rows.
create or replace function private.assert_member(p_merchant uuid)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not exists (select 1 from private.current_merchant_ids() as m (id) where m.id = p_merchant) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
end;
$$;

-- Fills a blank code column on insert. Arguments: counter kind, prefix, width, column name.
--
-- Security definer because the client inserts suppliers and products directly, and the counters are
-- out of its reach. The membership check keeps a caller from advancing another merchant's counter; no
-- JWT means a migration or the SQL Editor, both of which already run as the owner.
create or replace function private.assign_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    perform private.assert_member(new.merchant_id);
  end if;

  new := jsonb_populate_record(new, jsonb_build_object(
    tg_argv[3],
    private.issue_code(new.merchant_id, tg_argv[0], tg_argv[1], tg_argv[2]::integer, tg_relid::regclass, tg_argv[3])
  ));
  return new;
end;
$$;

revoke execute on function private.next_number(uuid, text) from public, anon, authenticated, service_role;
revoke execute on function private.issue_code(uuid, text, text, integer, regclass, text)
  from public, anon, authenticated, service_role;
revoke execute on function private.assert_member(uuid) from public, anon, authenticated, service_role;
revoke execute on function private.assign_code() from public, anon, authenticated, service_role;


-- 2. Supplier types. Same lookup shape as tax_classes: unique (id, merchant_id) so a supplier's key can
-- only reach a type of its own merchant.
create table if not exists public.supplier_types (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),

  constraint supplier_types_id_merchant unique (id, merchant_id),
  constraint supplier_types_name_length check (length(btrim(name)) between 1 and 40),
  constraint supplier_types_name_unique unique (merchant_id, name)
);

alter table public.supplier_types enable row level security;


-- 3. Suppliers.
--
-- contact is renamed rather than dropped, so what merchants typed there survives as the contact person.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'suppliers' and column_name = 'contact'
  ) then
    alter table public.suppliers rename column contact to contact_person;
  end if;
  if exists (select 1 from pg_constraint where conname = 'suppliers_contact_length') then
    alter table public.suppliers rename constraint suppliers_contact_length to suppliers_contact_person_length;
  end if;
end
$$;

alter table public.suppliers
  add column if not exists code text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists address text,
  add column if not exists payment_terms text,
  add column if not exists supplier_type_id uuid,
  add column if not exists lead_time_days integer,
  add column if not exists tin text,
  -- Inactive suppliers drop out of the receipt picker. A supplier with receipts can only be deactivated:
  -- stock_receipts' key to it refuses the delete.
  add column if not exists active boolean not null default true,
  add column if not exists notes text;

alter table public.suppliers drop constraint if exists suppliers_type_fk;
alter table public.suppliers drop constraint if exists suppliers_code_unique;
alter table public.suppliers drop constraint if exists suppliers_details_length;
alter table public.suppliers drop constraint if exists suppliers_lead_time_non_negative;

alter table public.suppliers
  add constraint suppliers_type_fk foreign key (supplier_type_id, merchant_id)
    references public.supplier_types (id, merchant_id) on delete set null (supplier_type_id);
alter table public.suppliers
  add constraint suppliers_code_unique unique (merchant_id, code);
-- TIN is text, not a number: Philippine TINs are written with dashes and a branch code.
alter table public.suppliers
  add constraint suppliers_details_length check (
    (code is null or length(btrim(code)) between 1 and 20)
    and (phone is null or length(phone) <= 32)
    and (email is null or length(email) <= 255)
    and (address is null or length(address) <= 255)
    and (payment_terms is null or length(payment_terms) <= 60)
    and (tin is null or length(tin) <= 20)
    and (notes is null or length(notes) <= 2000)
  );
alter table public.suppliers
  add constraint suppliers_lead_time_non_negative check (lead_time_days is null or lead_time_days >= 0);

create index if not exists suppliers_supplier_type_id_idx on public.suppliers (supplier_type_id);

drop trigger if exists suppliers_assign_code on public.suppliers;
create trigger suppliers_assign_code
  before insert or update of code on public.suppliers
  for each row when (new.code is null)
  execute function private.assign_code('supplier', 'SUP-', '4', 'code');

-- Existing suppliers get codes in the order they were created.
do $$
declare
  s record;
begin
  for s in select id, merchant_id from public.suppliers where code is null order by merchant_id, created_at, id loop
    update public.suppliers
    set code = private.issue_code(s.merchant_id, 'supplier', 'SUP-', 4, 'public.suppliers', 'code')
    where id = s.id;
  end loop;
end
$$;

-- Safe: the trigger fills every insert that leaves it blank.
alter table public.suppliers alter column code set not null;


-- 4. Policies on the new table, the same four as 20260914092147_products.sql §6.
do $$
declare
  t text := 'supplier_types';
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
