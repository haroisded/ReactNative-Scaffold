# Inventory and Stock — acceptance tests

Covers the **Inventory** screen (its list, an item's page, and the item form), and the **Stock** screen
(**Receipts** and **Suppliers**): adding stock items, receiving stock on a receipt, adjusting, writing
off and returning stock, and voiding a receipt.

Run the tests in order: later tests use the items, supplier and receipts the earlier ones make.

---

## Group 1 — Normal use

## Test 1 - Title: Add a supplier

### What will be tested?
A supplier can be added from the Stock screen and appears in its list.

### What do you need before starting?
- Signed in, inside a system, internet on, on a phone.

### Steps
1. Open the side menu.
2. Tap **Stock**.
3. Tap **Suppliers** at the top.
4. Tap **Add supplier**.
5. Type `Test Pharma Supply` in **Name**.
6. Type `7` in **Lead time**.
7. Tap **Save**.

### What's the expected output?
- The form closes and **Test Pharma Supply** appears in the Suppliers list with a code starting **SUP-**.
- It shows as **Active**.

## Test 2 - Title: Add sample item 1 — a boxed medicine

### What will be tested?
A stock item counted in boxes of tablets can be created.

### What do you need before starting?
- Test 1 done.

### Steps
1. Open the side menu and tap **Inventory**.
2. Tap **Add item**.
3. Type `Paracetamol 500mg` in **Name**.
4. Under **Pack type**, tap **Sellable**.
5. Type `box` in **Pack unit**.
6. Type `tablet` in **Base unit**.
7. Type `10` in **Units per pack**.
8. Type `20` in **Reorder at**.
9. Type `30` in **Expiry alert**.
10. Type `Pharmacy shelf 1` in **Storage location**.
11. Tap **Save**.

### What's the expected output?
- The item's page opens with the title **Paracetamol 500mg**.
- It shows **0 box** on hand and **Lots (0)**, with the line "No stock yet. It arrives through a receipt on the Stock screen."
- The details show **1 box = 10 tablet**, **Reorder at 20 tablet** and **Location Pharmacy shelf 1**.

## Test 3 - Title: Add sample item 2 — a variant with serial numbers

### What will be tested?
An item can be made a variant of a new group, and tracked by serial number.

### What do you need before starting?
- On the **Inventory** screen.

### Steps
1. Tap **Add item**.
2. Turn on **Variant**.
3. Tap **Variant of** and choose **New group**.
4. Type `Phone charger` in **New group name**.
5. Type `USB-C, 20W` in **Variant attributes**.
6. Type `Charger USB-C 20W` in **Name**.
7. Type `pc` in **Pack unit**.
8. Leave **Units per pack** at `1`.
9. Turn on **Serial numbers**.
10. Tap **Save**.
11. Tap the back arrow.

### What's the expected output?
- The Inventory list shows a **Phone charger** heading with **1 variant**, and under it a row named **USB-C / 20W**.
- **Paracetamol 500mg** is listed below the group, not inside it.

## Test 4 - Title: Receive stock on a receipt with cases and freight

### What will be tested?
A receipt with two lines, one of them in cases, saves and adds stock to both items.

### What do you need before starting?
- Tests 1–3 done.

### Steps
1. Open **Stock** and tap **Receipts** at the top.
2. Tap **New receipt**.
3. Tap **Supplier** and choose **Test Pharma Supply**.
4. Type `INV-1001` in **Invoice / DR number**.
5. Type `50` in **Freight**.
6. Tap **Next**.
7. Tap **Add line**.
8. Tap **Item** and choose **Paracetamol 500mg**.
9. Turn on **Cases** ("Received in cases").
10. Type `2` in **Cases**.
11. Type `5` in **box per case**.
12. Type `200` in **Cost per case**.
13. Tap **Expires on** and pick a date 20 days from today.
14. Tap **Save line**.
15. Tap **Add line**.
16. Tap **Item** and choose **Charger USB-C 20W**.
17. Type `3` in **pc**.
18. Type `SN-001, SN-002, SN-003` in **Serials**.
19. Type `150` in **Cost per pc**.
20. Tap **Save line**.
21. Tap **Next**.
22. Look at the Review.
23. Tap **Save receipt**.

### What's the expected output?
- The Review shows both lines, the freight of 50, and a total that includes it.
- After saving, the receipt opens with a code starting **RC-** and the status **Full**.
- The Paracetamol line reads **2 cases × 5 box** and **100 of 100 tablet left**, and shows a share of the freight.
- Opening the Paracetamol line shows two cases; opening a case shows its five boxes.

## Test 5 - Title: The Inventory list shows packs, loose units and badges

### What will be tested?
The list row reads the stock in packs plus loose units, and shows the Expiring badge.

### What do you need before starting?
- Test 4 done.

### Steps
1. Open **Inventory**.
2. Look at the **Paracetamol 500mg** row.
3. Look at the **USB-C / 20W** row.

### What's the expected output?
- Paracetamol reads **10 box**, has a **Sellable** chip and an **EXPIRING** badge (its lot expires within the 30-day alert).
- The charger reads **3 pc**.

## Test 6 - Title: Open a box and see loose units

### What will be tested?
Removing part of a box shows the rest as loose units, and the box as open.

### What do you need before starting?
- On **Paracetamol 500mg**'s page.

### Steps
1. Scroll to **Cases**.
2. Tap the **⋮** menu on the first case.
3. Tap **Adjust count**.
4. Type `-3` in the change field.
5. Type `Counted short on the shelf` in the note.
6. Tap **Adjust count**.

### What's the expected output?
- The dialog closes.
- The top of the page reads **9 box + 7 tablet**.
- **History** shows **Adjusted** with **−3 tablet** and the note.

## Test 7 - Title: Write off expired or damaged stock

### What will be tested?
A write-off takes a reason and a note, and is listed in the history.

### What do you need before starting?
- On **Paracetamol 500mg**'s page.

### Steps
1. Scroll to **Cases** and tap the **⋮** menu on the second case.
2. Tap **Write off**.
3. Type `5` in the amount.
4. Choose **Damaged** as the reason.
5. Type `Crushed box` in the note.
6. Tap **Write off**.

### What's the expected output?
- The count drops by 5 tablets.
- **History** shows **Written off**, **−5 tablet**, **damaged** and **Crushed box**.

## Test 8 - Title: Return a serial item to the supplier

### What will be tested?
A serial-tracked item moves one pack at a time, and can go back to its supplier.

### What do you need before starting?
- Test 4 done.

### Steps
1. Open **Inventory** and tap **USB-C / 20W**.
2. Look under **Lots** and **Packs**.
3. Tap the **⋮** menu on the pack **SN-002**.
4. Tap **Return to supplier**.
5. Type `1`.
6. Type `Faulty port` in the note.
7. Tap **Return to supplier**.

### What's the expected output?
- The lot has no **⋮** menu — only the packs do — and all three packs are listed with their serials.
- (The same is true of Paracetamol's lot from Test 4: all of its stock sits in cases, so only the cases have a menu.)
- After saving, the item reads **2 pc**, and **History** shows **Returned**.

## Test 9 - Title: The opening stock from before this update

### What will be tested?
Stock items that already had a quantity before receipts existed now have an opening-stock receipt.

### What do you need before starting?
- A stock item that had a quantity on hand before this version was installed. If none existed, write "no old stock" in the report and skip this test.

### Steps
1. Open **Stock** and tap **Receipts**.
2. Find the receipt whose supplier reads **Opening stock**.
3. Tap it.
4. Open **Inventory** and tap the old item.

### What's the expected output?
- The receipt is headed **Opening stock** and lists each old item with the quantity it had.
- The old item's page shows the same quantity on hand, and its lot says **opening stock**.
- Its **⋮** menu greys out **Return to supplier**.

## Test 10 - Title: Void a receipt nothing has been taken from

### What will be tested?
A receipt whose stock is untouched can be voided, and its stock leaves.

### What do you need before starting?
- On **Stock → Receipts**.

### Steps
1. Tap **New receipt**.
2. Choose **Test Pharma Supply**, then tap **Next**.
3. Add one line: **Paracetamol 500mg**, `1` box, cost `20`.
4. Tap **Next**, then **Save receipt**.
5. Note Paracetamol's quantity on the Inventory screen.
6. Go back to the receipt and tap **Void**.
7. Type `Entered twice` as the reason.
8. Tap **Void receipt**.

### What's the expected output?
- The receipt shows **Voided** with today's date and the reason.
- Paracetamol's quantity is back to what it was before step 1.
- The receipt's status in the Receipts list reads **Void**.

## Test 11 - Title: Edit sample item 1

### What will be tested?
An item with stock can be edited, but its units per pack and serial switch are locked.

### What do you need before starting?
- On **Paracetamol 500mg**'s page.

### Steps
1. Tap **Edit**.
2. Look at **Units per pack** and **Serial numbers**.
3. Change **Storage location** to `Pharmacy shelf 2`.
4. Tap **Save**.

### What's the expected output?
- **Units per pack** and **Serial numbers** cannot be changed while stock is on hand.
- The page shows **Location Pharmacy shelf 2**.

## Test 12 - Title: Edit sample item 2

### What will be tested?
A variant's attributes can be changed and show in the list.

### What do you need before starting?
- On **USB-C / 20W**'s page.

### Steps
1. Tap **Edit**.
2. Change **Variant attributes** to `USB-C, 25W`.
3. Tap **Save**.
4. Go back to the Inventory list.

### What's the expected output?
- The row under **Phone charger** now reads **USB-C / 25W**.

## Test 13 - Title: Filters and search

### What will be tested?
Source, Type, Category, Status and Low stock narrow the list, and search finds more than the name.

### What do you need before starting?
- On **Inventory**, on a phone.

### Steps
1. Tap the filter button next to search.
2. Tap **Source** and choose **Received via Stock**.
3. Look at the list.
4. Tap **Source** and choose **All**.
5. Tap **Type** and choose **Component**.
6. Look at the list.
7. Tap **Type** and choose **All**.
8. Type `shelf 2` in the search box.
9. Look at the list.
10. Clear the search.

### What's the expected output?
- Step 3: both test items are listed (both came on a supplier's receipt).
- Step 6: neither test item is listed; a "No products match these filters." line and **Clear filters** show if nothing else is a component.
- Step 9: only **Paracetamol 500mg** is listed (its location matches).

## Test 14 - Title: Collapse a variant group

### What will be tested?
A group heading folds its variants away and back.

### What do you need before starting?
- On **Inventory**.

### Steps
1. Tap the **Phone charger** heading.
2. Tap it again.

### What's the expected output?
- Step 1 hides **USB-C / 25W**; the heading still reads **1 variant**.
- Step 2 shows it again.

## Test 15 - Title: View both sample items after all changes

### What will be tested?
Each item's page adds up with what happened to it.

### What do you need before starting?
- Tests 4–12 done.

### Steps
1. Open **Paracetamol 500mg**.
2. Scroll to **History**.
3. Open **USB-C / 25W**.
4. Scroll to **History**.

### What's the expected output?
- Paracetamol's history, newest first: **Written off**, **Adjusted**, **Received** (plus the voided receipt's **Received** and **Voided** lines from Test 10).
- The charger's history: **Returned**, **Received**.

## Test 16 - Title: Delete both sample items

### What will be tested?
An item with stock history cannot be deleted or archived with stock on hand, and says why.

### What do you need before starting?
- On **Inventory**.

### Steps
1. Open **Paracetamol 500mg** and tap **Archive**.
2. Read the message at the bottom.
3. Go back and long-press **Paracetamol 500mg** in the list.
4. Tap **Delete**, then confirm.
5. Read the message.

### What's the expected output?
- Step 2: "Stock is still on hand. Adjust or write it off before archiving." The item stays active.
- Step 5: "This item has stock history, so it cannot be deleted. Archive it once its stock is gone."
- (Stock items are kept for their history; to remove one from the list, write off its stock and then archive it.)

---

## Group 2 — Mistakes and edge cases

## Test 17 - Title: Void a receipt after stock was taken from it

### What will be tested?
A receipt cannot be voided once anything on it has moved.

### What do you need before starting?
- Test 6 done (a count was adjusted on the receipt from Test 4).

### Steps
1. Open **Stock → Receipts** and tap the receipt from Test 4.
2. Tap **Void**.
3. Type `Test` as the reason.
4. Tap **Void receipt**.

### What's the expected output?
- The dialog says "Stock from this receipt has already moved, so it cannot be voided. Correct the item with an adjustment instead."
- The receipt is still **Partial**, not voided.

## Test 18 - Title: Take more than is left

### What will be tested?
A write-off bigger than what is left is refused with a clear message.

### What do you need before starting?
- On **Paracetamol 500mg**'s page.

### Steps
1. Tap **⋮** on a case and tap **Write off**.
2. Type `100000`.
3. Choose **Lost** and type a note.
4. Tap **Write off**.

### What's the expected output?
- "That is more than is left here. Enter a smaller amount." The count does not change.

## Test 19 - Title: Adjust without a note

### What will be tested?
An adjustment asks for a note.

### What do you need before starting?
- On **Paracetamol 500mg**'s page.

### Steps
1. Tap **⋮** on a case and tap **Adjust count**.
2. Type `2`.
3. Leave the note empty.
4. Tap **Adjust count**.

### What's the expected output?
- The dialog stays open and shows "Say why the count changed." Nothing is saved.

## Test 20 - Title: An expired lot

### What will be tested?
A lot past its date is marked **Expired**, in the list and on the item.

### What do you need before starting?
- On **Stock → Receipts**.

### Steps
1. Make a new receipt with one line: **Paracetamol 500mg**, `1` box, cost `20`, **Expires on** yesterday.
2. Save it.
3. Open **Inventory**.
4. Open **Paracetamol 500mg**.

### What's the expected output?
- The list row shows **EXPIRED**.
- On the page, the new lot shows **EXPIRED**; the older lot still shows **EXPIRING**.
- Writing the expired lot off with the reason **Expired** clears the **EXPIRED** badge.

## Test 21 - Title: Serial numbers that do not match the count

### What will be tested?
A serial-tracked line needs one serial per pack.

### What do you need before starting?
- In **New receipt**, on the lines step, supplier chosen.

### Steps
1. Tap **Add line** and choose **Charger USB-C 20W** (now **USB-C / 25W**).
2. Type `2` as the number received.
3. Type only `SN-010` in **Serials**.
4. Tap **Save line**.

### What's the expected output?
- The line is not saved; a message asks for one serial per pack.

## Test 22 - Title: Leave a half-filled receipt

### What will be tested?
Backing out of an unsaved receipt asks first.

### What do you need before starting?
- In **New receipt** with a supplier chosen.

### Steps
1. Press the phone's Back button.
2. Tap **Keep editing**.
3. Press Back again.
4. Tap **Discard**.

### What's the expected output?
- Step 1 shows **Discard this receipt?**.
- Step 2 keeps the receipt as typed.
- Step 4 closes it and no receipt is added to the list.

## Test 23 - Title: Double-tap Save receipt

### What will be tested?
Tapping **Save receipt** twice quickly makes one receipt, not two.

### What do you need before starting?
- A new receipt with one line, on the Review step.

### Steps
1. Tap **Save receipt** twice, quickly.
2. Open **Stock → Receipts**.

### What's the expected output?
- Only one new receipt is listed.

## Test 24 - Title: Duplicate SKU

### What will be tested?
Two items cannot share a SKU.

### What do you need before starting?
- On **Inventory**. Note the SKU shown on **Paracetamol 500mg**'s page.

### Steps
1. Tap **Add item**.
2. Type `Duplicate test` in **Name**.
3. Type the Paracetamol SKU in **SKU**.
4. Tap **Save**.

### What's the expected output?
- "Another product already uses this SKU. Change it, or auto-generate a new one." No item is added.

---

## Group 3 — Accounts

## Test 25 - Title: A second account cannot see this stock

### What will be tested?
Another merchant never sees these items, suppliers or receipts — the most important test in this file.

### What do you need before starting?
- A second Google or Facebook account that has its own system.

### Steps
1. Open the side menu and sign out.
2. Sign in with the second account.
3. Open its system.
4. Open **Inventory**.
5. Open **Stock**, then **Receipts**.
6. Tap **Suppliers**.

### What's the expected output?
- The app returns to sign-in after step 1 without freezing.
- **None** of Paracetamol, the charger, **Test Pharma Supply** or the **RC-** receipts appears, not even for a moment.

## Test 26 - Title: Sign back in as the first account

### What will be tested?
The first account's stock is all still there.

### What do you need before starting?
- Test 25 done.

### Steps
1. Sign out.
2. Sign in with the first account.
3. Open **Inventory**.

### What's the expected output?
- Both test items are listed with the same quantities as before.

## Test 27 - Title: Delete the account

### What will be tested?
Deleting the account removes its stock with it.

### What do you need before starting?
- A throwaway account that has one item and one receipt. Not the main test account.

### Steps
1. Open **Profile**.
2. Delete the account and confirm.
3. Sign in again with the same account.
4. Open **Inventory** and **Stock**.

### What's the expected output?
- Step 2 lands on sign-in.
- After signing up again, the new system's Inventory and Stock screens are empty.

---

## Group 4 — Outside the app

## Test 28 - Title: Internet drops while saving a receipt

### What will be tested?
Losing the connection mid-save gives a clear message and the receipt lands once, when it returns.

### What do you need before starting?
- A new receipt with one line, on the Review step.

### Steps
1. Turn on airplane mode.
2. Tap **Save receipt**.
3. Read the message.
4. Turn airplane mode off.
5. Wait ten seconds.
6. Open **Stock → Receipts**.

### What's the expected output?
- Step 3 says it is waiting for a connection — not an endless spinner.
- After step 5 the receipt is saved once and appears in the list.

## Test 29 - Title: Internet drops while writing off stock

### What will be tested?
A write-off made offline says so, and lands when the connection returns.

### What do you need before starting?
- On an item's page with stock.

### Steps
1. Turn on airplane mode.
2. Open **⋮ → Write off** on a case, fill it in, and tap **Write off**.
3. Read the message.
4. Turn airplane mode off.

### What's the expected output?
- Step 3: "Waiting for a connection. This finishes on its own when you reconnect."
- After step 4 the dialog closes and the count drops once.

## Test 30 - Title: Open Inventory in airplane mode

### What will be tested?
With no connection, the screens say so instead of spinning.

### What do you need before starting?
- The app closed. Airplane mode on.

### Steps
1. Open the app.
2. Open **Inventory**.
3. Open **Stock**.

### What's the expected output?
- An offline message instead of a blank screen or endless spinner (or the last loaded list).

## Test 31 - Title: Phone switched off mid-receipt

### What will be tested?
A receipt is either saved in full or not at all.

### What do you need before starting?
- A new receipt with two lines, on the Review step.

### Steps
1. Tap **Save receipt** and immediately hold the power button and switch the phone off.
2. Switch the phone on and open the app.
3. Open **Stock → Receipts**.

### What's the expected output?
- Still signed in.
- Either the receipt is listed with **both** lines, or it is not listed at all — never with one line.

## Test 32 - Title: Call or notification mid-form

### What will be tested?
What was typed in the item form or a receipt survives an interruption.

### What do you need before starting?
- Halfway through **Add item**, with a name typed.

### Steps
1. Receive a call (or open a notification and another app).
2. Return to the app.

### What's the expected output?
- The form is still open with the name as typed.

## Test 33 - Title: App swiped away, and left in the background

### What will be tested?
The app comes back signed in and working.

### What do you need before starting?
- On **Inventory**.

### Steps
1. Swipe the app away from recent apps.
2. Reopen it.
3. Put it in the background for ten minutes.
4. Return to it and open an item.

### What's the expected output?
- Still signed in after step 2 and step 4, and the item opens.

## Test 34 - Title: Storage almost full, and a wrong clock

### What will be tested?
The screens still open and save; the only clock effect is on sign-in and on expiry badges.

### What do you need before starting?
- A phone with almost no free storage, or skip the first part.

### Steps
1. Open **Stock** and save a receipt.
2. Set the phone's date one day ahead.
3. Open an item whose lot expires tomorrow.

### What's the expected output?
- Step 1 saves normally.
- Step 3 shows the lot as **EXPIRED**: the badges go by the phone's date. Note anything else that looks wrong.

## Test 35 - Title: Phone and tablet

### What will be tested?
The Inventory screen uses two panes on a tablet and one on a phone.

### What do you need before starting?
- A tablet wide enough for the permanent side bar, signed in with the same account.

### Steps
1. Open **Inventory** on the tablet.
2. Tap **Paracetamol 500mg**.
3. Tap **⋮ → Adjust count** on a case.
4. Close the dialog.
5. Do steps 1–3 on the phone.

### What's the expected output?
- On the tablet, the list stays on the left and the item's page opens on the right; before a tap, the right side reads "Choose an item to see its lots, cases and history."
- On the tablet, Adjust opens as a dialog in the middle of the screen.
- On the phone, tapping the item opens its own page, and Adjust slides up as a sheet from the bottom.
- The receipt wizard on the tablet keeps the Review column visible beside each step.
