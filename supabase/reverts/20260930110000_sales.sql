-- Reverts 20260930110000_sales.sql.
--
-- DESTROYS DATA: every sale and sale line. The stock movements the sales made stay in the ledger, since
-- the ledger is append-only and the packs already reflect them. The Register and Receipts screens expect
-- these tables — src/features/sales and src/lib/database.types.ts — so regenerate the types after.

drop function if exists public.void_sale(uuid, text);
drop function if exists public.record_sale(jsonb);

drop index if exists public.stock_movements_ref_idx;

drop table if exists public.sale_lines;
drop table if exists public.sales;

delete from private.merchant_counters where kind = 'sale';
