# Inventory and Stock — acceptance tests

Covers the **Inventory** screen (its list, an item's page, and the step-by-step item form), the **Stock**
screen (**Receipts** and **Suppliers**), and the **Add from Inventory** button on **Products**: adding
items, receiving stock on a receipt, adjusting, writing off and returning stock, and voiding a receipt.
It also covers the forms that now open as a full page on both phone and tablet: new supplier, new tax
class, new category and the stock count forms.

Run the tests in order: later tests use the supplier, items and receipts earlier ones make.

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
app, the **Base unit** switch shows the tablet fields only when turned on, and the item saves with its units.

### What do you need before starting?
- Test 1 done, on a phone.

### Steps
1. Open the side menu, tap **Resources**, then **Inventory**. The Inventory list opens.
2. Tap **Add item** at the top right. A form titled **Add an inventory item** opens on **Pack info**, step 1 of 7.
3. Type `Paracetamol 500mg` in the **Pack name** field.
4. Tap **Auto-generate** on the right of the **SKU** label. A code fills the **SKU** field.
5. Tap **Auto-generate** on the right of the **Barcode** label.
6. Look at the **Barcode** field.
7. Under **Pack type**, tap **Sellable**.
8. Tap **Next** at the bottom. **Stock settings** opens.
9. Type `cup` in the **Pack unit name** field.
10. Type `Pharmacy shelf 1` in the **Storage location** field.
11. Type `20` in the **Re-order at** field.
12. Check the **Expiry** switch reads **Has an expiration date**.
13. Tap **Next**. **Base unit** opens.
14. Look at the **Base unit** switch and what is under it.
15. Tap the **Base unit** switch to turn it on.
16. Look under the switch again.
17. Under **Sell by**, check **Base unit** is chosen.
18. Type `tablet` in the **Base unit type** field.
19. Type `12` in the field below it, now labelled **tablet per cup**.
20. Tap **Next**. **Stock on hand** opens, marked **Optional**.
21. Check the switch reads **No stock yet**, then tap **Skip step** at the bottom. **Variant setup** opens.
22. Tap **Skip step**. **Extra** opens; it has only a **Description** field.
23. Tap **Next**. **Review** opens.
24. Tap **Save item** at the bottom of the screen.

### What's the expected output?
- After step 6 the **Barcode** field holds 13 digits starting with **2**. Tapping **Auto-generate** again
  gives a different 13-digit number, also starting with **2**.
- After step 14 the switch reads **Sold and counted by the pack only**, and there is nothing under it.
- After step 16 the switch reads **Sold or used by the base unit**, and **Sell by** (with **Base unit**
  and **Both**), **Base unit type** and a units-per-pack field have appeared under it.
- After step 23 the review lists **Paracetamol 500mg**, **Sell by: Base unit**, **Units per pack: 12 tablet
  per cup**, and no **Opening stock** line.
- After step 24 the form closes and the item's own page opens, with **Paracetamol 500mg** at the top.
- Near the top of that page the amount on hand reads **0 cup**, and **Lots (0)** further down says no
  packs yet.
- In the item's details: **Sell by** reads **Base unit**, **Per pack** reads **1 cup = 12 tablet**,
  **Reorder at** reads **20 tablet**, and **Location** reads **Pharmacy shelf 1**.
- A **Selling as** part lists **Paracetamol 500mg (tablet)** with a red **Needs price** on its right.

## Test 3 - Title: Add sample item 2 — rice with stock on hand, no supplier

### What will be tested?
On the **Inventory** screen you will create rice sold by the sack, and type how many sacks are already
on the shelf. A pass means the item has stock straight away, marked as added in Inventory, with no
supplier or receipt behind it.

### What do you need before starting?
- On the **Inventory** screen, on a phone.

### Steps
1. Tap **Add item** at the top right. The **Add an inventory item** form opens on **Pack info**.
2. Type `Rice 5kg` in the **Pack name** field.
3. Tap **Auto-generate** next to **SKU**.
4. Under **Pack type**, tap **Component**.
5. Tap **Next**. On **Stock settings**, type `sack` in the **Pack unit name** field.
6. Turn the **Expiry** switch off, so it reads **Does not expire**.
7. Tap **Next**. On **Base unit**, leave the switch off (**Sold and counted by the pack only**).
8. Tap **Next**. On **Stock on hand**, tap the switch so it reads **Add opening stock**.
9. Type `5` in the **sack on hand** field.
10. Type `250` in the **Cost per sack** field.
11. Tap **Next**, then **Skip step** on **Variant setup**, then **Next** on **Extra**.
12. On **Review**, tap **Save item**.

### What's the expected output?
- After step 8 the **sack on hand** and **Cost per sack** fields appear under the switch; there is no
  loose-units field, because rice is counted by the sack only.
- The review lists **Opening stock: 5 sack**.
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
14. Tap the **Restock item** field and choose **Paracetamol 500mg**.
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
4. Choose **Paracetamol 500mg** in the **Restock item** field.
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
4. Choose **Paracetamol 500mg** in **Restock item**.
5. Type `1` in **Pack quantity** and `48` in **Cost per pack**. Leave **Lot / batch number** empty.
6. Pick an **Expiration date** 120 days from today.
7. Tap **Next** until **Review**.
8. Look at the **Supplier** row.
9. Tap **Save receipt**.

### What's the expected output?
- After step 2 the form moves on to **Unit Load** with no red message.
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
4. Choose **Paracetamol 500mg** in **Restock item**, type `2` in **Pack quantity** and `48` in **Cost per pack**, and pick an **Expiration date** 90 days from today.
5. Tap **Save to list**. Paracetamol appears as a row.
6. Tap **Add product / variant** again.
7. Leave **Restock item** on **+ New item**. Type `Amoxicillin 250mg` in **Pack name** and tap **Auto-generate** on **SKU**.
8. Tap **Base unit** under **Sell by**. A **Base unit details** part appears inside the editor.
9. Type `capsule` in **Base unit type** and `10` in **Base units qty**.
10. Type `3` in **Pack quantity**, `85` in **Cost per pack**, and pick an **Expiration date**.
11. Tap **Save to list**.
12. Tap **Next** until **Review**, then **Save receipt**.
13. Open **Inventory**.

### What's the expected output?
- After step 8 the **Base unit details** part appears in the editor as soon as **Base unit** is tapped.
- The review lists both products, each with its own cost per unit.
- After step 13 Inventory lists **Amoxicillin 250mg** with **30 capsule**, and **Paracetamol 500mg** is 24 tablets higher than before step 1.

## Test 8 - Title: Change an item's type from the list

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

### What will be tested?
You will give Paracetamol's tablet draft a price and publish it. A pass means it becomes an active
product — the only kind the Register will sell.

### What do you need before starting?
- Test 2 done. At least one category exists under **Products → Setup**.

### Steps
1. On **Products**, tap **Paracetamol 500mg (tablet)**. Its page opens.
2. Look under the price: a grey line reads **From Inventory: Paracetamol 500mg**.
3. Tap **Edit**. Pick a **Category**, then type `8` as the selling price.
4. Tap **Save as active**.

### What's the expected output?
- The product page shows the price 8 and status **Active**; **Needs price** is gone.
- On the Inventory page of Paracetamol, **Selling as** shows **Active · 8.00**.

## Test 10 - Title: Bring back a deleted draft with Add from Inventory

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
3. Turn on **Show empty packs** above the list.

### What's the expected output?
- After step 2 the empty pack is not listed.
- After step 3 it is listed, faded, reading **Empty** and **0/12**.

## Test 14 - Title: Filters on the Inventory list

### What will be tested?
A pass means the list can be narrowed by where stock came from and by type.

### What do you need before starting?
- Tests 3–7 done.

### Steps
1. On **Inventory**, tap **Added in Inventory**.
2. Tap **Received via Stock**.
3. Tap **All**, then tap **Sellable** in the second row of chips.

### What's the expected output?
- After step 1 only **Rice 5kg** shows.
- After step 2 **Paracetamol 500mg** and **Amoxicillin 250mg** show, and **Rice 5kg** does not.
- After step 3 only Sellable items show.

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
hand, and an edit has no **Stock on hand** step.

### What do you need before starting?
- Test 5 done, on a phone.

### Steps
1. On Paracetamol's page, tap **Edit**. The form opens on **Pack info**.
2. Look at the step count at the top.
3. Tap **Next** twice. **Base unit** opens.
4. Look at the **Base unit** switch and the **tablet per cup** field.
5. Tap the back arrow beside the step name once, to go back to **Stock settings**.
6. Change **Storage location** to `Pharmacy shelf 2`.
7. Tap **Next** until **Review**, then tap **Save changes**.

### What's the expected output?
- After step 2 the form reads step 1 of **6**, not 7: there is no **Stock on hand** step when editing.
- After step 4 the switch and the **tablet per cup** field are greyed out with the hint **Locked while stock is on hand**.
- After step 7 the page shows **Location** as **Pharmacy shelf 2**.

## Test 17 - Title: Edit sample item 2

### What will be tested?
A pass means Rice's details can be changed and saved from its edit form.

### What do you need before starting?
- Test 3 done.

### Steps
1. On Rice's page, tap **Edit**, then **Next** to reach **Stock settings**.
2. Type `2` in **Re-order at**.
3. Tap **Next** until **Extra** and look at it.
4. Tap **Next**, then **Save changes**.

### What's the expected output?
- After step 3 **Extra** has only a **Description** field, with no **Notes** field.
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

---

## Group 2 — Mistakes and edge cases

## Test 19 - Title: A supplier without a date, and a date without a supplier

### What will be tested?
A pass means the **Supplier** step can be left empty, but a supplier and a date received always go
together: filling one asks for the other.

### What do you need before starting?
- Test 1 done, on **Stock → Receipts**.

### Steps
1. Tap **Stock receipt**. Choose **Test Pharma Supply** in **Supplier**, leave **Date received** empty, and tap **Next**.
2. Look under **Date received**.
3. Press the phone's Back button, tap **Discard**, and tap **Stock receipt** again.
4. Pick today in **Date received**, leave **Supplier** empty, and tap **Next**.
5. Look under **Supplier**.

### What's the expected output?
- After step 2 the form stays on **Supplier**, and **Enter the date the stock arrived.** shows in red under **Date received**.
- After step 5 the form stays on **Supplier**, and **Choose the supplier, or clear the date.** shows in red under **Supplier**.

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
2. Tap **Next** twice, to **Base unit**. Turn the **Base unit** switch on and leave the units-per-pack field empty.
3. Tap **Next** until **Review**, using **Skip step** on the optional steps.
4. Tap **Save item**.

### What's the expected output?
- After step 4 the form jumps back to **Base unit**, and **Enter how many base units one pack holds.**
  shows in red under the units-per-pack field.
- A red line near the buttons says some fields need attention. No item named **Test syrup** is on the Inventory list.

## Test 23 - Title: Opening stock turned on and left empty

### What will be tested?
A pass means turning on **Add opening stock** asks for the amount, and **Skip step** turns it back off.

### What do you need before starting?
- On the **Inventory** screen, on a phone.

### Steps
1. Tap **Add item**. Type `Test gauze` in **Pack name** and tap **Auto-generate** next to **SKU**.
2. Tap **Next** until **Stock on hand**. Turn the switch on so it reads **Add opening stock**, and type nothing.
3. Tap **Next** until **Review**, then tap **Save item**.
4. On the **Stock on hand** step the form opened, tap **Skip step**.
5. Tap **Next** until **Review**, then tap **Save item**.

### What's the expected output?
- After step 3 the form jumps to **Stock on hand** with **Enter the packs on hand, or turn Add opening stock off.** in red.
- After step 4 the switch reads **No stock yet** again.
- After step 5 the item saves with **0** on hand.

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

### What will be tested?
A pass means a half-typed receipt is not lost by accident, and one tap saves one receipt.

### What do you need before starting?
- Test 1 done.

### Steps
1. Start a receipt, choose a supplier, then press the phone's Back button.
2. Tap **Keep editing** (or cancel) in the window that asks about unsaved changes.
3. Finish the receipt and tap **Save receipt** twice quickly.

### What's the expected output?
- After step 1 a window asks whether to discard the receipt.
- After step 3 only one new receipt appears in the **Receipts** list.

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
1. Start an inventory item, fill **Pack info**, tap **Next**, type in **Stock settings**, then take a call or open a notification, and come back.

### What's the expected output?
- The form is still on **Stock settings** with the typed fields there, and **Pack info** still holds what was typed.

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
- Tablet, step 2: the item form lists its seven steps down the left (**Pack info** to **Review**, with
  **Opt** beside the optional ones) and the open step on the right, with **Save item** at the top right.
- Tablet, steps 3 and 4: **New supplier**, **Adjust count**, **New category** and the create-system form
  each fill the whole screen with a back arrow at the top left — none opens as a box in the middle of the screen.
- Phone: receipts as cards; the receipt form goes step by step with **Next** and **Skip tier**; the item
  form goes step by step with **Next** and **Skip step**; an item opens on its own screen; the forms in
  steps 3 and 4 fill the whole screen, the same as on the tablet.
