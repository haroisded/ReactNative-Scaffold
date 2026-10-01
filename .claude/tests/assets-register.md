# Assets and Register together — acceptance tests

Covers what passes between **Assets** and the **Register**: which assets the Register offers, and an
asset archived while it is in the Register's cart. Each screen on its own is covered in the Assets
tests and the Register and Receipts tests.

**Words used in this file**

- **The side menu** — the list of places inside a system. On a phone it slides in from the left when
  you tap the **☰** menu button at the top left. **Assets** and **Register** are both under **Store**.
- **Asset** — one thing the Register can sell, made from an Inventory item.
- **Tile** — one asset's square on the Register (the **Items** tab on a phone).

Before any test: Inventory and Stock tests 1–4, Inventory Test 1 and Assets tests 1–3 and 12 done, so
**Paracetamol 500mg (tablet)** is active at **8.00** with tablets in stock.

---

## Group 1 — Normal use

## Test 1 - Title: The Register offers only active assets

### What will be tested?
You will look at an asset still waiting for a price on **Assets**, then at the Register's tiles. A pass
means the Register sells only assets that are priced and **Active**.

### What do you need before starting?
- **Rice 5kg (sack)** is on **Assets** with **Needs price**. If it is not, tap **Add from Inventory**
  on **Assets**, tap **Rice 5kg**, and leave the form that opens with the back arrow without saving.

### Steps
1. Open the side menu, tap **Store**, then **Assets**. Look at the **Rice 5kg (sack)** row.
2. Open the side menu, tap **Store**, then **Register**. Scroll through the tiles.
3. Go to **Home**, make a new system with **Create New System**, and open it.
4. Open the side menu, tap **Store**, then **Register**.

### What's the expected output?
- After step 1 the **Rice 5kg (sack)** row reads **Needs price**.
- After step 2 there is a **Paracetamol 500mg (tablet)** tile and no **Rice 5kg** tile.
- After step 4 the tiles' side of the Register (the **Items** tab on a phone) reads **No products to
  sell. Publish one in Assets.**

---

## Group 2 — Mistakes and edge cases

## Test 2 - Title: An asset archived while it is in the cart

### What will be tested?
You will archive an asset on one device while it sits in the Register's cart on another. A pass means
the sale is refused and names the asset, so nothing is sold that the shop stopped selling.

### What do you need before starting?
- A phone and a tablet signed in as the same person, in the system from before Test 1's step 3.

### Steps
1. On the tablet, open the side menu, tap **Store**, then **Register**. Tap the **Paracetamol 500mg
   (tablet)** tile once.
2. On the phone, open the side menu, tap **Store**, then **Assets**, and tap **Paracetamol 500mg
   (tablet)**. Its page opens.
3. On the phone, tap **Archive** on that page.
4. On the tablet, tap **Exact amount** beside the cash box, then **Complete sale**.
5. On the tablet, open **Assets** from **Store** in the side menu, then **Register** again.
6. On the phone, tap **Restore** where **Archive** was, then **Edit**, and **Save as active** on the
   **Review** step.

### What's the expected output?
- After step 4 red text above the button names **Paracetamol 500mg** and reads **… can no longer be
  sold. Remove it from the cart.** No sale is saved.
- After step 5 there is no **Paracetamol 500mg (tablet)** tile.
- After step 6 the asset's page on the phone reads **Active** at **8.00**, and the tile is back on the
  tablet's Register after leaving it and coming back.

---

## Group 3 — Accounts

Each screen's own tests cover sign-out and a second account. Nothing here passes between screens that
depends on who is signed in.

## Group 4 — Outside the app

Each screen's own tests cover airplane mode, interruptions and phone and tablet. Nothing here passes
between screens that depends on the phone.
