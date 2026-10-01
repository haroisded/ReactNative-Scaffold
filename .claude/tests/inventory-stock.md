# Inventory and Stock — acceptance tests

Covers the **Inventory** screen (its list, an item's page, and the step-by-step item form), the **Stock**
screen (**Receipts** and **Suppliers**), and the **Add from Inventory** button on **Products**: adding
items, receiving stock on a receipt, adjusting, writing off and returning stock, and voiding a receipt.
It also covers the forms that now open as a full page on both phone and tablet: new supplier, new tax
class, new category and the stock count forms.

Run the tests in order: later tests use the supplier, items and receipts earlier ones make.

**Products** is now **Assets**, under **Store** in the side menu. The tests that sent you to Products
are retired, and new tests for these screens are in `inventory.md`, `stock.md`, `assets.md` and
`home.md`. A test marked Retired is no longer run.

A few words used throughout:

- **Pack** — what an item is bought and counted in: a cup of tablets, a sack of rice.
- **Base unit** — what a pack holds: the tablets inside the cup.
- **Case** — a carton of several packs, as it arrives from the supplier.
- **Lot** — everything of one item that arrived on one receipt line, with one lot number (or none) and one expiry date.
- **Next pick** — the pack the shop should take from next. The app marks it with a red **Next pick** tag.
- **(REQUIRED)** — written after a field's name when it must be filled in. A field without it can be left empty.

---

## Group 1 — Normal use

## Test 1 - Title: Add a supplier

### What will be tested?
On the **Stock** screen you will add a new supplier. A pass means the supplier form opens as a full
page, the supplier is saved with a supplier code of its own, and it can be picked when stock is received.

### What do you need before starting?
- Signed in, inside a system, internet on, on a phone.

### Steps
1. Tap the menu button at the top left to open the side menu.
2. Tap **Resources**, then **Stock**. The Stock screen opens.
3. Tap **Suppliers** in the switch at the top of the screen, next to **Receipts**.
4. Tap **Add supplier** at the top right.
5. Look at the screen that opens.
6. Type `Test Pharma Supply` in the **Supplier name** field.
7. Leave the **Code** field empty.
8. Type `7` in the **Lead time (days)** field.
9. Check the **Active — can be picked when receiving stock** switch is on.
10. Tap **Create** at the bottom of the form.

### What's the expected output?
- After step 5 a **New supplier** page fills the whole screen, with a back arrow at the top left. It does
  not slide up from the bottom as a half-height sheet.
- The label of **Supplier name** ends in **(REQUIRED)**; **Code** and **Lead time (days)** do not.
- After step 10 the page closes and you are back on the **Suppliers** list of the Stock screen.
- **Test Pharma Supply** is in the list with a code starting **SUP-** (for example **SUP-0001**), made
  by the app because the **Code** field was left empty.

## Test 2 - Title: Add sample item 1 — a medicine sold by the tablet

### What will be tested?
On the **Inventory** screen you will create a medicine bought in cups of 12 tablets and sold by the
tablet, going through the item form one step at a time. A pass means the barcode can be made by the
app, the **Base unit** step appears only when **Sell by** asks for it, and the item saves with its units.

### What do you need before starting?
- Test 1 done, on a phone.

### Steps
1. Open the side menu, tap **Resources**, then **Inventory**. The Inventory list opens.
2. Tap **Add item** at the top right. A form titled **Add an inventory item** opens on **Pack**, step 1 of 3.
3. Type `Paracetamol 500mg` in the **Pack name** field.
4. Tap **Auto-generate** on the right of the **SKU** label. A code fills the **SKU** field.
5. Tap **Auto-generate** on the right of the **Barcode** label.
6. Look at the **Barcode** field.
7. Under **Pack type**, tap **Sellable**.
8. Under **Sell by**, tap **Base unit**. Look at the step count at the top.
9. Scroll down to **Stock settings**. Type `cup` in the **Pack unit name** field.
10. Type `Pharmacy shelf 1` in the **Storage location** field.
11. Type `20` in the **Re-order at** field.
12. Check the **Expiry** switch reads **Has an expiration date**.
13. Scroll down to **Quantity on hand** and leave both fields blank.
14. Tap **Next**. **Variant** opens, marked **Optional**. Tap **Skip step**. **Base unit** opens.
15. Type `tablet` in the **Base unit type** field.
16. Type `12` in the field below it, now labelled **tablet per cup**.
17. Tap **Next**. **Review** opens.
18. Tap **Save item** at the bottom of the screen.

### What's the expected output?
- The form has no supplier field and no link to the Stock screen.
- After step 6 the **Barcode** field holds 13 digits starting with **2**. Tapping **Auto-generate** again
  gives a different 13-digit number, also starting with **2**.
- After step 8 the step count reads **of 4**: a **Base unit** step was added. Tapping **Pack** under
  **Sell by** takes it back to 3.
- After step 17 the review lists **Paracetamol 500mg**, **Sell by: Base unit**, **Units per pack: 12 tablet
  per cup**, and no **Quantity on hand** line.
- After step 18 the form closes and the item's own page opens, with **Paracetamol 500mg** at the top.
- Near the top of that page the amount on hand reads **0 cup**, and **Lots (0)** further down says no
  packs yet.
- In the item's details: **Sell by** reads **Base unit**, **Per pack** reads **1 cup = 12 tablet**,
  **Reorder at** reads **20 tablet**, and **Location** reads **Pharmacy shelf 1**.
- A **Selling as** part lists **Paracetamol 500mg (tablet)** with a red **Needs price** on its right.

## Test 3 - Title: Add sample item 2 — rice with a quantity on hand, no supplier

### What will be tested?
On the **Inventory** screen you will create rice sold by the sack, and type how many sacks are already
on the shelf. A pass means the item has stock straight away, marked as added in Inventory, with no
supplier or receipt behind it.

### What do you need before starting?
- On the **Inventory** screen, on a phone.

### Steps
1. Tap **Add item** at the top right. The **Add an inventory item** form opens on **Pack**.
2. Type `Rice 5kg` in the **Pack name** field.
3. Tap **Auto-generate** next to **SKU**.
4. Under **Pack type**, tap **Component**. Leave **Sell by** on **Pack**.
5. Under **Stock settings**, type `sack` in the **Pack unit name** field.
6. Turn the **Expiry** switch off, so it reads **Does not expire**.
7. Under **Quantity on hand**, type `5` in the **sack on hand** field.
8. Type `250` in the **Cost per sack** field.
9. Tap **Next**, then **Skip step** on **Variant**.
10. On **Review**, tap **Save item**.

### What's the expected output?
- After step 6 the **Expiry alert** field is gone.
- There is no loose-units field anywhere, and no **Base unit** step: rice is counted by the sack only.
- The review lists **Quantity on hand: 5 sack** and **Cost per pack: 250**.
- The item's page opens with **Rice 5kg** at the top and **5 sack** on hand.
- Under **Lots (1)** there is one lot with the grey words **Added in Inventory**, and five packs under it.
- There is no **Selling as** part (a Component is not sold on its own).
- Open the side menu and tap **Stock**: no new receipt appears in the **Receipts** list.

## Test 4 - Title: Receive stock in cases, with a shipping cost

### What will be tested?
On the **Stock** screen you will record a delivery of Paracetamol from Test Pharma Supply that came in
2 cases of 3 cups, with a delivery fee. A pass means every cup gets its own pack row, the delivery fee is
added to the receipt's total, and the fee is **not** added to the cost of a tablet.

### What do you need before starting?
- Tests 1 and 2 done.

### Steps
1. Open the side menu, tap **Stock**, and tap **Receipts** in the switch at the top.
2. Tap **Stock receipt** (with a plus sign) at the top right. The form opens on **Step 1 of 7**, **Supplier**.
3. Look at the **Date received** field.
4. Tap the **Supplier** field and choose **Test Pharma Supply**.
5. Tap the **Date received** field and pick today.
6. Type `DR-1001` in the **Invoice / DR No.** field.
7. Type `60` in the **Shipping cost** field.
8. Tap **Next** at the bottom. **Unit Load** opens, marked **Optional**.
9. Tap **Skip tier**. **Pallet** opens.
10. Tap **Skip tier**. **Case** opens.
11. Type `2` in **Received cases**, `3` in **Packs per case** and `150` in **Cost per case**.
12. Look at **Total cost** and **Total packs** below.
13. Tap **Next**. **Pack** opens.
14. Turn on **Restock item** (it reads **Restock an existing item**) and choose **Paracetamol 500mg** in **Item**.
15. Look at the **Pack quantity**, **Received packs** and **Cost per pack** fields.
16. Type `LOT-A1` in the **Lot / batch number** field.
17. Tap the **Expiration date** field and pick a date 60 days from today.
18. Tap **Next**. **Base Unit** opens.
19. Look at **Base units qty**, **Cost per tablet** and **Total tablet from packs**.
20. Tap **Next**. **Review** opens.
21. Look at the **Shipping cost** row, the total, and the grey line at the bottom.
22. Tap **Save receipt**.

### What's the expected output?
- After step 3 **Date received** is empty, and the labels of **Supplier** and **Date received** have no **(REQUIRED)**.
- After step 12, **Total cost** reads 300 and **Total packs** reads **6**.
- After step 14, **Pack name**, **SKU**, **Pack type** and **Sell by** are filled from the item and greyed out.
- After step 15 **Pack quantity** and **Cost per pack** are greyed out and read **From Case tier: 6** and
  **From Case tier: 50.00**. **Received packs** is empty and can be typed in.
- After step 19 **Base units qty** reads **12** and is greyed out, **Total tablet from packs** reads **72**,
  and **Cost per tablet** is empty with a grey **4.17** inside it (50 ÷ 12 — the shipping cost is not in it).
- After step 21 **Shipping cost** reads 60, the total reads **360**, and the grey line reads
  **Shipping cost is in the total, and in no product's cost.**
- After step 22 the receipt's own page opens; its code starts **RC-** and its status reads **Full**.
- Back on **Stock → Receipts**, a row shows **Paracetamol 500mg** with lot **LOT-A1**, **72 / 72 tablet** and **Full**.
  Tapping the row opens it: **Case CS-…** twice, each with three pack rows starting **PK-**, each
  **Sealed** with **12/12**.

## Test 5 - Title: A short delivery with no lot number and a typed cost

### What will be tested?
You will receive a delivery of Paracetamol that should have held 2 cups but only 1 arrived, with no lot
number, and type the cost per tablet yourself. A pass means only the cup that arrived is counted, the
lot saves with no number, the typed cost is kept as typed, and the sooner-expiring cup becomes the next pick.

### What do you need before starting?
- Test 4 done.

### Steps
1. On **Stock → Receipts**, tap **Stock receipt**.
2. Choose **Test Pharma Supply** in **Supplier**, pick today in **Date received**, then tap **Next**.
3. Tap **Skip tier** three times, until **Pack** opens.
4. Turn on **Restock item** (it reads **Restock an existing item**) and choose **Paracetamol 500mg** in **Item**.
5. Type `2` in **Pack quantity**, `1` in **Received packs** and `48` in **Cost per pack**.
6. Leave **Lot / batch number** empty. Check it shows the grey words **Leave blank for none**.
7. Pick an **Expiration date** 30 days from today.
8. Tap **Next**. **Base Unit** opens.
9. Type `11` in **Base units qty received**.
10. Type `4` in **Cost per tablet**.
11. Look at **Total tablet from packs**.
12. Tap **Next**. **Review** opens.
13. Tap **Save receipt**.
14. Open the side menu and tap **Inventory**.
15. Tap the arrow at the left of the **Paracetamol 500mg** row.

### What's the expected output?
- After step 11 **Total tablet from packs** reads **12** (one cup that arrived, not two).
- On the review, **Lot / batch** reads **—**, **Pack quantity** reads **2**, **Received packs** reads **1**,
  and **Cost per tablet** reads **4.00**.
- On the Inventory list, **Paracetamol 500mg** reads **84 tablet** (72 + 12).
- After step 15 the row opens onto two lots. The one expiring in 30 days is listed first, and shows **—**
  where a lot number would be.
- In that lot, its one pack reads **Sealed** with **12/12**, and carries the red **Next pick** tag.
- The lot's line reads **12 tablet left · 1 active**.

## Test 6 - Title: A receipt with no supplier and no date

### What will be tested?
You will record stock that arrived without paperwork: no supplier, no date and no lot number. A pass
means the receipt saves with today's date, and a second lot with no number is accepted.

### What do you need before starting?
- Test 5 done.

### Steps
1. On **Stock → Receipts**, tap **Stock receipt**.
2. Leave every field on **Supplier** empty and tap **Next**.
3. Tap **Skip tier** three times, until **Pack** opens.
4. Turn on **Restock item** and tap **Next** without choosing an item. Then choose **Paracetamol 500mg** in **Item**.
5. Type `1` in **Pack quantity** and `48` in **Cost per pack**. Leave **Lot / batch number** empty.
6. Pick an **Expiration date** 120 days from today.
7. Tap **Next** until **Review**.
8. Look at the **Supplier** row.
9. Tap **Save receipt**.

### What's the expected output?
- After step 2 the form moves on to **Unit Load** with no red message.
- In step 4, **Next** stays on **Pack** and **Choose the item to restock.** shows in red under **Item**.
  There is no **+ New item** in the **Item** list.
- After step 8 the **Supplier** row reads **—**.
- After step 9 the receipt's page opens, dated today, with no supplier named. No message says the lot
  number is already used, even though Test 5's lot also has none.
- On **Inventory**, **Paracetamol 500mg** now reads **96 tablet**.

## Test 7 - Title: Several products on one receipt

### What will be tested?
You will receive two different items on one receipt using the product list. A pass means each item
gets its own line, and a brand-new item made on the receipt appears in Inventory.

### What do you need before starting?
- Test 1 done.

### Steps
1. On **Stock → Receipts**, tap **Stock receipt**, choose **Test Pharma Supply**, pick today's date, tap
   **Next**, and **Skip tier** three times.
2. On **Pack**, turn on the switch so it reads **This pack has other products / variants in it**.
3. Tap **Add product / variant**. An editor box opens.
4. Turn on **Restock item** (it reads **Restock an existing item**) and choose **Paracetamol 500mg** in **Item**, type `2` in **Pack quantity** and `48` in **Cost per pack**, and pick an **Expiration date** 90 days from today.
5. Tap **Save to list**. Paracetamol appears as a row.
6. Tap **Add product / variant** again.
7. Leave **Restock item** off (it reads **New item**). Type `Amoxicillin 250mg` in **Pack name** and tap **Auto-generate** on **SKU**.
   Turn on **Variant**, tap the **Variant group name** field, tap **New group**, type `Amoxicillin`, and type `250mg` in **Variant name**.
8. Tap **Base unit** under **Sell by**. A **Base unit details** part appears inside the editor.
9. Type `capsule` in **Base unit type** and `10` in **Base units qty**.
10. Type `3` in **Pack quantity**, `85` in **Cost per pack**, and pick an **Expiration date**.
11. Tap **Save to list**.
12. Tap **Next** until **Review**, then **Save receipt**.
13. Open **Inventory**.

### What's the expected output?
- After step 8 the **Base unit details** part appears in the editor as soon as **Base unit** is tapped.
- The review lists both products, each with its own cost per unit.
- After step 13 Inventory lists **Amoxicillin 250mg** with **30 capsule**, under the **Amoxicillin** group, and **Paracetamol 500mg** is 24 tablets higher than before step 1.

## Test 8 - Title: Change an item's type from the list

> Retired by inventory.md Test 1.

### What will be tested?
On a **tablet**, you will change Rice from Component to Both on the Inventory list. A pass means a
draft for it appears on the Products screen, waiting for a price.

### What do you need before starting?
- Test 3 done, on a tablet.

### Steps
1. Open **Inventory**. Find the **Rice 5kg** row; its type chip reads **Component**.
2. Tap that chip. A menu opens with **Sellable**, **Component** and **Both**.
3. Tap **Both**.
4. Open the side menu and tap **Products**.

### What's the expected output?
- The chip on the Rice row now reads **Both**.
- On **Products**, a row **Rice 5kg (sack)** shows as a draft with **Needs price**.

## Test 9 - Title: Price a draft so it can be sold

> Retired by assets.md Test 12.

### What will be tested?
You will give Paracetamol's tablet draft a price and publish it, with no category. A pass means it
becomes an active product — the only kind the Register will sell — and Category is not required.

### What do you need before starting?
- Test 2 done.

### Steps
1. On **Products**, tap **Paracetamol 500mg (tablet)**. Its page opens.
2. Look under the price: a grey line reads **From Inventory: Paracetamol 500mg**.
3. Tap **Edit**. **Category** has no "(required)" mark; leave it blank. Type `8` as the selling price.
4. Tap **Save as active**.

### What's the expected output?
- It saves with no category error.
- The product page shows the price 8 and status **Active**; **Needs price** is gone.
- On the Inventory page of Paracetamol, **Selling as** shows **Active · 8.00**.

## Test 10 - Title: Bring back a deleted draft with Add from Inventory

> Retired by assets.md Test 3.

### What will be tested?
You will delete Rice's draft and bring it back. A pass means **Add from Inventory** only offers items
that are missing a draft, and picking one makes it again.

### What do you need before starting?
- Test 8 done.

### Steps
1. On **Products**, long-press **Rice 5kg (sack)** and tap **Delete** in the bar that appears; confirm.
2. Tap **Add from Inventory** at the top. An **Add from Inventory** window opens.
3. Look at the list.
4. Tap **Rice 5kg**.

### What's the expected output?
- After step 3 the list shows **Rice 5kg** and does not show **Paracetamol 500mg** (it already has its draft).
- After step 4 the window closes and the edit form of **Rice 5kg (sack)** opens, ready for a price.

## Test 11 - Title: Write off damaged stock

### What will be tested?
On an item's page you will write off 2 tablets from one pack. A pass means the write-off form opens as a
full page, the count goes down, and the item's **History** records why.

### What do you need before starting?
- Test 5 done.

### Steps
1. On **Inventory**, tap the name **Paracetamol 500mg**. Its page opens.
2. Under **Lots**, find lot **LOT-A1** (expiring in 60 days, from Test 4) and tap the **⋮** button on the right of a pack there that reads **Sealed**.
3. Tap **Write off** in the menu.
4. Look at the screen that opens.
5. Type `2` in the quantity field.
6. Tap the **Damaged** reason.
7. Tap **Write off** at the bottom.

### What's the expected output?
- After step 4 a **Write off** page fills the whole screen, with a back arrow at the top left.
- After step 7 you are back on Paracetamol's page, and that pack now reads **Open** with **10/12**.
- The amount at the top of the page is 2 tablets lower than before step 1.
- **History** has a new line at the top: **Written off**, with the pack code and **damaged**, and **−2 tablet** in red.

## Test 12 - Title: Return stock to the supplier

### What will be tested?
You will return a sealed cup of Paracetamol to the supplier. A pass means the pack empties, and that
stock added in Inventory cannot be returned.

### What do you need before starting?
- Test 11 done.

### Steps
1. On Paracetamol's page, in lot **LOT-A1**, tap **⋮** on a **Sealed** pack and tap **Return to supplier**.
2. Type `12` and tap **Return to supplier**.
3. Open **Rice 5kg**'s page and tap **⋮** on one of its packs from the **Added in Inventory** lot.

### What's the expected output?
- After step 2 that pack reads **Empty** and fades; the on-hand amount is 12 tablets lower.
- After step 3 **Return to supplier** is greyed out in the menu.

## Test 13 - Title: Show and hide empty packs

### What will be tested?
A pass means used-up packs are hidden until asked for.

### What do you need before starting?
- Test 12 done.

### Steps
1. On **Inventory**, open the Paracetamol row's arrow.
2. Look for the pack emptied in Test 12.
3. Tap **Filters** beside the search box, turn on **Show empty packs**, and tap **Done**.
4. Tap the **x** on the **Showing empty packs** chip under the search box.

### What's the expected output?
- After step 2 the empty pack is not listed.
- After step 3 it is listed, faded, reading **Empty** and **0/12**. **Filters · 1** shows on the button,
  and a **Showing empty packs** chip sits under the search box.
- After step 4 the chip is gone, the button reads **Filters**, and the empty pack is hidden again.

## Test 14 - Title: Filters on the Inventory list

### What will be tested?
A pass means the list can be narrowed by where stock came from and by type, from one **Filters**
panel, with each filter that is on shown as a chip.

### What do you need before starting?
- Tests 3–7 done.

### Steps
1. On **Inventory**, look at the row under the title: a search box, **Filters** and **Sort: Name**. There is
   no **Category** filter.
2. Tap **Filters**. Under **Source** tap **In Inventory**. Tap **Done**.
3. Tap **Filters** again. Under **Source** tap **Via Stock**. Tap **Done**.
4. Tap **Filters**. Under **Source** tap **All**, under **Type** tap **Sellable**, and turn on **Low stock only**.
   Tap **Done**.
5. Tap **Clear all** under the search box.

### What's the expected output?
- On a phone, step 2 opens a sheet from the bottom; on a tablet, a box in the middle of the screen.
- After step 2 only **Rice 5kg** shows, a **Added in Inventory** chip sits under the search box, and the
  button reads **Filters · 1**.
- After step 3 **Paracetamol 500mg** and **Amoxicillin 250mg** show, **Rice 5kg** does not, and the chip
  reads **Received via Stock**.
- After step 4 only Sellable items at or under their re-order point show, with two chips: **Sellable** and
  **Low stock only**. The button reads **Filters · 2**.
- After step 5 every item is back, there are no chips, and the sort is still **Name**.

## Test 15 - Title: Void a receipt nothing has been taken from

### What will be tested?
A pass means a mistaken receipt can be cancelled while none of its stock has moved, and its stock
leaves the counts.

### What do you need before starting?
- Test 7 done, with nothing sold or written off from that receipt.

### Steps
1. On **Stock → Receipts**, tap the **Amoxicillin 250mg** row, then **Open receipt**.
2. Tap **Void** at the top. Type `Entered by mistake` as the reason and confirm.

### What's the expected output?
- The receipt page shows a red **Voided** box with the reason.
- On **Inventory**, **Amoxicillin 250mg** reads **0 capsule**, and **Paracetamol 500mg** is 24 tablets lower than before step 1.

## Test 16 - Title: Edit sample item 1

### What will be tested?
A pass means an item's details can change, but its base unit and units per pack cannot while stock is on
hand, and an edit has no **Quantity on hand**.

### What do you need before starting?
- Test 5 done, on a phone.

### Steps
1. On Paracetamol's page, tap **Edit**. The form opens on **Pack**.
2. Look at the step count at the top, the **Sell by** buttons, and the bottom of the step.
3. Tap **Next** twice (via **Variant**). **Base unit** opens.
4. Look at the **tablet per cup** field.
5. Tap the back arrow beside the step name twice, to go back to **Pack**.
6. Change **Storage location** to `Pharmacy shelf 2`.
7. Tap **Next** until **Review**, then tap **Save changes**.

### What's the expected output?
- After step 2 the form reads step 1 of **4**. Under **Sell by**, **Pack** is greyed out (the hint says it is
  locked while stock is on hand), and there is no **Quantity on hand** part at the bottom.
- After step 4 the **tablet per cup** field is greyed out with the hint **Locked while stock is on hand**, and
  there is no **Loose tablet on hand** field.
- After step 7 the page shows **Location** as **Pharmacy shelf 2**.

## Test 17 - Title: Edit sample item 2

### What will be tested?
A pass means Rice's details can be changed and saved from its edit form.

### What do you need before starting?
- Test 3 done.

### Steps
1. On Rice's page, tap **Edit**. The form opens on **Pack**.
2. Under **Stock settings**, type `2` in **Re-order at**.
3. Look at the **Description** field at the end of **Stock settings**.
4. Tap **Next** until **Review**, then **Save changes**.

### What's the expected output?
- After step 3 there is a **Description** field and no **Notes** field; the form has no **Extra** step.
- After step 4 the page shows **Reorder at** as **2 sack**.

## Test 18 - Title: Archive and delete both sample items

### What will be tested?
A pass means an item with stock cannot be archived, and an item with a history cannot be deleted —
only archived once it is empty.

### What do you need before starting?
- Tests 2 and 3 done.

### Steps
1. On Paracetamol's page, tap **Archive**.
2. On Rice's page, write off all its packs (Test 11's steps, the full amount), then tap **Archive**.
3. On the Inventory list, long-press **Rice 5kg** and tap **Delete**; confirm.

### What's the expected output?
- After step 1 a message says the item can be archived only once its stock is gone; nothing changes.
- After step 2 Rice leaves the list (it is archived).
- After step 3 a message says the item has stock history and cannot be deleted.

## Test 40 - Title: Browse Inventory by folder

### What will be tested?
A pass means categories and variant groups show as folders you open and back out of, and a search
ignores them.

### What do you need before starting?
- Test 23 done: **Gauze 5cm** and **Gauze 10cm** in the **Gauze** group, filed under **Supplies**.

### Steps
1. On **Inventory**, look at the top of the list.
2. Tap the **Supplies** folder.
3. Tap the **Gauze** folder.
4. Tap **Supplies** in the line above the list (**Inventory › Supplies › Gauze**).
5. Open **Gauze** again, then press the phone's back button twice.
6. Open **Supplies** › **Gauze**, then tap **Home** in the rail or drawer and come back to **Inventory**.
7. Type `gauze` in the search box.

### What's the expected output?
- After step 1 folders come first — **Supplies** reading **2 items** — then the items with no category,
  such as **Paracetamol 500mg** and **Rice 5kg**. There are no **Standalone items** heading and no
  open/close group headers.
- After step 2 the list holds only the **Gauze** folder (**2 items**), with **Inventory › Supplies** above it.
- After step 3 the two rows read **5cm** and **10cm**, with **Inventory › Supplies › Gauze** above them.
- After step 4 you are back in **Supplies**.
- After step 5 the first back shows **Supplies**, the second the top of **Inventory** — the app does not
  leave Inventory.
- After step 6 Inventory opens at the top level, not inside **Gauze**.
- After step 7 both Gauze items show in one flat list with their full names, with no folders and no
  **Inventory ›** line.

## Test 41 - Title: Filters stay on inside a folder

### What will be tested?
A pass means a filter set at the top of Inventory still applies inside every folder, and in its sheet.

### What do you need before starting?
- Test 40 done.

### Steps
1. On **Inventory**, tap **Filters**, under **Type** tap **Component**, and tap **Done**.
2. Open the **Supplies** folder, if it still shows.
3. Tap **Filters** inside the folder.
4. Tap **Done**, then tap **Clear all**, then press back.

### What's the expected output?
- After step 1 a **Component** chip shows, and a folder shows only if a Component item is inside it.
- After step 2 the **Component** chip is still there.
- After step 3 **Type** has **Component** selected.
- After step 4 the top of Inventory has no chips either.

## Test 42 - Title: Browse Stock receipts by folder

### What will be tested?
A pass means Stock's receipt lines sit in the same category and variant group folders as Inventory.

### What do you need before starting?
- Tests 4–7 done, and at least one received item filed under a category (edit one and pick
  **Supplies** if none is).

### Steps
1. Open **Stock**, on **Receipts**.
2. Tap the category folder.
3. Open a line's arrow.
4. Press back.

### What's the expected output?
- After step 1 folders come first, each with how many receipt lines it holds, then the lines with no
  category, newest first.
- After step 2 **Stock › <category>** shows above the lines, newest first.
- After step 3 the line opens onto its cases and packs, as before.
- After step 4 you are at the top of **Stock**.

---

## Group 2 — Mistakes and edge cases

## Test 19 - Title: A supplier without a date, and a date without a supplier

### What will be tested?
A pass means the **Supplier** step can be left empty, a supplier and a date received always go
together (filling one asks for the other), and both can be emptied again after being filled.

### What do you need before starting?
- Test 1 done, on **Stock → Receipts**.

### Steps
1. Tap **Stock receipt**. Choose **Test Pharma Supply** in **Supplier**, leave **Date received** empty, and tap **Next**.
2. Look under **Date received**.
3. Press the phone's Back button, tap **Discard**, and tap **Stock receipt** again.
4. Pick today in **Date received**, leave **Supplier** empty, and tap **Next**.
5. Look under **Supplier**.
6. Choose **Test Pharma Supply** in **Supplier**, then open **Supplier** again and choose **No supplier** at the top of the list.
7. Tap **Clear** beside **Date received**.
8. Tap **Next**.

### What's the expected output?
- After step 2 the form stays on **Supplier**, and **Enter the date the stock arrived.** shows in red under **Date received**.
- After step 5 the form stays on **Supplier**, and **Choose the supplier, or clear the date.** shows in red under **Supplier**.
- After step 6 **Supplier** reads **No supplier**. After step 7 **Date received** is empty and **Clear** is gone.
- After step 8 the form moves on to **Unit Load** with no red message.

## Test 20 - Title: An expiring item received without a date

### What will be tested?
A pass means an item that expires cannot be received without its expiration date.

### What do you need before starting?
- Test 2 done.

### Steps
1. Start a receipt, tap **Next** on **Supplier**, skip the three tiers, choose **Paracetamol 500mg**, type `1` in **Pack quantity** and `48` in **Cost per pack**.
2. Leave **Expiration date** empty and tap **Next**.

### What's the expected output?
- **Enter the expiration date.** shows in red under the field, and the form does not move on.

## Test 21 - Title: No pack quantity

### What will be tested?
A pass means a delivery always says how many packs it should hold, unless the **Case** step already says it.

### What do you need before starting?
- Test 2 done.

### Steps
1. Start a receipt, tap **Next** on **Supplier**, skip the three tiers, and choose **Paracetamol 500mg**.
2. Check the **Pack quantity** label ends in **(REQUIRED)** and **Received packs** does not.
3. Type `48` in **Cost per pack**, pick an **Expiration date**, leave **Pack quantity** and **Received packs** empty, and tap **Next**.

### What's the expected output?
- **Enter how many packs this delivery holds.** shows in red under **Pack quantity**, and the form stays on **Pack**.

## Test 22 - Title: Save an item with a step left unfinished

### What will be tested?
On the step-by-step item form, a pass means a save that is missing something takes you back to the
step holding the problem, instead of failing quietly.

### What do you need before starting?
- On the **Inventory** screen, on a phone.

### Steps
1. Tap **Add item**. Type `Test syrup` in **Pack name** and tap **Auto-generate** next to **SKU**.
2. Under **Sell by**, tap **Base unit**. Tap **Next**, **Skip step** on **Variant**, and on **Base unit** clear the units-per-pack field.
3. Tap **Next** until **Review**, using **Skip step** on the optional steps.
4. Tap **Save item**.

### What's the expected output?
- After step 4 the form jumps back to **Base unit**, and **Enter how many base units one pack holds.**
  shows in red under the units-per-pack field.
- A red line near the buttons says some fields need attention. No item named **Test syrup** is on the Inventory list.

## Test 23 - Title: A variant takes its group's category

### What will be tested?
A pass means a variant group owns one category: the first item saved into it sets it, and every later
variant is filed under it, whatever was picked before.

### What do you need before starting?
- On the **Inventory** screen, on a phone. Two inventory categories exist, `Medicines` and `Supplies`
  (create them from the **Category** field's **New category** row if not).

### Steps
1. Tap **Add item**. Type `Gauze 5cm` in **Pack name** and tap **Auto-generate** next to **SKU**.
2. Pick **Supplies** as the **Category**. Tap **Next**.
3. On **Variant**, turn the switch on (**This is a variant**). In **Variant group name** tap **New group**, type `Gauze`. Type `5cm` in **Variant name**.
4. Tap **Next** until **Review**, then **Save item**.
5. Back on Inventory, tap **Add item**. Type `Gauze 10cm`, tap **Auto-generate** next to **SKU**, and pick **Medicines** as the **Category**.
6. Tap **Next**. Turn **Variant** on, choose **Gauze** in **Variant group name**, type `10cm` in **Variant name**. Look under the group field.
7. Tap the back arrow beside the step name, to go back to **Pack**. Look at **Category**.
8. Tap **Next** until **Review**, then **Save item**.

### What's the expected output?
- After step 6 the hint under **Variant group name** reads **Filed under Supplies**.
- After step 7 **Category** shows **Supplies**, greyed out, with the hint **Set by the variant group**.
- After step 8 both Gauze items show the category **Supplies** on their pages. Neither is under **Medicines**.
- No item was saved with a typed quantity, and both read **0** on hand.

## Test 24 - Title: More serial numbers than packs

### What will be tested?
A pass means each serial number belongs to one pack.

### What do you need before starting?
- Test 2 done.

### Steps
1. On a receipt's **Pack** step, type `1` in **Pack quantity** and `SN-1, SN-2` in **Serial numbers**, then tap **Next**.

### What's the expected output?
- **More serial numbers than packs.** shows in red under **Serial numbers**.

## Test 25 - Title: Write off more than a pack holds

### What will be tested?
A pass means stock never goes below zero.

### What do you need before starting?
- Test 11 done.

### Steps
1. On a pack reading **10/12**, choose **Write off**, type `11` and tap **Write off**.

### What's the expected output?
- The **Write off** page stays open with **That is more than is left here. Enter a smaller amount.**

## Test 26 - Title: Adjust without a note

### What will be tested?
A pass means every count correction says why.

### What do you need before starting?
- Any item with stock.

### Steps
1. On any pack, choose **Adjust count**, type `-1`, leave the **Note** field empty and tap **Adjust count**.

### What's the expected output?
- **Say why the count changed.** shows in red under the note.

## Test 27 - Title: Duplicate SKU or lot number

### What will be tested?
A pass means two items cannot share a SKU and two deliveries cannot share a lot number — while any
number of deliveries can have no lot number (Tests 5 and 6).

### What do you need before starting?
- Tests 2 and 4 done.

### Steps
1. Add an inventory item and type Paracetamol's SKU in **SKU**; go to **Review** and tap **Save item**.
2. Start a receipt for Paracetamol and type `LOT-A1` (Test 4's lot number) in **Lot / batch number**; save it.

### What's the expected output?
- After step 1: **Another product already uses this SKU.** near the buttons; nothing saved.
- After step 2: **Another delivery already uses this lot number. Change it, or leave it blank.** near the buttons; nothing saved.

## Test 28 - Title: Back button and double-tap

> Retired by stock.md Test 1, and inventory-assets.md Tests 1 and 4.

### What will be tested?
A pass means a half-typed receipt is not lost by accident, one tap saves one receipt, and the Back
button steps back the way you came from an item's product, instead of jumping to Home.

### What do you need before starting?
- Test 1 and Test 2 done, so sample item 1 has a product under **Selling as**.

### Steps
1. Start a receipt, choose a supplier, then press the phone's Back button.
2. Tap **Keep editing** (or cancel) in the window that asks about unsaved changes.
3. Finish the receipt and tap **Save receipt** twice quickly.
4. Open **Inventory** from the side menu, and tap sample item 1 in the list. Its page opens (on a
   tablet, beside the list).
5. Under **Selling as**, tap the product row (it may read **Needs price**). The **Products** screen
   opens on that product's page.
6. Press the phone's Back button once.
7. Press the phone's Back button again.
8. Tap **Products** in the side menu.
9. Tap **Inventory** in the side menu.

### What's the expected output?
- After step 1 a window asks whether to discard the receipt.
- After step 3 only one new receipt appears in the **Receipts** list.
- After step 6 you are on the **Products** list — not on Home.
- After step 7 you are back on **Inventory** — not on Home.
- After step 8 **Products** opens on its list, not on the product from step 5.
- After step 9 **Inventory** shows its list with no item open beside it and no row highlighted.

## Test 29 - Title: Void a receipt stock was already taken from

### What will be tested?
A pass means a receipt cannot be cancelled once any of its stock moved.

### What do you need before starting?
- Test 11 done (a write-off from Test 4's receipt).

### Steps
1. Open Test 4's receipt and tap **Void**, give a reason and confirm.

### What's the expected output?
- The window says the stock has already moved; the receipt stays **Partial**.

---

## Group 3 — Accounts

## Test 30 - Title: Sign out while on Inventory

### What will be tested?
A pass means signing out never freezes the screen.

### What do you need before starting?
- Signed in.

### Steps
1. On **Inventory**, go to Profile and tap **Sign Out**.

### What's the expected output?
- The sign-in screen appears.

## Test 31 - Title: A different account sees none of this stock

> Retired by inventory.md Test 2, stock.md Test 2 and assets.md Test 9.

### What will be tested?
The most important test here. A pass means a second person never sees the first person's items,
suppliers or receipts, not even for a moment.

### What do you need before starting?
- Test 30 done.

### Steps
1. Sign in with a different Google or Facebook account and open its system.
2. Open **Inventory**, **Stock → Receipts**, **Stock → Suppliers** and **Products → Add from Inventory**.

### What's the expected output?
- None of **Paracetamol 500mg**, **Rice 5kg**, **Test Pharma Supply** or the receipts appear on any screen, at any moment.

## Test 32 - Title: Sign back in as the first account

> Retired by inventory.md Test 2 and stock.md Test 2.

### What will be tested?
A pass means the first person's stock is all still there.

### What do you need before starting?
- Test 31 done.

### Steps
1. Sign out, and sign in again with the first account.

### What's the expected output?
- **Inventory**, **Stock** and **Products** show the same items, counts and receipts as before.

## Test 33 - Title: Delete the account

### What will be tested?
A pass means deleting the account removes everything; signing up again starts empty.

### What do you need before starting?
- A throwaway account.

### Steps
1. Use a throwaway account with one item and one receipt. On Profile, tap **Delete account** and confirm.
2. Sign in again with the same account and create a system.

### What's the expected output?
- After step 1 you land on sign-in. After step 2 **Inventory** and **Stock** are empty.

---

## Group 4 — Outside the app

## Test 34 - Title: Internet drops while saving a receipt

### What will be tested?
A pass means a save made offline shows a clear offline message, not an endless spinner, and lands once
internet returns.

### What do you need before starting?
- Test 1 done.

### Steps
1. Fill in a receipt up to **Review**. Turn on airplane mode. Tap **Save receipt**.
2. Turn airplane mode off.

### What's the expected output?
- After step 1 an offline message shows under the buttons.
- After step 2 the receipt saves and its page opens; only one receipt is added.

## Test 35 - Title: Open Inventory in airplane mode

### What will be tested?
A pass means the screen explains it is offline instead of showing a blank screen.

### What do you need before starting?
- Any item.

### Steps
1. Close the app, turn on airplane mode, open the app and go to **Inventory**; open a row's arrow.

### What's the expected output?
- An offline message shows where packs would be, not a spinner that never stops.

## Test 36 - Title: Phone switched off mid-receipt, app swiped away, left in the background

### What will be tested?
A pass means nothing is ever half-saved, and the person stays signed in.

### What do you need before starting?
- Test 1 done.

### Steps
1. Fill half a receipt and switch the phone off. Switch it on and open the app.
2. Swipe the app away from recent apps and reopen it.
3. Leave the app in the background for 10 minutes, then return to **Inventory**.

### What's the expected output?
- After step 1 you are still signed in and no half receipt exists in **Receipts**.
- After steps 2 and 3 you are still signed in and the screens work without signing in again.

## Test 37 - Title: A call or notification mid-form

### What will be tested?
A pass means what was typed is kept, on whichever step of the item form you were on.

### What do you need before starting?
- Signed in.

### Steps
1. Start an inventory item, fill **Pack name** and **SKU**, tap **Next**, turn **Variant** on and type a **Variant name**, then take a call or open a notification, and come back.

### What's the expected output?
- The form is still on **Variant** with the typed fields there, and **Pack** still holds what was typed.

## Test 38 - Title: Storage almost full, and a wrong clock

### What will be tested?
A pass means the app still opens and saves; note any message a wrong clock causes at sign-in.

### What do you need before starting?
- A phone with almost no free storage.

### Steps
1. With storage nearly full, add an item and save a receipt.
2. Set the phone's clock a few minutes wrong and sign in with Google.

### What's the expected output?
- After step 1 both save. After step 2 write down any message shown.

## Test 39 - Title: Phone and tablet

> Retired by inventory.md Test 3, stock.md Test 3, assets.md Test 13 and home.md Test 1.

### What will be tested?
A pass means the tablet shows the wide layouts and the phone the narrow ones, and that the create forms
open as a full page on both.

### What do you need before starting?
- Tests 1–7 done, with both a phone and a tablet signed in to the same account.

### Steps
1. On a tablet open **Stock → Receipts** and **Stock receipt**; then **Inventory** and tap an item's name.
2. On the tablet, tap **Add item** on **Inventory**.
3. On the tablet, open **Stock → Suppliers** and tap **Add supplier**; go back, then on an item's page tap **⋮** on a pack and **Adjust count**.
4. On the tablet, open **Products → Setup** and tap **New category**; go back, then on the home screen tap **Create New System**.
5. Do steps 1–4 on a phone.

### What's the expected output?
- Tablet: receipts in a table with columns **Date / Receipt** to **Location**; the receipt form shows every
  step on the left and the **Review** on the right; Inventory rows show a type chip, cost and value, and an
  opened item appears beside the list.
- Tablet, step 2: the item form lists its steps down the left (**Pack** to **Review**, with
  **Opt** beside the optional ones) and the open step on the right, with **Save item** at the top right.
- Tablet, steps 3 and 4: **New supplier**, **Adjust count**, **New category** and the create-system form
  each fill the whole screen with a back arrow at the top left — none opens as a box in the middle of the screen.
- Phone: receipts as cards; the receipt form goes step by step with **Next** and **Skip tier**; the item
  form goes step by step with **Next** and **Skip step**; an item opens on its own screen; the forms in
  steps 3 and 4 fill the whole screen, the same as on the tablet.
