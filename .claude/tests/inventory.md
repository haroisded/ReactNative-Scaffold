# Inventory — acceptance tests

Covers the **Inventory** screen on its own: its list, an item's page and its forms. Older Inventory tests
are in the Inventory and Stock tests; the tests here replace the ones retired there. Moving from an
item to its asset on **Assets** is covered in the Inventory and Assets tests.

**Words used in this file**

- **The side menu** — the list of places inside a system. On a phone it slides in from the left when
  you tap the **☰** menu button at the top left. **Inventory** is under **Resources** in it.
- **Type chip** — the small rounded label in an Inventory row that reads **Sellable**, **Component**
  or **Both**.
- **Selling as** — a list on an item's page, near the bottom, of the assets the Register sells it as.

Before any test: Inventory and Stock tests 1–3 done, so **Paracetamol 500mg** and **Rice 5kg** exist.

---

## Group 1 — Normal use

## Test 1 - Title: Change Rice's type to Both from the list

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

Inventory and Stock tests 19–27 still cover this screen's mistakes; nothing in them changed.

---

## Group 3 — Accounts

## Test 2 - Title: A different account sees none of the Inventory, and the first gets it back

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

Inventory and Stock tests 34–38 still cover airplane mode, the phone switching off, calls, storage and
the clock.

## Test 3 - Title: Phone and tablet

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
