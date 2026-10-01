# Register + Receipts: context for the next plan

Read this before planning. Written 2026-09-29, right after commit 2bf959a ("Rebuild Inventory and
Stock on a pack-by-pack ledger with a pick order"). Also read `.claude/inventory-stock/instructions.txt`
§"Register Screen" and "Receipt Screen(new)" (lines 194-206): that is the user's own wording.

## What the user asked for
- **Register screen:** for now, its job is to prove that Products, Inventory and Stock work end to end.
- **Receipts screen (new):** add it to the sidebar. It is a simple history of the transactions the
  cashier made in the Register. It depends on the Register, so build the Register first.
- **General POS**, not only pharmacy: pharmacy is just the hardest example.
- **Rentables are disabled.** They are off the rail and must never appear in the Register. Keep
  their routes and data.
- **Only Products-screen items can be sold.** An Inventory item reaches the Register only through
  its Products face, once that face is active (priced, categorised, published).

## Settled model (do not re-litigate)
- **Inventory item** = `products` row with `type='stock'`. This is the master record: name, SKU,
  `pack_unit_name`, `base_unit_name`, `sell_by` (pack|base|both), `stock_role`
  (sellable|component|both), `conversion_factor` (base units per pack), and `perishable` (has expiry).
- **Products face** = a `flat` product with `source_item_id` and one `product_components` row
  (unit `pack` or `piece`, qty 1). There is one face per Sell By unit, named "<item> (<unit>)".
  The face holds price, tax and recipe. `private.sync_register_faces` / `ensure_register_faces`
  keep the faces in step with the item's role and Sell By.
- **Stock** = `stock_packs`, one row per physical pack with its own `qty_remaining`. Loose units
  received arrive as one partial pack. Sealed, open and empty are derived states.
- **Pick order** (`stock_pick_queue` view): open packs first, then closest expiry, then fewest left,
  then oldest lot, then pack code. Expired packs are skipped.

## What already exists for the Register to call
- `public.draw_stock(payload jsonb) returns jsonb`
  (`supabase/migrations/20260929100100_stock_ledger.sql` ~L668).
  - Payload: `{ product_id, qty, mode: 'base'|'pack', kind: 'sale'|'consume', ref? }`.
  - It walks the pick order and writes one `stock_movements` row per pack it touches.
  - It returns `[{pack_id, code, qty}]`.
  - If there is not enough stock it raises `insufficient_stock` and draws nothing. Bad input
    raises `draw_invalid`.
  - `product_id` is the **Inventory item**, not the face. A face with unit `pack` draws with mode
    `pack`; a face with unit `piece` draws with mode `base`.
- `stock_movements.ref` is for the sale id. `stock_movement_kind` already has `sale` and `consume`.
- `src/lib/errors.ts` `stockFailure` maps these exception names to user-facing copy.
- Verified in SQL: a draw of 5 then 7 tablets took the earliest-expiring pack first, then spilled
  into the next case, leaving 8.

## Known gaps the Register plan must close
- **One sale must be one transaction.** Calling `draw_stock` once per cart line from the client is
  not atomic. The plan needs a `record_sale(payload)` security-definer RPC (CLAUDE.md §6.2 rules)
  that writes the sale and its lines and does every draw inside one transaction.
- **Recipes and components.** When a sold product's `product_components` include Inventory items,
  those draws use `kind='consume'`. Bundles (`private.assert_no_bundle_cycle`) may nest.
- **No sales tables yet.** Receipts need something like `sales` + `sale_lines` (+ payments?),
  with RLS by hand and the `current_merchant_ids()` policy shape (`instruction_mds/tenancy.md`).
- **Products not linked to Inventory** (plain flat products) carry no stock. Decide whether they
  sell without a draw.
- **Screens:** `src/app/(app)/systems/[id]/register.tsx` is a `PlaceholderScreen` stub, and the
  rail entry is `register` in `_layout.tsx` `DESTINATIONS`. There is no Receipts (sales) route or
  rail item yet. Do not confuse it with Stock → Receipts, which is supplier stock receipts.
- **Rail icon** for Register is `calculator`. Any new icon needs a verified pair in `ICONS`
  (`src/lib/icons.tsx`).

## Open questions to ask the user at planning time
- Payment methods (cash only first? change due?), tax display (inclusive or exclusive; per
  `tax_classes`), and discounts (`discounts.tsx` is a stub).
- Selling by pack code or scan (the model allows "(Loose)" or scan/typed pack code): is a scan
  needed now, or only tapping a product?
- Void or refund of a sale: does it return stock (a reverse movement), and is it in scope now?
- Receipt numbering (reuse `private.issue_code`, for example `SL-####`?) and what a receipt row
  and its detail show on phone and tablet.
- Staff and cashier identity: is `created_by` enough for now?

## Standing rules (from CLAUDE.md / instruction_mds; the summary only)
The human does git. Never touch the emulator unless allowed that session. There is no web target.
Every migration ships its revert, then `build:migrations` and `check:migrations`. RLS is written by
hand for every table. Paper is imported through `src/components`. Use theme keys only, never
literals. Write acceptance tests in `.claude/tests/<screen>.md`. Before handing over, run lint,
typecheck, `tools/fallow-verdict.mjs` and `/ponytail-review`.
