-- A blank supplier code is generated.
--
-- suppliers.code is not null and filled by a trigger, but a column with no default is required in the
-- generated Insert type, so the app could not insert a supplier without typing a code. The default is
-- '' and the trigger now treats a blank code the same as a missing one: the SUP-#### it issues replaces
-- it before suppliers_details_length is checked. The same holds on update, so clearing a code in the
-- form issues a new one.

alter table public.suppliers alter column code set default '';

drop trigger if exists suppliers_assign_code on public.suppliers;
create trigger suppliers_assign_code
  before insert or update of code on public.suppliers
  for each row when (new.code is null or btrim(new.code) = '')
  execute function private.assign_code('supplier', 'SUP-', '4', 'code');
