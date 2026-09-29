# Inventory and Stock — acceptance tests

Covers the **Inventory** screen (its list, an item's page, and the item form), the **Stock** screen
(**Receipts** and **Suppliers**), and the **Add from Inventory** button on **Products**: adding items,
receiving stock on a receipt, drawing loose units from packs, adjusting, writing off and returning
stock, and voiding a receipt.

Run the tests in order: later tests use the supplier, items and receipts earlier ones make.

A few words used throughout:

- **Pack** — what an item is bought and counted in: a cup of tablets, a sack of rice.
- **Base unit** — what a pack holds: the tablets inside the cup.
- **Loose units** — base units outside a full pack, such as 7 tablets left in an opened cup.
- **Case** — a carton of several packs, as it arrives from the supplier.
- **Lot** — everything of one item that arrived on one receipt line, with one lot number and one expiry date.
- **Next pick** — the pack the shop should take from next. The app marks it with a red **Next pick** tag.

---

## Group 1 — Normal use

## Test 1 - Title: Add a supplier

### What will be tested?
On the **Stock** screen you will add a new supplier. A pass means the supplier is saved, gets a
supplier code on its own, and can be picked when stock is received.

### What do you need before starting?
- Signed in, inside a system, internet on, on a phone.

### Steps
1. Tap the menu button at the top left to open the side menu.
2. Tap **Resources**, then **Stock**. The Stock screen opens.
3. Tap **Suppliers** in the switch at the top of the screen, next to **Receipts**.
4. Tap **Add supplier** at the top right. A **New supplier** form slides up from the bottom.
5. Type `Test Pharma Supply` in the **Supplier name** field.
6. Leave the **Code** field empty.
7. Type `7` in the **Lead time (days)** field.
8. Check the **Active — can be picked when receiving stock** switch is on.
9. Tap **Create** at the bottom of the form.

### What's the expected output?
- The **New supplier** form closes and you are back on the **Suppliers** list of the Stock screen.
- **Test Pharma Supply** is in the list with a code starting **SUP-** (for example **SUP-0001**), made
  by the app because the **Code** field was left empty.

## Test 2 - Title: Add sample item 1 — a medicine sold by the tablet

### What will be tested?
On the **Inventory** screen you will create a medicine bought in cups of 12 tablets and sold by the
tablet. A pass means the item saves with its units, and that the **Base unit** part of the form only
appears once **Sell by** is set to **Base unit**.

### What do you need before starting?
- Test 1 done.

### Steps
1. Open the side menu, tap **Resources**, then **Inventory**. The Inventory list opens.
2. Tap **Add item** at the top right. A form titled **Add an inventory item** opens.
3. Type `Paracetamol 500mg` in the **Pack name** field.
4. Tap **Auto-generate** on the right of the **SKU** label. A code fills the **SKU** field.
5. Under **Pack type**, tap **Sellable**.
6. Under **Sell by**, look: **Pack** is chosen. Scroll down and check there is no **Base unit** section.
7. Scroll back up and tap **Base unit** under **Sell by**.
8. Scroll down. A **Base unit** section has now appeared below **Stock settings**.
9. Type `cup` in the **Pack unit name** field (under **Stock settings**).
10. Type `tablet` in the **Base unit type** field (under **Base unit**).
11. Type `12` in the field below it, now labelled **tablet per cup**.
12. Type `Pharmacy shelf 1` in the **Storage location** field.
13. Type `20` in the **Re-order at** field.
14. Check the **Expiry** switch reads **Has an expiration date**.
15. Leave every field under **Stock on hand** empty.
16. Tap **Save item** at the bottom of the screen.

### What's the expected output?
- After step 6 there is no **Base unit** section; after step 8 there is one, without the screen reloading.
- After step 16 the form closes and the item's own page opens, with **Paracetamol 500mg** at the top.
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
- On the **Inventory** screen.

### Steps
1. Tap **Add item** at the top right. The **Add an inventory item** form opens.
2. Type `Rice 5kg` in the **Pack name** field.
3. Tap **Auto-generate** next to **SKU**.
4. Under **Pack type**, tap **Component**.
5. Leave **Sell by** on **Pack**.
6. Type `sack` in the **Pack unit name** field.
7. Turn the **Expiry** switch off, so it reads **Does not expire**.
8. Under **Stock on hand**, type `5` in the **sack on hand** field.
9. Type `250` in the **Cost per sack** field.
10. Tap **Save item**.

### What's the expected output?
- The item's page opens with **Rice 5kg** at the top and **5 sack** on hand.
- Under **Lots (1)** there is one lot with the grey words **Added in Inventory**, and five packs under it.
- There is no **Selling as** part (a Component is not sold on its own).
- Open the side menu and tap **Stock**: no new receipt appears in the **Receipts** list.

## Test 4 - Title: Receive stock in cases with freight

### What will be tested?
On the **Stock** screen you will record a delivery of Paracetamol from Test Pharma Supply that came in
2 cases of 3 cups, with a delivery fee. A pass means every cup gets its own pack row, and the cost per
tablet includes the delivery fee.

### What do you need before starting?
- Tests 1 and 2 done.

### Steps
1. Open the side menu, tap **Stock**, and tap **Receipts** in the switch at the top.
2. Tap **New stock receipt** at the top right. The form opens on **Step 1 of 7**, **General**.
3. Tap the **Supplier** field and choose **Test Pharma Supply**.
4. Type `DR-1001` in the **Invoice / DR No.** field.
5. Type `60` in the **Freight / other charges** field.
6. Tap **Next** at the bottom. **Unit Load** opens, marked **Optional**.
7. Tap **Skip tier**. **Pallet** opens.
8. Tap **Skip tier**. **Case** opens.
9. Type `2` in **Received cases**, `3` in **Packs per case** and `150` in **Cost per case**.
10. Look at **Total cost** and **Total packs** below.
11. Tap **Next**. **Pack** opens.
12. Tap the **Item** field and choose **Paracetamol 500mg**.
13. Look at the **Received packs** and **Cost per pack** fields.
14. Tap the **Expiration date** field and pick a date 60 days from today.
15. Tap **Next**. **Base Unit** opens.
16. Look at **Cost per tablet** and **Total tablet**.
17. Tap **Next**. **Review** opens.
18. Tap **Save receipt**.

### What's the expected output?
- After step 10, **Total cost** reads 300 and **Total packs** reads **6**.
- After step 13 both fields are greyed out and read **From Case tier: 6** and **From Case tier: 50.00**.
- After step 12, **Pack name**, **SKU**, **Pack type** and **Sell by** are filled from the item and greyed out.
- After step 16, **Total tablet** reads **72** and **Cost per tablet** is about **5.00** (300 + 60 freight,
  divided by 72 tablets).
- After step 18 the receipt's own page opens; its code starts **RC-** and its status reads **Full**.
- Back on **Stock → Receipts**, a row shows **Paracetamol 500mg** with **72 / 72 tablet** and **Full**.
  Tapping the row opens it: **Case CS-…** twice, each with three pack rows starting **PK-**, each
  **Sealed** with **12/12**.

## Test 5 - Title: A second delivery that expires sooner, with loose tablets

### What will be tested?
You will receive one more cup of Paracetamol plus 5 loose tablets, expiring sooner than the first
delivery. A pass means the loose tablets become one open pack, and the Inventory screen marks it as
the next pick.

### What do you need before starting?
- Test 4 done.

### Steps
1. On **Stock → Receipts**, tap **New stock receipt**.
2. Choose **Test Pharma Supply** in **Supplier**, then tap **Next**.
3. Tap **Skip tier** three times, until **Pack** opens.
4. Choose **Paracetamol 500mg** in the **Item** field.
5. Type `1` in **Received packs** and `48` in **Cost per pack**.
6. Tap **Auto-generate** next to **Lot / batch number**.
7. Pick an **Expiration date** 30 days from today.
8. Tap **Next**. **Base Unit** opens.
9. Type `5` in **Extra loose tablet**.
10. Tap **Next**, then **Save receipt**.
11. Open the side menu and tap **Inventory**.
12. Tap the arrow at the left of the **Paracetamol 500mg** row.

### What's the expected output?
- On the Inventory list, **Paracetamol 500mg** reads **89 tablet** (72 + 12 + 5).
- After step 12 the row opens onto two lots. The one expiring in 30 days is listed first.
- In that lot, one pack reads **Open** with **5/12**, and carries the red **Next pick** tag.
- The lot's line reads **17 tablet left · 2 active**.

## Test 6 - Title: Several products on one receipt

### What will be tested?
You will receive two different items on one receipt using the product list. A pass means each item
gets its own line, and a brand-new item made on the receipt appears in Inventory.

### What do you need before starting?
- Test 1 done.

### Steps
1. On **Stock → Receipts**, tap **New stock receipt**, choose **Test Pharma Supply**, tap **Next**, and
   **Skip tier** three times.
2. On **Pack**, turn on the switch so it reads **This pack has other products / variants in it**.
3. Tap **Add product / variant**. An editor box opens.
4. Choose **Paracetamol 500mg** in **Item**, type `2` in **Received packs** and `48` in **Cost per pack**, and pick an **Expiration date** 90 days from today.
5. Tap **Save to list**. Paracetamol appears as a row.
6. Tap **Add product / variant** again.
7. Leave **Item** on **New item**. Type `Amoxicillin 250mg` in **Pack name** and tap **Auto-generate** on **SKU**.
8. Tap **Base unit** under **Sell by**. A **Base unit details** part appears inside the editor.
9. Type `capsule` in **Base unit type** and `10` in **capsule per pack**.
10. Type `3` in **Received packs**, `85` in **Cost per pack**, and pick an **Expiration date**.
11. Tap **Save to list**.
12. Tap **Next** until **Review**, then **Save receipt**.
13. Open **Inventory**.

### What's the expected output?
- After step 8 the **Base unit details** part appears in the editor as soon as **Base unit** is tapped.
- The review lists both products, each with its own cost per unit.
- After step 13 Inventory lists **Amoxicillin 250mg** with **30 capsule**, and **Paracetamol 500mg** is 24 tablets higher than before step 1.

## Test 7 - Title: Change an item's type from the list

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

## Test 8 - Title: Price a draft so it can be sold

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

## Test 9 - Title: Bring back a deleted draft with Add from Inventory

### What will be tested?
You will delete Rice's draft and bring it back. A pass means **Add from Inventory** only offers items
that are missing a draft, and picking one makes it again.

### What do you need before starting?
- Test 7 done.

### Steps
1. On **Products**, long-press **Rice 5kg (sack)** and tap **Delete** in the bar that appears; confirm.
2. Tap **Add from Inventory** at the top. An **Add from Inventory** window opens.
3. Look at the list.
4. Tap **Rice 5kg**.

### What's the expected output?
- After step 3 the list shows **Rice 5kg** and does not show **Paracetamol 500mg** (it already has its draft).
- After step 4 the window closes and the edit form of **Rice 5kg (sack)** opens, ready for a price.

## Test 10 - Title: Write off damaged stock

### What will be tested?
On an item's page you will write off 2 tablets from one pack. A pass means the count goes down and the
item's **History** records why.

### What do you need before starting?
- Test 5 done.

### Steps
1. On **Inventory**, tap the name **Paracetamol 500mg**. Its page opens.
2. Under **Lots**, find the lot expiring in 60 days (from Test 4) and tap the **⋮** button on the right of a pack there that reads **Sealed**.
3. Tap **Write off** in the menu. A **Write off** window opens.
4. Type `2` in the quantity field.
5. Tap the **Damaged** reason.
6. Tap **Write off** at the bottom.

### What's the expected output?
- That pack now reads **Open** with **10/12**.
- The amount at the top of the page is 2 tablets lower than before step 1.
- **History** has a new line at the top: **Written off**, with the pack code and **damaged**, and **−2 tablet** in red.

## Test 11 - Title: Return stock to the supplier

### What will be tested?
You will return a sealed cup of Paracetamol to the supplier. A pass means the pack empties, and that
stock added in Inventory cannot be returned.

### What do you need before starting?
- Test 10 done.

### Steps
1. On Paracetamol's page, in the lot expiring in 60 days, tap **⋮** on a **Sealed** pack and tap **Return to supplier**.
2. Type `12` and tap **Return to supplier**.
3. Open **Rice 5kg**'s page and tap **⋮** on one of its packs from the **Added in Inventory** lot.

### What's the expected output?
- After step 2 that pack reads **Empty** and fades; the on-hand amount is 12 tablets lower.
- After step 3 **Return to supplier** is greyed out in the menu.

## Test 12 - Title: Show and hide empty packs

### What will be tested?
A pass means used-up packs are hidden until asked for.

### What do you need before starting?
- Test 11 done.

### Steps
1. On **Inventory**, open the Paracetamol row's arrow.
2. Look for the pack emptied in Test 11.
3. Turn on **Show empty packs** above the list.

### What's the expected output?
- After step 2 the empty pack is not listed.
- After step 3 it is listed, faded, reading **Empty** and **0/12**.

## Test 13 - Title: Filters on the Inventory list

### What will be tested?
A pass means the list can be narrowed by where stock came from and by type.

### What do you need before starting?
- Tests 3–6 done.

### Steps
1. On **Inventory**, tap **Added in Inventory**.
2. Tap **Received via Stock**.
3. Tap **All**, then tap **Sellable** in the second row of chips.

### What's the expected output?
- After step 1 only **Rice 5kg** shows.
- After step 2 **Paracetamol 500mg** and **Amoxicillin 250mg** show, and **Rice 5kg** does not.
- After step 3 only Sellable items show.

## Test 14 - Title: Void a receipt nothing has been taken from

### What will be tested?
A pass means a mistaken receipt can be cancelled while none of its stock has moved, and its stock
leaves the counts.

### What do you need before starting?
- Test 6 done, with nothing sold or written off from that receipt.

### Steps
1. On **Stock → Receipts**, tap the **Amoxicillin 250mg** row, then **Open receipt**.
2. Tap **Void** at the top. Type `Entered by mistake` as the reason and confirm.

### What's the expected output?
- The receipt page shows a red **Voided** box with the reason.
- On **Inventory**, **Amoxicillin 250mg** reads **0 capsule**, and **Paracetamol 500mg** is 24 tablets lower than before step 1.

## Test 15 - Title: Edit sample item 1

### What will be tested?
A pass means an item's details can change, but its units per pack cannot while stock is on hand.

### What do you need before starting?
- Test 5 done.

### Steps
1. On Paracetamol's page, tap **Edit**.
2. Look at the **tablet per cup** field.
3. Change **Storage location** to `Pharmacy shelf 2` and tap **Save changes**.

### What's the expected output?
- After step 2 the field is greyed out with the hint **Locked while stock is on hand**.
- After step 3 the page shows **Location** as **Pharmacy shelf 2**.

## Test 16 - Title: Edit sample item 2

### What will be tested?
A pass means Rice's details can be changed and saved from its edit form.

### What do you need before starting?
- Test 3 done.

### Steps
1. On Rice's page, tap **Edit**. Change **Notes** to `Keep dry` and tap **Save changes**.

### What's the expected output?
- The page shows **Notes** as **Keep dry**.

## Test 17 - Title: Archive and delete both sample items

### What will be tested?
A pass means an item with stock cannot be archived, and an item with a history cannot be deleted —
only archived once it is empty.

### What do you need before starting?
- Tests 2 and 3 done.

### Steps
1. On Paracetamol's page, tap **Archive**.
2. On Rice's page, write off all its packs (Test 10's steps, the full amount), then tap **Archive**.
3. On the Inventory list, long-press **Rice 5kg** and tap **Delete**; confirm.

### What's the expected output?
- After step 1 a message says the item can be archived only once its stock is gone; nothing changes.
- After step 2 Rice leaves the list (it is archived).
- After step 3 a message says the item has stock history and cannot be deleted.

---

## Group 2 — Mistakes and edge cases

## Test 18 - Title: Save a receipt with nothing filled in

### What will be tested?
A pass means the receipt cannot be saved without a supplier, a product and its cost.

### What do you need before starting?
- On **Stock → Receipts**.

### Steps
1. Tap **New stock receipt** and tap **Next** without choosing a supplier.

### What's the expected output?
- The form stays on **General** and **Choose the supplier.** shows in red under **Supplier**.

## Test 19 - Title: An expiring item received without a date

### What will be tested?
A pass means an item that expires cannot be received without its expiration date.

### What do you need before starting?
- Test 2 done.

### Steps
1. Start a receipt, choose the supplier, skip the three tiers, choose **Paracetamol 500mg**, type `1` packs and `48` cost.
2. Leave **Expiration date** empty and tap **Next**.

### What's the expected output?
- **Enter the expiration date.** shows in red under the field, and the form does not move on.

## Test 20 - Title: Loose units of a full pack or more

### What will be tested?
A pass means loose units must be fewer than one pack.

### What do you need before starting?
- Test 2 done.

### Steps
1. On a Paracetamol receipt's **Base Unit** step, type `12` in **Extra loose tablet** and tap **Next**.

### What's the expected output?
- **Loose units must be fewer than one full pack.** shows in red.

## Test 21 - Title: More serial numbers than packs

### What will be tested?
A pass means each serial number belongs to one pack.

### What do you need before starting?
- Test 2 done.

### Steps
1. On a receipt's **Pack** step, type `1` in **Received packs** and `SN-1, SN-2` in **Serial numbers**, then tap **Next**.

### What's the expected output?
- **More serial numbers than packs.** shows in red under **Serial numbers**.

## Test 22 - Title: Write off more than a pack holds

### What will be tested?
A pass means stock never goes below zero.

### What do you need before starting?
- Test 10 done.

### Steps
1. On a pack reading **10/12**, choose **Write off**, type `11` and tap **Write off**.

### What's the expected output?
- The window stays open with **That is more than is left here. Enter a smaller amount.**

## Test 23 - Title: Adjust without a note

### What will be tested?
A pass means every count correction says why.

### What do you need before starting?
- Any item with stock.

### Steps
1. On any pack, choose **Adjust count**, type `-1`, leave the note empty and tap **Adjust count**.

### What's the expected output?
- **Say why the count changed.** shows in red under the note.

## Test 24 - Title: Duplicate SKU or lot number

### What will be tested?
A pass means two items cannot share a SKU and two deliveries cannot share a lot number.

### What do you need before starting?
- Tests 2 and 5 done.

### Steps
1. Add an inventory item and type Paracetamol's SKU in **SKU**; tap **Save item**.
2. Start a receipt and type the lot number from Test 5 in **Lot / batch number**; save it.

### What's the expected output?
- After step 1: **Another product already uses this SKU.** under the buttons; nothing saved.
- After step 2: **Another delivery already uses this lot number.** under the buttons; nothing saved.

## Test 25 - Title: Back button and double-tap

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

## Test 26 - Title: Void a receipt stock was already taken from

### What will be tested?
A pass means a receipt cannot be cancelled once any of its stock moved.

### What do you need before starting?
- Test 10 done (a write-off from Test 4's receipt).

### Steps
1. Open Test 4's receipt and tap **Void**, give a reason and confirm.

### What's the expected output?
- The window says the stock has already moved; the receipt stays **Partial**.

---

## Group 3 — Accounts

## Test 27 - Title: Sign out while on Inventory

### What will be tested?
A pass means signing out never freezes the screen.

### What do you need before starting?
- Signed in.

### Steps
1. On **Inventory**, go to Profile and tap **Sign Out**.

### What's the expected output?
- The sign-in screen appears.

## Test 28 - Title: A different account sees none of this stock

### What will be tested?
The most important test here. A pass means a second person never sees the first person's items,
suppliers or receipts, not even for a moment.

### What do you need before starting?
- Test 27 done.

### Steps
1. Sign in with a different Google or Facebook account and open its system.
2. Open **Inventory**, **Stock → Receipts**, **Stock → Suppliers** and **Products → Add from Inventory**.

### What's the expected output?
- None of **Paracetamol 500mg**, **Rice 5kg**, **Test Pharma Supply** or the receipts appear on any screen, at any moment.

## Test 29 - Title: Sign back in as the first account

### What will be tested?
A pass means the first person's stock is all still there.

### What do you need before starting?
- Test 28 done.

### Steps
1. Sign out, and sign in again with the first account.

### What's the expected output?
- **Inventory**, **Stock** and **Products** show the same items, counts and receipts as before.

## Test 30 - Title: Delete the account

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

## Test 31 - Title: Internet drops while saving a receipt

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

## Test 32 - Title: Open Inventory in airplane mode

### What will be tested?
A pass means the screen explains it is offline instead of showing a blank screen.

### What do you need before starting?
- Any item.

### Steps
1. Close the app, turn on airplane mode, open the app and go to **Inventory**; open a row's arrow.

### What's the expected output?
- An offline message shows where packs would be, not a spinner that never stops.

## Test 33 - Title: Phone switched off mid-receipt, app swiped away, left in the background

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

## Test 34 - Title: A call or notification mid-form

### What will be tested?
A pass means what was typed is kept.

### What do you need before starting?
- Signed in.

### Steps
1. Type half an inventory item, then take a call or open a notification, and come back.

### What's the expected output?
- The typed fields are still there.

## Test 35 - Title: Storage almost full, and a wrong clock

### What will be tested?
A pass means the app still opens and saves; note any message a wrong clock causes at sign-in.

### What do you need before starting?
- Test 1 done.

### Steps
1. With storage nearly full, add an item and save a receipt.
2. Set the phone's clock a few minutes wrong and sign in with Google.

### What's the expected output?
- After step 1 both save. After step 2 write down any message shown.

## Test 36 - Title: Phone and tablet

### What will be tested?
A pass means the tablet shows the wide layouts and the phone the narrow ones.

### Steps
1. On a tablet open **Stock → Receipts** and **New stock receipt**; then **Inventory** and tap an item's name.
2. Do the same on a phone.

### What's the expected output?
- Tablet: receipts in a table with columns **Date / Receipt** to **Location**; the receipt form shows every
  step on the left and the **Review** on the right; Inventory rows show a type chip, cost and value, and an
  opened item appears beside the list.
- Phone: receipts as cards; the receipt form goes step by step with **Next** and **Skip tier**; an item opens
  on its own screen.
