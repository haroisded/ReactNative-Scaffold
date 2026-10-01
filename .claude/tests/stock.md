# Stock — acceptance tests

Covers the **Stock** screen on its own: its **Receipts** list of deliveries, the receipt form, and
**Suppliers**. Older Stock tests are in the Inventory and Stock tests; the tests here replace the ones
retired there. Sales receipts are a different screen, under **Store**, covered in the Receipts tests.

**Words used in this file**

- **The side menu** — the list of places inside a system. On a phone it slides in from the left when
  you tap the **☰** menu button at the top left. **Stock** is under **Resources** in it.
- **Receipt** — on this screen, one delivery from a supplier, not a sale.

Before any test: Inventory and Stock tests 1–4 done, so **Test Pharma Supply** and **Paracetamol
500mg** exist and one receipt has been saved.

---

## Group 1 — Normal use

Inventory and Stock tests 4–7, 12, 15 and 42 still cover receiving, returning and voiding; nothing in
them changed.

---

## Group 2 — Mistakes and edge cases

## Test 1 - Title: Back on a half-filled receipt, and Save receipt tapped twice

### What will be tested?
You will press Back on a receipt you have started, then save one with two fast taps. A pass means a
half-typed receipt is never lost by accident, and two fast taps save one receipt, not two.

### What do you need before starting?
- On a phone.

### Steps
1. Open the side menu, tap **Resources**, then **Stock**. The **Receipts** list shows.
2. Tap **Stock receipt**. The receipt form opens.
3. Choose **Test Pharma Supply** in **Supplier**.
4. Press the phone's back button.
5. Tap **Keep editing** in the **Discard this receipt?** window.
6. Fill in the rest of the receipt the same way as Inventory and Stock Test 5 steps 2–12, until
   **Review** opens.
7. Tap **Save receipt** twice quickly.

### What's the expected output?
- After step 4 a window titled **Discard this receipt?** opens over the form.
- After step 5 the window is gone and the form is still open, with **Test Pharma Supply** still in
  **Supplier**.
- After step 7 the **Receipts** list shows, with exactly one new receipt from **Test Pharma Supply** at
  the top — not two.

---

## Group 3 — Accounts

## Test 2 - Title: A different account sees none of the stock, and the first gets it back

### What will be tested?
You will sign in as someone else, then come back. A pass means the second person never sees the first
person's receipts or suppliers, not even for a moment, and the first person's are all still there
afterwards.

### What do you need before starting?
- A second Google or Facebook account.

### Steps
1. On **Stock**, write down how many receipts the **Receipts** list shows, then tap **Suppliers** and
   write down the suppliers.
2. Open **Profile** and tap **Sign out**. The sign-in screen shows.
3. Sign in with the second account and open one of its systems.
4. Open the side menu, tap **Resources**, then **Stock**. Look at **Receipts**, then tap **Suppliers**.
5. Open **Profile**, tap **Sign out**, and sign in again with the first account.
6. Open the same system as in step 1, then **Stock**, and look at **Receipts** and **Suppliers**.

### What's the expected output?
- After step 4 no receipt and no supplier from step 1 — not **Test Pharma Supply** — appears, not even
  for a moment.
- After step 6 **Receipts** and **Suppliers** show the same as in step 1.

---

## Group 4 — Outside the app

Inventory and Stock tests 34–38 still cover airplane mode, the phone switching off, calls, storage and
the clock.

## Test 3 - Title: Phone and tablet

### What will be tested?
You will open **Stock**'s receipts, the receipt form and the new supplier form on a tablet and on a
phone. A pass means the tablet shows the wide layout, the phone the narrow one, and the new supplier
form fills the whole screen on both.

### What do you need before starting?
- A phone and a tablet signed in to the same account.

### Steps
1. On the tablet, open **Stock**. The **Receipts** list shows.
2. Tap **Stock receipt**. The receipt form opens.
3. Tap the back arrow at the top left, and **Discard** if a window asks.
4. Tap **Suppliers**, then **Add supplier**.
5. Do steps 1–4 on the phone.

### What's the expected output?
- Tablet, step 1: the receipts are a table with columns from **Date / Receipt** to **Location**.
- Tablet, step 2: the receipt form shows every step on the left and the **Review** on the right.
- Tablet, step 4: **New supplier** fills the whole screen with a back arrow at the top left — not a box
  in the middle of the screen.
- Phone: the receipts are cards; the receipt form goes step by step with **Next** and **Skip tier**;
  **New supplier** fills the whole screen, the same as on the tablet.
