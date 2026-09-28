# Inventory and Stock — acceptance tests

Covers the **Inventory** screen (its list, an item's page, and the item form), and the **Stock** screen
(**Receipts** and **Suppliers**): adding stock items, receiving stock on a receipt, adjusting, writing
off and returning stock, and voiding a receipt.

Run the tests in order: later tests use the items, supplier and receipts the earlier ones make.

A few words used throughout:

- **Pack** — the unit an item is bought and counted in: a box of medicine, one phone charger.
- **Base unit** — what a pack holds: the tablets inside a box.
- **Loose units** — base units outside a full pack, such as 7 tablets left in an opened box.
- **Case** — a carton of several packs, as it arrives from the supplier.
- **Lot** — everything of one item that arrived on one receipt, with one expiry date.

---

## Group 1 — Normal use

## Test 1 - Title: Add a supplier

### What will be tested?
On the **Stock** screen, you will add a new supplier. A pass means the supplier is saved, gets a
supplier code on its own, and can be picked when stock is received later.

### What do you need before starting?
- Signed in, inside a system, internet on, on a phone.

### Steps
1. Tap the menu button at the top left to open the side menu.
2. Tap **Stock** in the side menu. The Stock screen opens.
3. Tap **Suppliers** in the switch at the top of the screen, next to **Receipts**.
4. Tap the **Add supplier** button at the top right. A **New supplier** form slides up from the bottom.
5. Type `Test Pharma Supply` in the **Name** field.
6. Leave the **Code** field empty.
7. Type `7` in the **Lead time (days)** field.
8. Tap **Create** at the bottom of the form.

### What's the expected output?
- The **New supplier** form closes and you are back on the **Suppliers** list of the Stock screen.
- **Test Pharma Supply** is now in that list, with a code that starts with **SUP-** (for example
  **SUP-0001**). The app made the code because the **Code** field was left empty.
- Its row shows it as **Active**.

## Test 2 - Title: Add sample item 1 — a boxed medicine

### What will be tested?
On the **Inventory** screen, you will create a medicine that is bought in boxes of 10 tablets. A
pass means the item is saved with its units, reorder level and shelf location, and starts with no
stock until a delivery is received.

### What do you need before starting?
- Test 1 done.

### Steps
1. Open the side menu and tap **Inventory**. The Inventory list opens.
2. Tap the **Add item** button at the top right. The **New item** form opens, titled **Add an inventory item**.
3. Type `Paracetamol 500mg` in the **Pack name** field.
4. Under **Pack type**, check that **Sellable** is selected; tap it if it is not.
5. Scroll down to **Base unit**. Type `box` in the **Pack unit** field.
6. Type `tablet` in the **Base unit** field.
7. Type `10` in the field below them, now labelled **tablet per box**.
8. Scroll down to **Stock settings**. Type `Pharmacy shelf 1` in the **Storage location** field.
9. Type `20` in the **Reorder at** field.
10. Type `30` in the **Expiry alert** field.
11. Tap **Save item** at the bottom of the screen.

### What's the expected output?
- The form closes and the new item's own page opens, with **Paracetamol 500mg** as its title at the top.
- Near the top of that page, the amount on hand reads **0 box**.
- Further down, the **Lots (0)** section says "No stock yet. It arrives through a receipt on the Stock screen."
- In the item's details on the same page: **Per pack** reads **1 box = 10 tablet**, **Reorder at**
  reads **20 tablet**, and **Location** reads **Pharmacy shelf 1**.

## Test 3 - Title: Add sample item 2 — a variant with serial numbers

### What will be tested?
On the **Inventory** screen, you will create a phone charger that is one version ("variant") of a
new product group, and whose every unit has its own serial number. A pass means the charger is
listed under its group in the Inventory list.

### What do you need before starting?
- On the **Inventory** screen.

### Steps
1. Tap the **Add item** button at the top right. The **New item** form opens.
2. Under **Variant setup**, turn on the **Variant** switch. A **Variant of** field appears below it.
3. Tap **Variant of**, then tap **New group** at the bottom of the list that opens. The field changes to **New group name**.
4. Type `Phone charger` in the **New group name** field.
5. Type `USB-C, 20W` in the **Variant attributes** field.
6. Type `Charger USB-C 20W` in the **Pack name** field.
7. Type `pc` in the **Pack unit** field.
8. Leave the field below it (now labelled **unit per pc**) at `1`.
9. Turn on the **Serial numbers** switch.
10. Tap **Save item** at the bottom of the screen. The charger's own page opens.
11. Tap the back arrow at the top left. The Inventory list opens.

### What's the expected output?
- The Inventory list has a heading row named **Phone charger** that says **1 variant**.
- Directly under that heading is a row named **USB-C / 20W** — the charger, named by its attributes.
- **Paracetamol 500mg** from Test 2 has its own row, outside the **Phone charger** group.

## Test 4 - Title: Receive stock on a receipt with cases and freight

### What will be tested?
On the **Stock** screen, you will record a delivery ("receipt") from Test Pharma Supply with two
items: Paracetamol arriving in cases, and three chargers with serial numbers, plus a delivery fee
("freight"). A pass means the receipt is saved and both items' stock goes up by exactly what was received.

### What do you need before starting?
- Tests 1–3 done.

### Steps
1. Open the side menu and tap **Stock**. Tap **Receipts** in the switch at the top.
2. Tap the **New receipt** button at the top right. The **New receipt** form opens on step 1, **Delivery**.
3. Tap the **Supplier** field and choose **Test Pharma Supply**.
4. Type `INV-1001` in the **Invoice / DR number** field.
5. Type `50` in the **Freight** field.
6. Tap **Next** at the bottom. Step 2, **Lines**, opens.
7. Tap **Add line**. An empty line opens for editing.
8. Tap the **Item** field and choose **Paracetamol 500mg**.
9. Turn on the **Cases** switch, so it reads "Received in cases". Fields for cases appear.
10. Type `2` in the **Cases** field.
11. Type `5` in the **box per case** field.
12. Type `200` in the **Cost per case** field.
13. Tap the **Expires on** field and pick a date 20 days from today.
14. Tap **Save line**. The line closes into a single row showing Paracetamol.
15. Tap **Add line** again.
16. Tap the **Item** field and choose **USB-C / 20W** (the charger).
17. Type `3` in the **pc** field.
18. Type `SN-001`, `SN-002` and `SN-003` in the **Serials** field, one per line.
19. Type `150` in the **Cost per pc** field.
20. Tap **Save line**.
21. Tap **Next** at the bottom. Step 3, **Review**, opens.
22. Read the review.
23. Tap **Save receipt** at the bottom.

### What's the expected output?
- On the **Review** step (step 22), both lines are listed, the **Freight** line reads 50, and the
  **Total** at the bottom includes those 50.
- After tapping **Save receipt**, the saved receipt's own page opens. Its code, at the top, starts
  with **RC-**, and its status reads **Full** (nothing has been taken from it yet).
- On that page, the Paracetamol line reads **2 cases × 5 box** and **100 of 100 tablet left**, and
  shows part of the 50 freight added to its cost.
- Tapping the Paracetamol line shows its two cases; tapping a case shows the five boxes inside it.

## Test 5 - Title: The Inventory list shows packs, loose units and badges

### What will be tested?
On the **Inventory** list, you will check that each row shows its stock in the units it was
received in, and warns about stock expiring soon. A pass means the amounts match the receipt from
Test 4, and Paracetamol carries an expiry warning.

### What do you need before starting?
- Test 4 done.

### Steps
1. Open the side menu and tap **Inventory**.
2. Find the **Paracetamol 500mg** row and read it.
3. Find the **USB-C / 20W** row under **Phone charger** and read it.

### What's the expected output?
- The **Paracetamol 500mg** row reads **10 box** (2 cases of 5 boxes).
- The same row has a **Sellable** label and an **EXPIRING** badge. The badge shows because the stock
  expires in 20 days, inside the 30-day warning set in Test 2.
- The **USB-C / 20W** row reads **3 pc** (the three chargers).

## Test 6 - Title: Open a box and see loose units

### What will be tested?
On Paracetamol's page, you will correct the count after finding 3 tablets missing from a case. A
pass means the app opens one box, shows the tablets left in it as loose units, and records the
correction with its reason in the item's history.

### What do you need before starting?
- On **Paracetamol 500mg**'s page (tap it in the Inventory list).

### Steps
1. Scroll down to the **Cases** section.
2. Tap the **⋮** button at the right of the first case. A menu opens.
3. Tap **Adjust count** in the menu. An **Adjust count** form slides up from the bottom.
4. Type `-3` in the **Change, in tablet (use − to remove)** field.
5. Type `Counted short on the shelf` in the **Note** field.
6. Tap the **Adjust count** button at the bottom of the form.

### What's the expected output?
- The **Adjust count** form closes and you are back on Paracetamol's page.
- Near the top of the page, the amount on hand now reads **9 box + 7 tablet**: one box was opened,
  and the 7 tablets left in it are loose units.
- In the **History** section further down, the newest entry reads **Adjusted**, with **−3 tablet**
  and the note "Counted short on the shelf".

## Test 7 - Title: Write off expired or damaged stock

### What will be tested?
On Paracetamol's page, you will remove 5 damaged tablets with **Write off**. A pass means the amount
on hand goes down by 5 tablets, and the item's **History** records the reason and note, so the shop
can later see where the stock went.

### What do you need before starting?
- On **Paracetamol 500mg**'s page, after Test 6.

### Steps
1. Scroll down to the **Cases** section.
2. Tap the **⋮** button at the right of the second case. A menu opens.
3. Tap **Write off** in the menu. A **Write off** form slides up from the bottom.
4. Type `5` in the **How many tablet leave** field.
5. Tap **Damaged** in the row of reasons.
6. Type `Crushed box` in the **Note** field.
7. Tap the **Write off** button at the bottom of the form.

### What's the expected output?
- The **Write off** form closes and you are back on Paracetamol's page.
- Near the top of the page, the amount on hand is 5 tablets lower: **9 box + 7 tablet** becomes **9 box + 2 tablet**.
- In the **History** section, the newest entry reads **Written off**, with **−5 tablet**, the reason
  **damaged**, and the note "Crushed box".

## Test 8 - Title: Return a serial item to the supplier

### What will be tested?
On the charger's page, you will send one faulty charger back to Test Pharma Supply. Because every
charger has its own serial number, it can only be moved one charger at a time. A pass means the
right charger leaves stock and the return is recorded.

### What do you need before starting?
- Test 4 done.

### Steps
1. Open **Inventory** and tap **USB-C / 20W**. The charger's page opens.
2. Scroll down and look at the **Lots** section and the packs listed under it.
3. Tap the **⋮** button at the right of the pack with serial **SN-002**. A menu opens.
4. Tap **Return to supplier**. A **Return to supplier** form slides up from the bottom.
5. Type `1` in the **How many pc leave** field.
6. Type `Faulty port` in the **Note** field.
7. Tap the **Return to supplier** button at the bottom of the form.

### What's the expected output?
- At step 2, the lot itself has no **⋮** button — only each pack does — and all three packs are
  listed with their serials **SN-001**, **SN-002** and **SN-003**.
- (Paracetamol's page from Test 4 works the same way: all of its stock sits in cases, so only the
  cases have a **⋮** button, not the lot.)
- After step 7, the form closes; near the top of the charger's page the amount on hand reads
  **2 pc**, and **SN-002** is no longer in the list of packs.
- In the **History** section, the newest entry reads **Returned**.

## Test 9 - Title: The opening stock from before this update

### What will be tested?
On the **Stock** screen, you will check what happened to stock items that already had a quantity
before this version of the app. A pass means that stock was moved onto one receipt called "Opening
stock", with the quantity each item had — nothing lost and nothing doubled.

### What do you need before starting?
- A stock item that had a quantity on hand before this version was installed. If none existed,
  write "no old stock" in the report and skip this test.

### Steps
1. Open **Stock** and tap **Receipts** in the switch at the top.
2. Find the receipt whose supplier column reads **Opening stock**.
3. Tap it. The receipt's page opens.
4. Open **Inventory** and tap the old item. Its page opens.
5. Tap the **⋮** button at the right of its lot.

### What's the expected output?
- The receipt's page is headed **Opening stock** and lists each old item with the quantity it had before the update.
- On the old item's page, the amount on hand near the top is that same quantity, and its lot says **opening stock**.
- In the menu that opens at step 5, **Return to supplier** is greyed out and cannot be tapped: stock
  that arrived with no supplier has no one to return it to.

## Test 10 - Title: Void a receipt nothing has been taken from

### What will be tested?
On the **Stock** screen, you will save a receipt by mistake and then cancel it with **Void**. A
pass means the stock that receipt added is taken back off the item, and the receipt stays in the
list marked **Void** with the reason, so there is a record of the mistake.

### What do you need before starting?
- On **Stock**, with **Receipts** selected at the top.

### Steps
1. Open **Inventory**, find **Paracetamol 500mg**, and write down the amount on its row.
2. Go back to **Stock** and tap **New receipt** at the top right.
3. Tap the **Supplier** field, choose **Test Pharma Supply**, then tap **Next**.
4. Tap **Add line**, choose **Paracetamol 500mg** as the **Item**, type `1` in the **box** field and
   `20` in **Cost per box**, then tap **Save line**.
5. Tap **Next**, then **Save receipt**. The new receipt's page opens.
6. Tap **Void** at the top of the receipt's page. A **Void receipt** form slides up from the bottom.
7. Type `Entered twice` in the **Reason** field.
8. Tap the **Void receipt** button at the bottom of the form.

### What's the expected output?
- The **Void receipt** form closes. At the top of the receipt's page it now reads **Voided** with
  today's date, and the reason "Entered twice" is shown.
- On the **Inventory** list, **Paracetamol 500mg** shows the same amount you wrote down at step 1 —
  the box this receipt added is gone again.
- Back on **Stock → Receipts**, this receipt is still listed, with its status reading **Void**.

## Test 11 - Title: Edit sample item 1

### What will be tested?
On Paracetamol's page, you will edit the item while it has stock. A pass means ordinary details
(like the shelf location) can still change, but the two settings that would miscount the stock
already on hand — tablets per box and serial numbers — are locked.

### What do you need before starting?
- On **Paracetamol 500mg**'s page.

### Steps
1. Tap **Edit** at the top right. The **Edit item** form opens.
2. Scroll to **Base unit** and look at the **tablet per box** field and the **Serial numbers** switch.
3. Scroll to **Stock settings**. Clear the **Storage location** field and type `Pharmacy shelf 2`.
4. Tap **Save changes** at the bottom of the screen.

### What's the expected output?
- At step 2, the **tablet per box** field and the **Serial numbers** switch are greyed out and
  cannot be changed, and the field says "Locked while stock is on hand".
- After step 4, the form closes and you are back on Paracetamol's page, where **Location** now reads **Pharmacy shelf 2**.

## Test 12 - Title: Edit sample item 2

### What will be tested?
On the charger's page, you will change what makes this variant different from others in its group.
A pass means the new attributes become the charger's name in the Inventory list.

### What do you need before starting?
- On **USB-C / 20W**'s page.

### Steps
1. Tap **Edit** at the top right. The **Edit item** form opens.
2. Clear the **Variant attributes** field and type `USB-C, 25W`.
3. Tap **Save changes** at the bottom of the screen. The charger's page opens again.
4. Tap the back arrow at the top left. The Inventory list opens.

### What's the expected output?
- In the Inventory list, under the **Phone charger** heading, the charger's row now reads
  **USB-C / 25W** instead of **USB-C / 20W**.

## Test 13 - Title: Filters and search

### What will be tested?
On the **Inventory** list, you will narrow the list with the filters and the search box. A pass
means each filter shows only the items that match it, and search also finds an item by its shelf
location, not only by its name.

### What do you need before starting?
- On **Inventory**, on a phone.

### Steps
1. Tap the **Filters and sort** button next to the search box at the top. A filter panel opens.
2. Tap **Source** and choose **Received via Stock**.
3. Look at the list.
4. Tap **Source** and choose **All**.
5. Tap **Type** and choose **Component**.
6. Look at the list.
7. Tap **Type** and choose **All**.
8. Type `shelf 2` in the search box at the top.
9. Look at the list.
10. Tap the **×** at the right of the search box to clear it.

### What's the expected output?
- After step 3: both **Paracetamol 500mg** and the **USB-C / 25W** charger are listed, because both
  arrived on a supplier's receipt.
- After step 6: neither test item is listed, because both are **Sellable**, not **Component**. If no
  other item is a component, the list says **Nothing matches these filters.** with a **Clear filters** button.
- After step 9: only **Paracetamol 500mg** is listed — its storage location, **Pharmacy shelf 2**
  from Test 11, contains "shelf 2".

## Test 14 - Title: Collapse a variant group

### What will be tested?
On the **Inventory** list, you will fold a product group closed and open again. A pass means the
group's variants hide and come back, and the heading still says how many there are.

### What do you need before starting?
- On **Inventory**.

### Steps
1. Tap the **Phone charger** heading row.
2. Tap the same heading row again.

### What's the expected output?
- After step 1, the **USB-C / 25W** row under the heading is hidden, and the **Phone charger** heading still reads **1 variant**.
- After step 2, the **USB-C / 25W** row is shown under the heading again.

## Test 15 - Title: View both sample items after all changes

### What will be tested?
On each test item's page, you will read the full **History**. A pass means every stock change from
the earlier tests is listed there, newest first, so the history adds up to the amount on hand.

### What do you need before starting?
- Tests 4–12 done.

### Steps
1. Open **Inventory** and tap **Paracetamol 500mg**.
2. Scroll down to the **History** section and read it from the top.
3. Go back to the Inventory list and tap **USB-C / 25W**.
4. Scroll down to the **History** section and read it from the top.

### What's the expected output?
- Paracetamol's **History**, newest first: **Voided** and **Received** (the receipt voided in Test
  10), **Written off** (Test 7), **Adjusted** (Test 6), and **Received** (Test 4).
- The charger's **History**, newest first: **Returned** (Test 8), then **Received** (Test 4).

## Test 16 - Title: Delete both sample items

### What will be tested?
On the **Inventory** screen, you will try to archive and then delete an item that still has stock
and a history. A pass means the app refuses both and says why in plain words — stock items keep
their history so the shop's records stay complete.

### What do you need before starting?
- On **Inventory**.

### Steps
1. Tap **Paracetamol 500mg**. Its page opens.
2. Tap **Archive** at the top right.
3. Read the message that appears at the bottom of the screen.
4. Go back to the Inventory list.
5. Press and hold the **Paracetamol 500mg** row until it is selected. A bar of actions appears.
6. Tap **Delete** in that bar. A **Delete** confirmation opens.
7. Tap **Delete** in the confirmation.
8. Read the message in the confirmation.

### What's the expected output?
- After step 3, the message at the bottom reads "Stock is still on hand. Adjust or write it off
  before archiving." Paracetamol stays in the Inventory list as an active item.
- After step 8, the confirmation reads "This item has stock history, so it cannot be deleted.
  Archive it once its stock is gone." Paracetamol is still in the Inventory list.
- (This is intended. To remove a stock item from the list, write off all its stock first, then archive it.)

---

## Group 2 — Mistakes and edge cases

## Test 17 - Title: Void a receipt after stock was taken from it

### What will be tested?
On the **Stock** screen, you will try to void the receipt from Test 4, after some of its stock was
already adjusted in Test 6. A pass means the app refuses, because voiding it would undo stock that
has already moved.

### What do you need before starting?
- Test 6 done.

### Steps
1. Open **Stock**, tap **Receipts**, and tap the receipt from Test 4 (invoice **INV-1001**). Its page opens.
2. Tap **Void** at the top. A **Void receipt** form slides up from the bottom.
3. Type `Test` in the **Reason** field.
4. Tap the **Void receipt** button at the bottom of the form.

### What's the expected output?
- The **Void receipt** form stays open and shows, under the reason, "Stock from this receipt has
  already moved, so it cannot be voided. Correct the item with an adjustment instead."
- After closing the form, the receipt's status at the top of its page still reads **Partial** (some
  of its stock is gone), not **Voided**.

## Test 18 - Title: Take more than is left

### What will be tested?
On Paracetamol's page, you will try to write off far more tablets than the case holds. A pass means
the app refuses with a clear message and the amount on hand does not change.

### What do you need before starting?
- On **Paracetamol 500mg**'s page. Note the amount on hand near the top.

### Steps
1. Scroll to **Cases**, tap the **⋮** button at the right of a case, and tap **Write off**. The **Write off** form slides up.
2. Type `100000` in the **How many tablet leave** field.
3. Tap **Lost** in the row of reasons, and type `Test` in the **Note** field.
4. Tap the **Write off** button at the bottom of the form.

### What's the expected output?
- The **Write off** form stays open and shows "That is more than is left here. Enter a smaller amount."
- After closing the form, the amount on hand near the top of Paracetamol's page is the same as before step 1.

## Test 19 - Title: Adjust without a note

### What will be tested?
On Paracetamol's page, you will try to change a count without saying why. A pass means the app asks
for a note first, so every correction in the history has a reason.

### What do you need before starting?
- On **Paracetamol 500mg**'s page.

### Steps
1. Scroll to **Cases**, tap the **⋮** button at the right of a case, and tap **Adjust count**. The **Adjust count** form slides up.
2. Type `2` in the **Change, in tablet** field.
3. Leave the **Note** field empty.
4. Tap the **Adjust count** button at the bottom of the form.

### What's the expected output?
- The **Adjust count** form stays open, and under the **Note** field it says "Say why the count changed."
- Nothing new appears in Paracetamol's **History** section.

## Test 20 - Title: An expired lot

### What will be tested?
On the **Stock** screen, you will receive a box that expired yesterday. A pass means the app marks
that stock **EXPIRED** in the Inventory list and on the item's page, while the older, still-good stock
keeps its **EXPIRING** warning.

### What do you need before starting?
- On **Stock**, with **Receipts** selected at the top.

### Steps
1. Tap **New receipt**, choose **Test Pharma Supply** as the supplier, and tap **Next**.
2. Tap **Add line**, choose **Paracetamol 500mg**, type `1` in the **box** field and `20` in **Cost per box**.
3. Tap the **Expires on** field and pick yesterday's date. Tap **Save line**.
4. Tap **Next**, then **Save receipt**.
5. Open **Inventory** and look at the **Paracetamol 500mg** row.
6. Tap **Paracetamol 500mg** and look at the **Lots** section.
7. Tap the **⋮** button of the new, expired lot, tap **Write off**, tap **Expired** as the reason, and tap **Write off**.

### What's the expected output?
- After step 5, the **Paracetamol 500mg** row in the Inventory list shows an **EXPIRED** badge.
- After step 6, in the **Lots** section, the new lot (from this receipt) shows **EXPIRED**, and the
  older lot from Test 4 still shows **EXPIRING**.
- After step 7, the **EXPIRED** badge is gone from the page and from the Inventory list row.

## Test 21 - Title: Serial numbers that do not match the count

### What will be tested?
In a new receipt, you will receive two chargers but type only one serial number. A pass means the
line cannot be saved until there is one serial number for each charger.

### What do you need before starting?
- In **New receipt**, on step 2 (**Lines**), with a supplier chosen on step 1.

### Steps
1. Tap **Add line**, then tap the **Item** field and choose **USB-C / 25W**.
2. Type `2` in the **pc** field.
3. Type only `SN-010` in the **Serials** field.
4. Tap **Save line**.

### What's the expected output?
- The line stays open for editing, and under the **Serials** field it says "Enter one serial per
  pack: 2 needed, 1 entered."
- No charger line is added to the receipt.

## Test 22 - Title: Leave a half-filled receipt

### What will be tested?
In a new receipt, you will try to leave before saving. A pass means the app asks before throwing
away what was typed, and keeps it if you change your mind.

### What do you need before starting?
- In **New receipt**, with a supplier chosen and nothing saved.

### Steps
1. Press the phone's Back button (or swipe back).
2. Tap **Keep editing**.
3. Press the phone's Back button again.
4. Tap **Discard**.

### What's the expected output?
- After step 1, a box opens titled **Discard this receipt?**, saying "Nothing on this receipt has
  been saved, and no stock has been counted."
- After step 2, the box closes and the receipt is still open with the supplier you chose.
- After step 4, the receipt closes, and no new receipt appears in the **Stock → Receipts** list.

## Test 23 - Title: Double-tap Save receipt

### What will be tested?
In a new receipt, you will tap **Save receipt** twice quickly. A pass means only one receipt is
saved, so the stock is not counted twice.

### What do you need before starting?
- A new receipt with one line, on step 3 (**Review**). Note how many receipts are in the Receipts list first.

### Steps
1. Tap **Save receipt** twice, as quickly as you can.
2. Go back to **Stock** and look at the **Receipts** list.

### What's the expected output?
- The **Receipts** list has exactly one more receipt than before, not two.

## Test 24 - Title: Duplicate SKU

### What will be tested?
On the **Inventory** screen, you will try to create an item with a product code (SKU) another item
already uses. A pass means the app refuses and says how to fix it, so no two items can be mixed up at the register.

### What do you need before starting?
- On **Inventory**. Open **Paracetamol 500mg** and write down the **SKU** shown in its details, then go back.

### Steps
1. Tap the **Add item** button at the top right. The **New item** form opens.
2. Type `Duplicate test` in the **Pack name** field.
3. Type Paracetamol's SKU in the **SKU** field.
4. Tap **Save item** at the bottom of the screen.

### What's the expected output?
- The form stays open, and above the buttons it says "Another product already uses this SKU. Change
  it, or auto-generate a new one."
- No **Duplicate test** item appears in the Inventory list.

---

## Group 3 — Accounts

## Test 25 - Title: A second account cannot see this stock

### What will be tested?
You will sign in as a different person and look through Inventory and Stock. A pass means none of
the first person's items, suppliers or receipts ever show — this is the most important test in this file.

### What do you need before starting?
- A second Google or Facebook account that has its own system.

### Steps
1. Open the side menu and tap **Sign out**.
2. Sign in with the second account.
3. Open its system.
4. Open **Inventory** from the side menu.
5. Open **Stock** from the side menu. **Receipts** is selected at the top.
6. Tap **Suppliers** at the top.

### What's the expected output?
- After step 1, the app returns to the sign-in screen without freezing.
- On the second account's **Inventory** list, **Receipts** list and **Suppliers** list, **none** of
  these appear, not even for a moment while the screen loads: **Paracetamol 500mg**, the **Phone
  charger** group, **Test Pharma Supply**, or any receipt from the first account.

## Test 26 - Title: Sign back in as the first account

### What will be tested?
You will switch back to the first account. A pass means all its stock is still there, unchanged.

### What do you need before starting?
- Test 25 done.

### Steps
1. Open the side menu and tap **Sign out**.
2. Sign in with the first account and open its system.
3. Open **Inventory** from the side menu.

### What's the expected output?
- The Inventory list shows **Paracetamol 500mg** and the **Phone charger** group, with the same
  amounts on their rows as before Test 25.

## Test 27 - Title: Delete the account

### What will be tested?
You will delete an account that has stock. A pass means its items and receipts are deleted with it,
and signing up again starts from nothing.

### What do you need before starting?
- A throwaway account that has one item and one receipt. **Not** the main test account.

### Steps
1. Open **Profile** from the side menu.
2. Tap **Delete account** and confirm.
3. Sign in again with the same account and create a system.
4. Open **Inventory**, then **Stock**.

### What's the expected output?
- After step 2, the app goes to the sign-in screen.
- After step 4, the new system's **Inventory** list and **Stock → Receipts** list are both empty.

---

## Group 4 — Outside the app

## Test 28 - Title: Internet drops while saving a receipt

### What will be tested?
You will save a receipt with no internet. A pass means the app says it is waiting instead of
spinning forever, and the receipt is saved exactly once when the connection comes back.

### What do you need before starting?
- A new receipt with one line, on step 3 (**Review**).

### Steps
1. Turn on airplane mode.
2. Tap **Save receipt**.
3. Read the message above the buttons.
4. Turn airplane mode off.
5. Wait ten seconds.
6. Open **Stock** and look at the **Receipts** list.

### What's the expected output?
- After step 3, above the buttons it reads "Waiting for a connection. This finishes on its own when
  you reconnect." — not a spinner that never stops.
- After step 5, the receipt's own page opens by itself.
- After step 6, the receipt is in the **Receipts** list once, not twice.

## Test 29 - Title: Internet drops while writing off stock

### What will be tested?
You will write off stock with no internet. A pass means the app says it is waiting, and the
write-off lands once when the connection returns.

### What do you need before starting?
- On an item's page with stock on hand.

### Steps
1. Turn on airplane mode.
2. Tap the **⋮** button at the right of a case, tap **Write off**, type `1`, choose a reason, type a note, and tap **Write off**.
3. Read the message in the **Write off** form.
4. Turn airplane mode off.

### What's the expected output?
- After step 3, the **Write off** form reads "Waiting for a connection. This finishes on its own when you reconnect."
- After step 4, the form closes by itself, the amount on hand near the top of the page goes down by
  1, and **History** has one new **Written off** entry, not two.

## Test 30 - Title: Open Inventory in airplane mode

### What will be tested?
You will open the stock screens with no internet at all. A pass means each screen says it is
offline, instead of staying blank or spinning.

### What do you need before starting?
- The app closed. Airplane mode on.

### Steps
1. Open the app.
2. Open **Inventory** from the side menu.
3. Open **Stock** from the side menu.

### What's the expected output?
- The **Inventory** list and the **Stock** screen each show either a message that you are offline,
  or the list as it was last loaded — never a blank screen or a spinner that does not stop.

## Test 31 - Title: Phone switched off mid-receipt

### What will be tested?
You will switch the phone off the moment a receipt is saved. A pass means the receipt is either
saved with every line or not saved at all — never half a receipt.

### What do you need before starting?
- A new receipt with two lines, on step 3 (**Review**).

### Steps
1. Tap **Save receipt**, then immediately hold the power button and switch the phone off.
2. Switch the phone on and open the app.
3. Open **Stock** and look at the **Receipts** list.

### What's the expected output?
- After step 2, you are still signed in.
- In the **Receipts** list, either the receipt is there and its page shows **both** lines, or it is
  not in the list at all. A receipt with only one of the two lines is a failure.

## Test 32 - Title: Call or notification mid-form

### What will be tested?
You will be interrupted while filling in a new item. A pass means what you typed is still there when
you come back.

### What do you need before starting?
- In the **New item** form (from **Add item** on the Inventory screen), with a name typed in **Pack name**.

### Steps
1. Receive a phone call, or open a notification that takes you to another app.
2. Return to the app.

### What's the expected output?
- The **New item** form is still open, and **Pack name** still has the name you typed.

## Test 33 - Title: App swiped away, and left in the background

### What will be tested?
You will close the app fully, then leave it in the background for a while. A pass means it comes
back signed in and the stock screens still load.

### What do you need before starting?
- On **Inventory**.

### Steps
1. Swipe the app away from the recent-apps list.
2. Reopen it.
3. Switch to another app and leave this one in the background for ten minutes.
4. Return to it and tap any item in the Inventory list.

### What's the expected output?
- After step 2, you are still signed in and not asked to sign in again.
- After step 4, you are still signed in, and the item's page opens with its stock.

## Test 34 - Title: Storage almost full, and a wrong clock

### What will be tested?
You will save a receipt with the phone nearly full, then move the phone's date forward. A pass means
saving still works, and the expiry badges follow the phone's date.

### What do you need before starting?
- A phone with almost no free storage. If you do not have one, skip step 1.
- An item with a lot that expires tomorrow (receive one on a new receipt if needed).

### Steps
1. Open **Stock** and save a new receipt with one line.
2. In the phone's settings, set the date one day ahead.
3. Open the app and tap the item whose lot expires tomorrow.

### What's the expected output?
- After step 1, the receipt saves and its page opens as normal.
- After step 3, in the item's **Lots** section, that lot shows **EXPIRED**, because the badges go by
  the phone's date. Write down anything else that looks wrong. Set the date back afterwards.

## Test 35 - Title: Phone and tablet

### What will be tested?
You will use Inventory and Stock on a tablet and then on a phone. A pass means the tablet shows the
list and the item side by side, while the phone shows one screen at a time.

### What do you need before starting?
- A tablet wide enough to show the side menu all the time, signed in with the same account.

### Steps
1. On the tablet, open **Inventory**.
2. Look at the right side of the screen before tapping anything.
3. Tap **Paracetamol 500mg**.
4. Tap the **⋮** button at the right of a case and tap **Adjust count**.
5. Tap **Cancel**.
6. Open **Stock** and tap **New receipt**.
7. Do steps 1, 3 and 4 on the phone.

### What's the expected output?
- After step 2, the tablet shows the list on the left, and the right side reads "Choose an item to
  see its lots, cases and history."
- After step 3, the list stays on the left and Paracetamol's page opens on the right.
- After step 4, on the tablet, **Adjust count** opens as a box in the middle of the screen.
- After step 6, on the tablet, the **Review** column stays visible on the right while you fill in the delivery and lines.
- On the phone, tapping the item opens its own full-screen page, and **Adjust count** slides up from the bottom.
