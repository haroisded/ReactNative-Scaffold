# Inventory and Assets together — acceptance tests

Covers what passes between **Inventory** and **Assets** (once called **Products**): an Inventory
item's **Selling as** list, opening an asset from it, and Back between the two screens. Each screen on
its own is covered in the Inventory and Stock tests and the Assets tests.

**Words used in this file**

- **The side menu** — the list of places inside a system. On a phone it slides in from the left when
  you tap the **☰** menu button at the top left. **Inventory** is under **Resources** in it, and
  **Assets** under **Store**.
- **Asset** — one thing the Register can sell, made from an Inventory item: one for each way the item
  is sold.
- **Selling as** — a list on an Inventory item's page, near the bottom, of the assets made from it.

Before any test: Inventory and Stock tests 2 and 3 done, so **Paracetamol 500mg** (sold by the tablet)
and **Rice 5kg** exist in Inventory.

---

## Group 1 — Normal use

## Test 1 - Title: An Inventory item's Selling as list opens its asset

### What will be tested?
On **Paracetamol 500mg**'s page in **Inventory**, you will tap its asset under **Selling as**. A pass
means the asset opens on **Assets**, and Back walks through the Assets list to Inventory.

### What do you need before starting?
- On a phone, on **Inventory**.

### Steps
1. Tap **Paracetamol 500mg** in the list. Its page opens.
2. Scroll down to **Selling as** and tap **Paracetamol 500mg (tablet)** in it.
3. Press the phone's back button.
4. Press the phone's back button again.

### What's the expected output?
- After step 2 the asset's page opens, with **Edit** at the bottom.
- After step 3 the **Assets** list shows, with **Assets** as its title.
- After step 4 you are back on **Inventory** — not on **Home**.

## Test 2 - Title: An item with no asset points to Assets

### What will be tested?
You will delete an item's asset on **Assets**, then look at the item in **Inventory**. A pass means
**Selling as** says where to bring it back from, using the screen's new name.

### What do you need before starting?
- Test 1 done. **Rice 5kg** is on **Assets** — if it is not, add it there with **Add from Inventory**
  first.

### Steps
1. Open the side menu, tap **Store**, then **Assets**. Tap **Rice 5kg**, tap **Delete**, and **Delete**
   in the dialog that opens.
2. Open the side menu, tap **Resources**, then **Inventory**, and tap **Rice 5kg**.
3. Look at **Selling as** near the bottom of its page.

### What's the expected output?
- After step 3 **Selling as** reads **No asset yet. Use Add from Inventory on the Assets screen to make
  one.** There is no mention of a **Products** screen.

## Test 3 - Title: Add from Inventory, then the item's Selling as list

### What will be tested?
On **Assets**, you will bring **Rice 5kg** back with **Add from Inventory**, then look at it in
**Inventory**. A pass means the new asset shows under the item straight away.

### What do you need before starting?
- Test 2 done.

### Steps
1. Open **Assets** from **Store** in the side menu, tap **Add from Inventory**, and tap **Rice 5kg**.
   The edit form for its asset opens.
2. Tap the back arrow at the top left to leave the form without saving.
3. Open **Inventory** from **Resources** in the side menu, and tap **Rice 5kg**.

### What's the expected output?
- After step 3 **Selling as** lists **Rice 5kg**'s asset, reading **Needs price** in red at its right.

## Test 4 - Title: Coming back to Assets shows the list

### What will be tested?
You will open an asset from **Inventory**, leave for another screen, and come back to **Assets**. A
pass means **Assets** opens on its list, not on the asset left open earlier.

### What do you need before starting?
- On **Inventory**.

### Steps
1. Tap **Paracetamol 500mg**, then **Paracetamol 500mg (tablet)** under **Selling as**. The asset's
   page opens.
2. Open the side menu, tap **Store**, then **Register**.
3. Open the side menu and tap **Assets** under **Store**.

### What's the expected output?
- After step 3 the **Assets** list shows, with no asset highlighted and no asset's page open.

---

## Group 2 — Mistakes and edge cases

## Test 5 - Title: Double-tap a Selling as row

### What will be tested?
On an Inventory item's page, you will tap its asset under **Selling as** twice quickly. A pass means
one asset page opens, so one Back press leaves it.

### What do you need before starting?
- On **Paracetamol 500mg**'s page in **Inventory**, on a phone.

### Steps
1. Tap **Paracetamol 500mg (tablet)** under **Selling as** twice quickly.
2. Press the phone's back button.

### What's the expected output?
- After step 2 the **Assets** list shows, not a second copy of the asset's page.

---

## Group 3 — Accounts

Each screen's own tests cover sign-out and a second account. Nothing here passes between screens that
depends on who is signed in.

---

## Group 4 — Outside the app

## Test 6 - Title: On a tablet

### What will be tested?
On a tablet, you will open an asset from an Inventory item's page. A pass means the wide layout keeps
the same path back.

### What do you need before starting?
- On a tablet, on **Inventory**.

### Steps
1. Tap **Paracetamol 500mg**. Its page opens beside the list.
2. Tap **Paracetamol 500mg (tablet)** under **Selling as**.
3. Tap the back arrow at the top left of the asset's page.

### What's the expected output?
- After step 2 **Assets** is highlighted in the side bar, and the asset's page fills the screen beside
  the bar.
- After step 3 the **Assets** list shows, as a table.
