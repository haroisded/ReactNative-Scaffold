-- Reverts 20260928100300_supplier_code_default.sql.
--
-- Destroys no data. Codes already issued stay. The app sends '' for a blank code, which this revert
-- turns into a failed insert (suppliers_details_length), so regenerate src/lib/database.types.ts and
-- have the form send a code after running it.

drop trigger if exists suppliers_assign_code on public.suppliers;
create trigger suppliers_assign_code
  before insert or update of code on public.suppliers
  for each row when (new.code is null)
  execute function private.assign_code('supplier', 'SUP-', '4', 'code');

alter table if exists public.suppliers alter column code drop default;
