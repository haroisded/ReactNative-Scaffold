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

> Retired by stock.md Test 5.

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

## Test 4 - Title: Receipts and Suppliers switch on a tablet

> Retired by stock.md Test 6.

### What will be tested?
You will look at the **Receipts | Suppliers** switch on a tablet. A pass means it takes about half the
width of the page, not all of it, and still switches.

### What do you need before starting?
- Signed in on a tablet held sideways, inside a system.

### Steps
1. Open the side menu's **Resources**, tap **Stock**.
2. Tap **Suppliers**, then **Receipts**.

### What's the expected output?
- The two-part switch under the page title starts at the left and ends about halfway across the page.
- Both words are written out in full, not "…".
- Each tap shows that list and highlights the part you tapped.

---

## Added later — Normal use

## Test 5 - Title: Phone and tablet

### What will be tested?
You will open **Stock**'s receipts, the receipt form and the new supplier form on a tablet and on a
phone. A pass means the tablet shows the wide layout, the phone the narrow one, the receipt form goes one
step at a time on both, and **New supplier** is a window on the tablet but a full page on the phone.

### What do you need before starting?
- A phone and a tablet signed in to the same account.

### Steps
1. On the tablet, open **Stock**. The **Receipts** list shows.
2. Tap **Stock receipt**. The receipt form opens.
3. Tap the back arrow at the top left, and **Discard** if a window asks.
4. Tap **Suppliers**, then **Add supplier**.
5. Tap **Cancel** at the bottom of the form.
6. Do steps 1–5 on the phone.

### What's the expected output?
- Tablet, step 1: the receipts are a table with columns from **Date / Receipt** to **Location**.
- Tablet, step 2: the left of the form shows one step, **Step 1 of 5 — Supplier**, with a red progress
  bar and a **Next** button at the bottom left. The right side is a grey **Review** column with
  **Save receipt** and **Cancel** at its bottom.
- Tablet, step 4: **New supplier** opens as a window in the middle of the screen, with the **Stock** page
  showing through a grey shade behind it, and **Cancel** and **Create** at its bottom right.
- Tablet, step 5: the window closes and the **Suppliers** list shows with nothing added.
- Phone: the receipts are cards; the receipt form goes step by step with **Next** and **Skip tier**, with
  **Review** as its last step; **New supplier** fills the whole screen.

## Test 6 - Title: Receipts and Suppliers switch on a tablet

### What will be tested?
You will look at the **Receipts | Suppliers** switch on a tablet. A pass means it sits at the top right,
beside the add button, at a modest width, and still switches.

### What do you need before starting?
- Signed in on a tablet held sideways, inside a system.

### Steps
1. Open the side menu's **Resources**, tap **Stock**.
2. Tap **Suppliers** in the two-part switch, then **Receipts**.

### What's the expected output?
- The two-part switch is at the top right of the page, on the same line as the **Stock** title, just right
  of the dark **Stock receipt** button. It is about one and a half times as wide as the button, not half
  the page.
- There is no switch on a row of its own under the title any more; the table starts right under the line.
- After tapping **Suppliers**, the dark button reads **Add supplier** and the suppliers list shows; after
  **Receipts**, it reads **Stock receipt** again. The part you tapped is highlighted.
- Both words are written out in full, not "…".

## Test 7 - Title: The receipt form one step at a time on a tablet

### What will be tested?
On a tablet you will step through a new stock receipt. A pass means the left side shows one step at a
time, **Next** moves on, the **Review** on the right fills in as you type, and a failed save takes you to
the step at fault.

### What do you need before starting?
- Signed in on a tablet held sideways, inside a system, on **Stock**.

### Steps
1. Tap **Stock receipt** at the top right. The receipt form opens on **Step 1 of 5 — Supplier**.
2. Tap the **Date received** field and pick a date in the calendar that opens, then tap **OK**.
3. Tap **Next** at the bottom left.
4. Tap **Skip tier** beside **Next** on **Unit Load**, then on **Pallet**, then on **Case**.
5. Look at the bottom of the left side on **Pack**.
6. Tap **Save receipt** at the bottom right without filling in **Pack**.
7. Tap the arrow at the left of the step name, at the top of the left side.
8. Tap the back arrow at the top left of the page, and **Discard** in the window that asks.

### What's the expected output?
- After step 2, the **Review** on the right shows the date beside **Date received**.
- After step 3, the left side shows **Step 2 of 5 · Optional — Unit Load** and the red bar grows.
- After step 4, the left side is on **Step 5 of 5 — Pack**.
- After step 5, there is no **Next** at the bottom of **Pack**: it is the last step, and **Save receipt**
  is on the right.
- After step 6, nothing is saved; the left side stays on (or returns to) the first step with a missing
  field, and that field is marked in red.
- After step 7, the left side goes back one step.
- After step 8, **Stock** shows with no new receipt.

---

## Added later — Mistakes and edge cases

## Test 8 - Title: New supplier window with the keyboard open, and the new supplier picked

### What will be tested?
On a tablet you will add a supplier from inside the receipt form. A pass means the **New supplier**
window stays usable with the keyboard up, and the supplier you make is picked on the receipt straight away.

### What do you need before starting?
- Signed in on a tablet held sideways, inside a system, on **Stock**, internet on.

### Steps
1. Tap **Stock receipt**. The receipt form opens on **Supplier**.
2. Tap the **Supplier** field, then **+ New supplier** at the bottom of the list that opens. A
   **New supplier** window opens over the form.
3. Tap the **Supplier name** field. The keyboard opens.
4. Type `Window Test Supply`.
5. Look at the window while the keyboard is open, then scroll the window's fields up and down.
6. Tap **Create** at the bottom right of the window.
7. Tap the back arrow at the top left of the page, and **Discard** in the window that asks.

### What's the expected output?
- After step 5, the whole window — its title, the fields and **Cancel** and **Create** — sits above the
  keyboard. Nothing is hidden behind the keyboard; the fields scroll inside the window.
- After step 6, the window closes and the receipt's **Supplier** field reads **Window Test Supply**.
- After step 7, **Stock** shows. **Window Test Supply** is in the **Suppliers** list.
