# Inventory — acceptance tests

Covers the **Inventory** screen: its list and folders, an item's page, the item form, and the count going
down after a Register sale. Tests 6 and 9 make **Paracetamol 500mg** and **Rice 5kg**, the items the
Assets, Receipts and Stock tests start from.

**Words used in this file**

- **The side menu** — the list of places inside a system. On a phone it slides in from the left when
  you tap the **☰** menu button at the top left. **Inventory** is under **Resources** in it.
- **Type chip** — the small rounded label in an Inventory row that reads **Sellable**, **Component**
  or **Both**.
- **Selling as** — a list on an item's page, near the bottom, of the assets the Register sells it as.

- **Item form** — what **Add item** opens: **Pack**, then **Base unit** (only when the item is sold by
  something smaller than the pack), then **Review**. It is the same as the **Pack** and **Base unit**
  steps of a Stock receipt, without the supplier.

Tests 1–5 are retired. Start from Test 6, signed in, inside a system with no Inventory items yet.

---

## Group 1 — Normal use

## Test 1 - Title: Change Rice's type to Both from the list

> Retired by inventory.md Test 9.

### What will be tested?
On a **tablet**, you will change **Rice 5kg** from Component to Both on the Inventory list. A pass means
Rice gets a draft asset waiting for a price, so the shop can start selling it.

### What do you need before starting?
- Inventory and Stock Test 3 done, on a tablet.

### Steps
1. Open the side menu, tap **Resources**, then **Inventory**. Find the **Rice 5kg** row; its type chip
   reads **Component**.
2. Tap that chip. A menu opens with **Sellable**, **Component** and **Both**.
3. Tap **Both**.
4. Tap the name **Rice 5kg**. Its page opens beside the list.
5. Scroll down to **Selling as**, near the bottom of its page.

### What's the expected output?
- After step 3 the type chip on the **Rice 5kg** row reads **Both**.
- After step 5 **Selling as** lists **Rice 5kg (sack)**, reading **Needs price** in red at its right.

---

## Group 2 — Mistakes and edge cases

See Test 12, added later.

---

## Group 3 — Accounts

## Test 2 - Title: A different account sees none of the Inventory, and the first gets it back

> Retired by inventory.md Test 13.

### What will be tested?
You will sign in as someone else, then come back. A pass means the second person never sees the first
person's items, not even for a moment, and the first person's items are all still there afterwards.

### What do you need before starting?
- Test 1 done. A second Google or Facebook account.

### Steps
1. On **Inventory**, write down the items in the list and the amount on each row.
2. Open **Profile** and tap **Sign out**. The sign-in screen shows.
3. Sign in with the second account and open one of its systems.
4. Open the side menu, tap **Resources**, then **Inventory**.
5. Open **Profile**, tap **Sign out**, and sign in again with the first account.
6. Open the same system as in step 1, then **Inventory**.

### What's the expected output?
- After step 2 the sign-in screen shows, with nothing frozen.
- After step 4 none of **Paracetamol 500mg**, **Rice 5kg** or any other item written down in step 1
  appears on **Inventory**, not even for a moment.
- After step 6 **Inventory** lists the same items as in step 1, with the same amounts.

---

## Group 4 — Outside the app

See Tests 14 and 15, added later.

## Test 3 - Title: Phone and tablet

> Retired by inventory.md Test 15.

### What will be tested?
You will open **Inventory**, an item, the item form and **Adjust count** on a tablet and on a phone. A
pass means the tablet shows the wide layout, the phone the narrow one, and the forms fill the whole
screen on both.

### What do you need before starting?
- Inventory and Stock tests 1–7 done, with a phone and a tablet signed in to the same account.

### Steps
1. On the tablet, open **Inventory** and tap **Paracetamol 500mg**'s name.
2. Tap **Add item** at the top of **Inventory**. The item form opens.
3. Tap the back arrow at the top left to leave the form without saving.
4. On **Paracetamol 500mg**'s page, tap the **⋮** button at the right of one of its packs, then
   **Adjust count** in the menu that opens.
5. Do steps 1–4 on the phone.

### What's the expected output?
- Tablet, step 1: the rows show a type chip, cost and value, and **Paracetamol 500mg**'s page opens
  beside the list.
- Tablet, step 2: the item form lists its steps down the left (**Pack** to **Review**, with **Opt**
  beside the optional ones) and the open step on the right, with **Save item** at the top right.
- Tablet, step 4: **Adjust count** fills the whole screen with a back arrow at the top left — not a box
  in the middle of the screen.
- Phone: **Paracetamol 500mg**'s page opens on its own screen; the item form goes step by step with
  **Next** and **Skip step**; **Adjust count** fills the whole screen, the same as on the tablet.

---

## Added later — Normal use

## Test 4 - Title: Expiry alert as a date, and the Expiring warning

> Retired by inventory.md Test 11.

### What will be tested?
On **Paracetamol 500mg**'s page in **Inventory** you will set the date the app starts warning that its
stock is about to expire. A pass means the item's lots read **Expiring** from that date on, and stop
when the date is cleared, so the shop sees in time which stock to sell first.

### What do you need before starting?
- Inventory and Stock tests 1–7 done (**Paracetamol 500mg** has a lot expiring in 30 days and one in 60
  days), on a tablet held sideways.

### Steps
1. Open **Inventory** and tap **Paracetamol 500mg**'s name. Its page opens beside the list.
2. Tap **Edit** at the top right of the page. The item form opens on **Pack**.
3. Scroll down to **Stock settings**. Check the **Expiry** switch reads **Has an expiration date**.
4. Tap the **Expiry alert** field below the switch. A calendar opens.
5. Pick today's date and tap **OK**.
6. Tap **Save item** at the top right.
7. Look at the lots under **Lots** on the item's page, and at the item's row in the list.
8. Tap **Edit** again, scroll to **Expiry alert**, tap **Clear** beside it, then **Save item**.

### What's the expected output?
- After step 3, the **Expiry alert** field is half the width of the form, the same width as the
  **Re-order at** field above it — not stretched across the whole row. Before step 5 it reads
  **Select a date**, with a calendar icon at its right.
- After step 5, the field shows today's date, with a **Clear** button beside it.
- After step 7, under **Lots**, each lot that has not expired shows a red **Expiring** next to its
  **exp** date, and the item's row in the list shows red **Expiring** too. On the item's page,
  **Expiry alert** shows today's date.
- After step 8, the red **Expiring** words are gone from the lots and the row, and **Expiry alert** no
  longer shows on the item's page.

## Test 5 - Title: Expiry alert hidden when the item does not expire

> Retired by inventory.md Test 11.

### What will be tested?
On the **Add an inventory item** form you will turn **Expiry** off and on. A pass means the date to start
warning only shows for items that expire.

### What do you need before starting?
- On **Inventory**, on a phone or a tablet.

### Steps
1. Tap **Add item** at the top right. The form opens on **Pack**.
2. Scroll down to **Stock settings**, and tap the **Expiry** switch so it reads **Does not expire**.
3. Tap the switch again so it reads **Has an expiration date**.
4. Tap the back arrow at the top left, and **Discard** if a window asks.

### What's the expected output?
- After step 2, the **Expiry alert** field is gone.
- After step 3, **Expiry alert** is back, reading **Select a date**.
- After step 4, no item was added.

---

## Added later (2026-10-04) — Normal use

## Test 6 - Title: Record 1 — add Paracetamol, sold by the box and by the tablet, with stock

### What will be tested?
On **Inventory** you will add a medicine that comes in boxes of 10 tablets and sells both ways, with 5
boxes already on the shelf. A pass means the item is filed under its category, its 50 tablets are
counted, and the Register gets one thing to sell per way.

### What do you need before starting?
- Signed in, inside a system, on a phone, internet on.

### Steps
1. Open the side menu, tap **Resources**, then **Inventory**.
2. Tap **Add item** at the top. The item form opens on **Pack**, reading **Step 1 of 2**.
3. Type `Paracetamol 500mg` in **Pack name**.
4. Tap **Auto-generate** at the right of **SKU**.
5. Under **Sell by**, tap **Both**.
6. Tap the **Category** field, then **New category** at the bottom of the menu that opens. A **New
   category** window opens.
7. Type `Medicines` and tap **Create**.
8. Scroll down to **Stock details**. Type `5` in **Pack quantity** and `120` in **Cost per pack**.
9. Tap the **Expiration date** field. A calendar opens. Pick a date about a month from today and tap
   **OK**.
10. Tap **Next** at the bottom. The **Base unit** step opens.
11. In **Base unit type**, replace `pc` with `tablet`. In **Base units qty**, replace `1` with `10`.
12. Tap **Next**. **Review** opens.
13. Tap **Save item** at the bottom.

### What's the expected output?
- After step 5 the top of the form reads **Step 1 of 3** — the **Base unit** step was added.
- After step 7 the **Category** field reads **Medicines**.
- After step 8 **Cost per pack** reads **(required)**, an **Expiration date (required)** field appears,
  and **Total packs cost** at the bottom reads **₱600.00**.
- After step 11 **Cost per tablet** shows **₱12.00** in grey and **Total tablet from packs** reads
  **50**.
- After step 12 **Review** lists **Paracetamol 500mg**, **Both**, **10 tablet per pack**, **Medicines**,
  **5 pack (50 tablet)** and **₱120.00**.
- After step 13 Paracetamol's own page opens: **5 pack**, **1 pack = 10 tablet**, **Medicines**,
  **Lots (1)** with the date from step 9, and the first pack marked **Next pick**. Under **Selling as**:
  **Paracetamol 500mg (pack)** and **Paracetamol 500mg (tablet)**, each reading **Needs price**.

## Test 7 - Title: Leave a category folder with the back arrow

### What will be tested?
On **Inventory** you will open the **Medicines** folder and leave it with the arrow at the top. A pass
means a folder can always be left from the screen itself, not only with the phone's back button.

### What do you need before starting?
- Test 6 done, on a phone.

### Steps
1. On **Inventory**, look at the top left, beside the word **Inventory**.
2. Tap the **Medicines** row (folder icon, **1 item**).
3. Look at the top left again.
4. Tap the **←** arrow at the top left.
5. Do steps 1–4 on a tablet.

### What's the expected output?
- After step 1 there is no arrow beside **Inventory**.
- After step 3 a **←** arrow sits left of **Inventory**, and under the search bar reads
  **Inventory › Medicines**, with **Paracetamol 500mg** listed.
- After step 4 the list is back at the top level: the **Medicines** folder row shows, and the arrow is
  gone.
- Step 5: the same on the tablet.

## Test 8 - Title: Record 1 — edit Paracetamol while it has stock

### What will be tested?
On Paracetamol's page you will change when to re-order. A pass means the change is saved, and how many
tablets a box holds cannot be changed while boxes are on the shelf, so the count never goes wrong.

### What do you need before starting?
- Test 6 done, on Paracetamol's page.

### Steps
1. Tap **Edit** near the top of the page. The form opens, titled **Edit item** and **Paracetamol
   500mg**.
2. Look at **Sell by**.
3. Scroll to **Stock details**. Type `10` in **Re-order at**.
4. Tap **Next**. The **Base unit** step opens. Look at **Base units qty**.
5. Tap **Next**, then **Save changes** at the bottom.

### What's the expected output?
- After step 2 **Sell by** is greyed out and reads **Locked while stock is on hand** at its right.
- After step 3 there is no **Pack quantity** or **Cost per pack** field — stock is added through Stock
  receipts once the item exists.
- After step 4 **Base units qty** is greyed out, reading **10** and **Locked while stock is on hand**.
- After step 5 Paracetamol's page shows **Reorder at 10 tablet**, and still **5 pack** and **Medicines**.

## Test 9 - Title: Record 2 — add Rice 5kg as a variant with no stock, then sell it

### What will be tested?
On **Inventory** you will add a sack of rice that is one size of a rice line, with nothing on the shelf
yet, then make it sellable from the list. A pass means it gets its own folder and, once it is sellable,
a draft for the Register.

### What do you need before starting?
- On **Inventory**, on a tablet held sideways.

### Steps
1. Tap **Add item** at the top right. The form opens with **Pack** and **Review** listed on the left.
2. Type `Rice 5kg` in **Pack name** and tap **Auto-generate** beside **SKU**.
3. Under **Pack type**, tap **Component**. Leave **Sell by** on **Pack**.
4. Tap the **Variant** switch so it reads **This is a variant**.
5. Tap **Variant group name**, then **New group** in the menu. Type `Rice` in the field that appears.
6. Type `5kg` in **Variant name**. Leave **Pack quantity** empty.
7. Tap **Save item** at the top right.
8. Tap the **←** arrow at the top left of Rice's page. **Inventory** shows.
9. Tap the **Rice** folder row. In the **Rice 5kg** row, tap the type chip reading **Component**, then
   **Both** in the menu.
10. Tap the name **Rice 5kg**, and scroll to **Selling as** on its page.

### What's the expected output?
- After step 1 the list on the left has only **Pack** and **Review** — no **Base unit**, because it
  sells by the pack.
- After step 7 Rice's page shows **0 pack** and **Lots (0)**.
- After step 8 **Inventory** has a **Rice** folder row reading **1 item**.
- After step 9 the type chip reads **Both**.
- After step 10 **Selling as** lists **Rice 5kg (pack)** reading **Needs price**.

## Test 10 - Title: A Register sale takes boxes and tablets off the count

### What will be tested?
You will sell one box and three loose tablets of Paracetamol, then check **Inventory**. A pass means the
count drops by exactly what was sold, opening a box for the loose tablets.

### What do you need before starting?
- Test 6 done. On **Assets**, **Paracetamol 500mg (pack)** and **Paracetamol 500mg (tablet)** both
  priced and **Active** (Assets Test 2 shows how; do the same for the pack).

### Steps
1. On **Inventory**, write down the number on Paracetamol's row (for example **50 tablet**).
2. Open the side menu, tap **Store**, then **Register**.
3. Tap the **Paracetamol 500mg (pack)** tile once and the **Paracetamol 500mg (tablet)** tile three
   times.
4. Tap **Cart** at the top, then **Exact amount**, then **Complete sale** at the bottom.
5. Open the side menu, tap **Resources**, then **Inventory**, and look at Paracetamol's row.
6. Tap the **Medicines** folder, then **Paracetamol 500mg**, and look at its packs.

### What's the expected output?
- After step 4 a **View receipt** button shows — the sale is saved.
- After step 5 the row's number is **13 lower** than in step 1 (one box of 10, plus 3), for example
  **37 tablet**, and the line under it reads **1 open**.
- After step 6 one pack reads **Open** with **7/10** at its right; it is marked **Next pick**.

## Test 11 - Title: Expiry alert: only for items that expire, and lots read Expiring

### What will be tested?
On the item form you will set the date the app starts warning that stock is about to expire. A pass
means the date only appears for items that expire, and lots read **Expiring** from that date on.

### What do you need before starting?
- Test 6 done, on Paracetamol's page.

### Steps
1. Tap **Edit**. Scroll to **Stock details**.
2. Tap the **Expiry alert** field. Pick today's date and tap **OK**.
3. Tap **Next** twice, then **Save changes**. Look under **Lots**.
4. Go back to **Inventory** and tap **Add item**. Scroll to **Stock details**.
5. Tap the **Expiry** switch so it reads **Does not expire**.
6. Tap it again so it reads **Has an expiration date**.
7. Tap the **←** arrow at the top left, then **Discard** in the **Discard your changes?** window.

### What's the expected output?
- After step 2 **Expiry alert** shows today's date, with a **Clear** button beside it.
- After step 3 each lot that has not expired shows a red **Expiring** beside its **exp** date.
- After step 5 **Expiry alert** is gone. After step 6 it is back, reading **Select a date**.
- After step 7 **Inventory** shows and no item was added.

---

## Added later (2026-10-04) — Mistakes and edge cases

## Test 12 - Title: Missing fields, stock with no cost, and Save tapped twice

### What will be tested?
On the item form you will try to save with fields missing. A pass means the form says exactly what is
missing, takes you to it, and two fast taps on save make one item, not two.

### What do you need before starting?
- On **Inventory**, on a phone.

### Steps
1. Tap **Add item**. Tap **Next** until **Review** opens, then tap **Save item**.
2. Type `Test Syrup` in **Pack name** and tap **Auto-generate** beside **SKU**.
3. Scroll to **Stock details** and type `3` in **Pack quantity**. Leave **Cost per pack** empty.
4. Tap **Next** until **Review** opens, then **Save item**.
5. Type `50` in **Cost per pack**, then pick any date a month away in **Expiration date**.
6. Tap **Next** until **Review** opens, then tap **Save item** twice quickly.
7. Go back to **Inventory**.

### What's the expected output?
- After step 1 the form goes back to **Pack**. Red text at the bottom reads **Some fields need attention
  before this can be saved.**, red text under **Pack name** reads **Enter the pack name.**, and under
  **SKU** **Enter a SKU, or tap Auto-generate.**
- After step 4 the form goes back to **Pack**, with **Enter the cost of one pack.** under **Cost per
  pack** and **Enter the expiration date.** under **Expiration date**.
- After step 6 **Test Syrup**'s page opens showing **3 pack**.
- After step 7 **Inventory** lists **Test Syrup** once — not twice.

---

## Added later (2026-10-04) — Accounts

## Test 13 - Title: A different account sees none of the Inventory, and the first gets it back

### What will be tested?
You will sign in as someone else, then come back. A pass means the second person never sees the first
person's items, not even for a moment, and the first person's items are all still there afterwards.

### What do you need before starting?
- Tests 6 and 9 done. A second Google or Facebook account.

### Steps
1. On **Inventory**, write down the folders and items listed and the number on each row.
2. Open **Profile** (the person icon at the top right) and tap **Sign out**.
3. Sign in with the second account, open one of its systems, then **Inventory**.
4. Sign out, and sign in again with the first account.
5. Open the same system as in step 1, then **Inventory**.

### What's the expected output?
- After step 2 the sign-in screen shows, with nothing frozen.
- After step 3 none of **Medicines**, **Rice**, **Paracetamol 500mg** or **Rice 5kg** appears, not even
  for a moment.
- After step 5 **Inventory** lists the same as in step 1, with the same numbers.

---

## Added later (2026-10-04) — Outside the app

## Test 14 - Title: Internet drops while saving an item

### What will be tested?
You will save a new item with the internet off. A pass means the app says it is waiting instead of
spinning forever, and the item is saved once the internet is back — once.

### What do you need before starting?
- On **Inventory**, on a phone.

### Steps
1. Tap **Add item**. Type `Test Gauze` in **Pack name** and tap **Auto-generate** beside **SKU**.
2. Turn on airplane mode.
3. Tap **Next** until **Review** opens, then **Save item**.
4. Turn airplane mode off and wait 10 seconds.
5. Go back to **Inventory**.

### What's the expected output?
- After step 3 the line above the buttons reads **Waiting for a connection. This finishes on its own
  when you reconnect.** — no endless spinner.
- After step 4 **Test Gauze**'s page opens on its own.
- After step 5 **Test Gauze** is listed once.

## Test 15 - Title: Phone and tablet

### What will be tested?
You will open **Inventory**, an item, and the item form on a phone and on a tablet. A pass means the
tablet shows the wide layout and the phone the narrow one.

### What do you need before starting?
- Test 6 done, with a phone and a tablet signed in to the same account.

### Steps
1. On the tablet, open **Inventory**, tap **Medicines**, then **Paracetamol 500mg**.
2. Tap **Add item** at the top right.
3. Under **Sell by**, tap **Both**.
4. Tap the **←** arrow, then **Discard** if a window asks.
5. Do steps 1–4 on the phone.

### What's the expected output?
- Tablet, step 1: rows show a type chip, cost and value; Paracetamol's page opens beside the list.
- Tablet, step 2: the steps are listed down the left (**Pack**, **Review**) with the open step on the
  right, and **Cancel** and **Save item** at the top right.
- Tablet, step 3: **Base unit** joins the list on the left, between **Pack** and **Review**.
- Phone: Paracetamol's page opens on its own screen; the form goes one step at a time — **Step 1 of 2**,
  then **Step 1 of 3** after step 3 — with **Next** at the bottom and no **Skip step** button.
