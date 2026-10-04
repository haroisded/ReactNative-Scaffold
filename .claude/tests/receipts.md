# Receipts — acceptance tests

Covers the **Receipts** screen under **Store** in the side menu: every sale, a sale's page, and voiding
one. **Stock**'s own **Receipts** list is deliveries, not sales, and is covered in the Stock tests.

**Words used in this file**

- **The side menu** — the list of places inside a system. On a phone it slides in from the left when
  you tap the **☰** menu button at the top left. **Receipts** is under **Store** in it.
- **Void** — cancelling a sale after it was made. The sale stays in the list, marked **Void**, and its
  stock goes back on the shelf.

Before any test: Inventory Test 6 and Assets Test 2 done (**Paracetamol 500mg (tablet)** at **8.00**,
**Active**), and two sales made on **Register** in this order: sample sale 1, 3 tablets paid with
**50.00** (**24.00**); then 2 tablets with **Exact amount** (**16.00**).

---

## Group 1 — Normal use

## Test 1 - Title: The Receipts list and a sale's page

### What will be tested?
On **Receipts** you will look at every sale made so far and open one. A pass means every sale appears
once, newest first, and its page shows the lines, the cash and the stock it took.

### What do you need before starting?
- On a tablet.

### Steps
1. Open the side menu, tap **Store**, then **Receipts**.
2. Look at the table.
3. Tap the row for sample sale 1 (**24.00**, the oldest).
4. Look at the page.

### What's the expected output?
- After step 2 the header reads **Receipts** and **2 sales**. The table has **Date / time**,
  **Receipt**, **Items**, **Total** and **Status** columns; the newest sale is at the top; both read
  **Paid**.
- After step 4 the page shows **Sold** with the date and time, **Cash received 50.00** and **Change
  26.00**. **Items (1)** reads **3 × 8.00** and **24.00**, then **Total 24.00**.
- **Stock drawn** lists **Paracetamol 500mg**, its grey line reading **Sold ·** and the pack code it came
  from, with **-3 tablet** on the right.

## Test 2 - Title: Void sample sale 1

### What will be tested?
On sample sale 1's page you will void it with a reason. A pass means the sale is marked **Void** but
stays in the list, and its 3 tablets go back to the pack they came from.

### What do you need before starting?
- Test 1 done, on sample sale 1's page.

### Steps
1. Tap **Void** at the top right. The **Void sale** dialog opens.
2. Tap **Void sale** without typing a reason.
3. Look under the **Reason (required)** field.
4. Type `Customer changed mind` in **Reason (required)**.
5. Tap **Void sale**.
6. Look at the page.
7. Open **Register** and look at the **Paracetamol 500mg (tablet)** tile's **… left** number.

### What's the expected output?
- After step 3 red text reads **Say why this sale is being voided.** and the **Void sale** dialog stays
  open.
- After step 5 the **Void sale** dialog closes. The top of the page reads **Void**, the **Void** button
  is gone, and a red-bordered box reads **Voided** with the date and time, and **Customer changed
  mind** under it.
- **Stock drawn** now also lists **Paracetamol 500mg**, **Voided ·** the same pack code, **+3 tablet**.
- On **Receipts**, sample sale 1 is still listed, reads **Void** in grey, and its total is struck
  through.
- After step 7 the number is 3 higher than before step 1.

---

## Group 2 — Mistakes and edge cases

Not covered here yet: voiding twice and Back from a receipt were in the Register and Receipts tests,
removed on 2026-10-04.

## Group 3 — Accounts

Not covered here yet: signing out and a second account were in the Register and Receipts tests, removed
on 2026-10-04.

## Group 4 — Outside the app

Not covered here yet: airplane mode, interruptions and phone and tablet were in the Register and
Receipts tests, removed on 2026-10-04.
