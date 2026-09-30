# Register and Receipts — acceptance tests

Covers the **Register** screen (where a sale is rung up and paid in cash) and the **Receipts** screen
in the side menu (every sale, its details, and voiding one). Stock screen's own **Receipts** list is
deliveries, not sales, and is covered in the Inventory and Stock tests.

Run the tests in order: later tests use the sales earlier ones make.

A few words used throughout:

- **Tile** — one product's square on the left of the Register (the **Items** tab on a phone).
- **Cart** — the list of what is being sold, with the total and the cash box.
- **Change due** — what to hand back: cash received minus the total.
- **Void** — cancelling a sale after it was made. The sale stays in the list, marked **Void**, and
  its stock goes back on the shelf.
- **(required)** — at the end of a field's name when it must be filled in.

Before any test: the Inventory and Stock tests 1–4 and 9 are done, so **Paracetamol 500mg (tablet)**
is an active product priced `8`, with tablets received into stock.

---

## Group 1 — Normal use

## Test 1 - Title: Sell sample sale 1 — tablets by tapping the tile

### What will be tested?
On the **Register** you add Paracetamol tablets to the cart by tapping its tile, pay in cash, and
complete the sale. A pass means the sale saves with a receipt number, the change is right, and the
tablets leave stock.

### What do you need before starting?
- Signed in, inside the system, internet on, on a tablet.

### Steps
1. Open the side menu and tap **Register**. The Register opens: tiles on the left, the cart on the right.
2. Find the **Paracetamol 500mg (tablet)** tile. Write down the number in its **… left** line.
3. Tap the tile three times.
4. Look at the cart on the right.
5. Type `50` in the **Cash received (required)** field.
6. Look at the **Change due** line under it.
7. Tap **Complete sale · 24.00** at the bottom right.
8. Look at the bottom of the screen.
9. Look at the Paracetamol tile again.

### What's the expected output?
- After step 4 the cart shows **Paracetamol 500mg (tablet)** with **3** between a minus and a plus
  button, **8.00 each**, and **24.00** on the right. **Total** reads **24.00**, and under it
  **Includes tax** with an amount (0.00 if the product has no tax class).
- After step 6 **Change due** reads **26.00**.
- After step 7 the cart empties, the cash box clears, and a bar at the bottom reads
  **SL-00001 saved · change 26.00** (the number may be higher if sales were made before), with
  **View receipt** on its right.
- After step 9 the tile's **… left** number is 3 lower than the one written down in step 2.

## Test 2 - Title: Find a product by search and by barcode

### What will be tested?
On the **Register** you find a product by typing part of its name, then by typing its whole barcode. A
pass means the grid narrows while typing, and a full barcode adds the product straight to the cart.

### What do you need before starting?
- Test 1 done. The Paracetamol barcode, from its Inventory page, written down.

### Steps
1. On the Register, tap the **Search name, SKU or barcode** box above the tiles.
2. Type `para`.
3. Look at the tiles.
4. Clear the box, type the whole Paracetamol barcode, and press the keyboard's enter / done key.
5. Look at the search box and the cart.

### What's the expected output?
- After step 3 only tiles with "para" in their name, SKU or barcode are shown; **Paracetamol 500mg (tablet)** is one.
- After step 5 the search box is empty again, and the cart shows **Paracetamol 500mg (tablet)** with **1**.
- A barcode scanner that types into the box and presses enter does the same.

## Test 3 - Title: Change quantities in the cart and use Exact amount

### What will be tested?
In the cart you raise and lower a quantity, remove a line, and pay the exact total. A pass means the
totals follow every change and exact payment gives no change.

### What do you need before starting?
- Test 2 done: Paracetamol is in the cart with **1**.

### Steps
1. In the cart, tap the plus button on the Paracetamol line twice.
2. Look at the line and the **Total**.
3. Tap the minus button once.
4. Tap **Exact amount** beside the cash box.
5. Look at the cash box and **Change due**.
6. Tap **Complete sale · 16.00**.

### What's the expected output?
- After step 2 the line shows **3** and **24.00**; **Total** reads **24.00**.
- After step 3 the line shows **2**; **Total** reads **16.00**, and the green button reads **Complete sale · 16.00**.
- After step 5 the cash box holds **16.00** and **Change due** reads **0.00**.
- After step 6 the bottom bar reads **SL-… saved · change 0.00**.

## Test 4 - Title: Sell sample sale 2 — a recipe and a product with no stock

### What will be tested?
You make a product built from Paracetamol (a recipe) and a service with no stock, then sell both. A
pass means the recipe takes its parts out of stock and the service sells without touching stock.

### What do you need before starting?
- Test 3 done.

### Steps
1. Open the side menu, tap **Products**, then **Add product**. The product form opens full page.
2. Type `Fever pack` as the name, pick a category, and type `20` as the selling price.
3. On the recipe step, turn on **Recipe or bundle**, tap **Add component**, pick
   **Paracetamol 500mg**, and type `2` in **Quantity**.
4. Save it as active.
5. Tap **Add product** again. Type `Blood pressure check`, pick a category, type `50`, turn **Track inventory** off, and save it as active.
6. Open **Register**.
7. Look at the **Fever pack** and **Blood pressure check** tiles.
8. Tap **Fever pack** once and **Blood pressure check** once.
9. Type `100` in **Cash received (required)** and tap **Complete sale · 70.00**.
10. Tap **View receipt** in the bottom bar.

### What's the expected output?
- After step 7 both tiles show their price and no **… left** line.
- After step 9 the bar reads **SL-… saved · change 30.00**.
- After step 10 the receipt page opens with the SL number as its title and **Paid · cash** under it.
  **Items (2)** lists **Fever pack** and **Blood pressure check**.
- **Stock drawn** lists one line for **Paracetamol 500mg**, its grey line starting **Used**, with
  **-2 tablet** on the right. Nothing is listed for **Blood pressure check**.

## Test 5 - Title: Receipts list and a receipt's details

### What will be tested?
On the **Receipts** screen in the side menu you look at every sale made so far and open one. A pass
means every sale appears once, newest first, and its page shows the lines, the cash and the stock it took.

### What do you need before starting?
- Tests 1–4 done, on a tablet.

### Steps
1. Open the side menu and tap **Receipts** (under **Register**).
2. Look at the table.
3. Tap the row for sample sale 1 (**24.00**, the oldest).
4. Look at the page.

### What's the expected output?
- After step 2 the header reads **Receipts** and **3 sales**. The table has **Date / time**,
  **Receipt**, **Items**, **Total**, **Status** columns; the newest sale is at the top; all read **Paid**.
- After step 4 the page shows **Sold** with the date and time, **Cash received 50.00**, **Change 26.00**.
  **Items (1)** reads **3 × 8.00** and **24.00**, then **Total 24.00**.
- **Stock drawn** lists **Paracetamol 500mg**, its grey line reading **Sold ·** and the pack code it
  came from, with **-3 tablet** on the right.
  On **Stock → Receipts**, that pack's count is 3 lower.

## Test 6 - Title: Void sample sale 1

### What will be tested?
On sample sale 1's page you void it with a reason. A pass means the sale is marked **Void** but stays
in the list, and its 3 tablets go back to the pack they came from.

### What do you need before starting?
- Test 5 done, on sample sale 1's page.

### Steps
1. Tap **Void** at the top right. The **Void sale** dialog opens.
2. Tap **Void sale** without typing a reason.
3. Look under the **Reason (required)** field.
4. Type `Customer changed mind` in **Reason (required)**.
5. Tap **Void sale**.
6. Look at the page.
7. Open **Register** and look at the Paracetamol tile's **… left** number.

### What's the expected output?
- After step 3 red text reads **Say why this sale is being voided.** and the dialog stays open.
- After step 5 the dialog closes. The top of the page reads **Void**, the **Void** button is gone,
  and a red-bordered box reads **Voided** with the date and time, and **Customer changed mind** under it.
- **Stock drawn** now also lists **Paracetamol 500mg**, **Voided ·** the same pack code, **+3 tablet**.
- On **Receipts**, sample sale 1 is still listed, reads **Void** in grey, and its total is struck through.
- After step 7 the number is 3 higher than before step 1.

## Test 7 - Title: Void sample sale 2

### What will be tested?
You void the recipe sale from test 4. A pass means the two tablets the recipe used go back.

### What do you need before starting?
- Test 6 done.

### Steps
1. On **Receipts**, tap sample sale 2 (**70.00**).
2. Tap **Void**, type `Wrong items rung up`, tap **Void sale**.

### What's the expected output?
- The page reads **Void**. **Stock drawn** lists **Voided** and **+2 tablet** for **Paracetamol 500mg**.
- No stock line appears for **Blood pressure check**.

## Group 2 — Mistakes and edge cases

## Test 8 - Title: Not enough cash

### What will be tested?
You try to complete a sale with less cash than the total. A pass means nothing is saved.

### What do you need before starting?
- On the Register with Paracetamol **1** in the cart (Total **8.00**).

### Steps
1. Type `5` in **Cash received (required)**.
2. Tap **Complete sale · 8.00**.
3. Clear the cash box and tap **Complete sale · 8.00** again.

### What's the expected output?
- After step 2 red text under the cash box reads **Enter at least the total.**; **Change due** shows no
  amount; the cart is unchanged; no bottom bar appears.
- After step 3 the same red text shows. **Receipts** has no new sale.

## Test 9 - Title: More than is left on the shelf

### What will be tested?
You try to sell more tablets than stock holds. A pass means the sale is refused with a plain message
and no stock moves.

### What do you need before starting?
- On the Register. The Paracetamol tile's **… left** number noted.

### Steps
1. Tap the Paracetamol tile once.
2. In the cart, tap the plus button until the quantity is higher than the **… left** number.
3. Tap **Exact amount**, then **Complete sale**.

### What's the expected output?
- A red message above the button reads **Not enough Paracetamol 500mg left for this sale. Lower the
  quantity, or receive more stock first.**
- The cart keeps its line. **Receipts** has no new sale; the tile's number is unchanged.
- Lowering the quantity with the minus button makes the red message disappear.

## Test 10 - Title: Stock that has only expired packs

### What will be tested?
You receive a pack whose expiry date has passed and try to sell from it. A pass means expired packs
are never sold.

### What do you need before starting?
- A new item, **Syrup 60ml**, sold by the pack, with a selling price, and one pack received on a
  receipt with an expiry date in the past.

### Steps
1. Open **Register** and look at the **Syrup 60ml** tile.
2. Tap it.

### What's the expected output?
- The tile reads **Out of stock** in red and looks faded; tapping it adds nothing to the cart.

## Test 11 - Title: Product no longer sold

### What will be tested?
A product is archived while it is in the cart. A pass means the sale is refused and names the product.

### What do you need before starting?
- Two devices, or the phone and tablet, signed in as the same person.

### Steps
1. On the tablet, add **Fever pack** to the cart.
2. On the phone, open **Products → Fever pack** and archive it.
3. On the tablet, tap **Exact amount**, then **Complete sale**.
4. Leave the Register and come back.

### What's the expected output?
- After step 3 red text reads **Fever pack can no longer be sold. Remove it from the cart.** No sale is saved.
- After step 4 the **Fever pack** tile is gone.

## Test 12 - Title: Only Products appear — never Rentables or bare Inventory items

### What will be tested?
You check what the Register offers. A pass means only published products appear.

### What do you need before starting?
- An Inventory item with a draft that has no price (**Needs price**), and at least one rental item, if any exist.

### Steps
1. Open **Register** and scroll through the tiles.

### What's the expected output?
- Items still marked **Needs price** on Products do not appear. No rental item appears.
- If nothing at all is published, the left side reads **No products to sell. Publish one in Products.**

## Test 13 - Title: Double-tap, Back, and voiding twice

### What will be tested?
You tap **Complete sale** twice fast, press Back in the void dialog, and try to void a voided sale. A
pass means one sale, one void.

### What do you need before starting?
- On the Register with Paracetamol **1** in the cart and `10` typed as cash.

### Steps
1. Tap **Complete sale · 8.00** twice, quickly.
2. Open **Receipts**.
3. Open the newest sale, tap **Void**, then press the phone's Back button (or tap **Cancel**).
4. Look at the page.

### What's the expected output?
- After step 2 exactly one new sale for **8.00** is in the list.
- After step 4 the sale still reads **Paid · cash**. A voided sale shows no **Void** button at all.

## Group 3 — Accounts

## Test 14 - Title: Sign out with items in the cart

### What will be tested?
You sign out mid-sale. A pass means nothing is saved and nothing freezes.

### What do you need before starting?
- Paracetamol in the cart.

### Steps
1. Open **Profile** from the side menu and sign out.
2. Sign back in as the same person and open **Register** and **Receipts**.

### What's the expected output?
- The app lands on sign-in after step 1.
- After step 2 the cart is empty, and **Receipts** lists the same sales as before — no new one.

## Test 15 - Title: A different account sees none of the sales

### What will be tested?
You sign in as a different person. A pass means none of the first person's products or sales appear,
even for a moment.

### What do you need before starting?
- A second account.

### Steps
1. Sign out and sign in as the second person. Open their system.
2. Open **Register**, then **Receipts**.

### What's the expected output?
- **Register** shows none of Paracetamol, Fever pack or Blood pressure check — not even briefly.
- **Receipts** reads **No sales yet. Every sale made on the Register lands here.**

## Test 16 - Title: Delete account

### What will be tested?
You delete the second account. A pass means signing up again starts with no sales.

### What do you need before starting?
- Test 15 done, signed in as the second person.

### Steps
1. Delete the account from **Profile**.
2. Sign up again with the same Google or Facebook account and create a system.
3. Open **Receipts**.

### What's the expected output?
- **Receipts** reads **No sales yet. Every sale made on the Register lands here.**

## Group 4 — Outside the app

## Test 17 - Title: Internet drops while completing a sale

### What will be tested?
You lose internet as you complete a sale. A pass means the sale is saved once, or clearly not — never twice.

### What do you need before starting?
- Paracetamol in the cart, cash typed.

### Steps
1. Turn on airplane mode.
2. Tap **Complete sale**.
3. Look at the button and above it.
4. Turn airplane mode off and wait 10 seconds.
5. If the cart is still there, tap **Complete sale** again.
6. Open **Receipts**.

### What's the expected output?
- After step 3 an offline message shows above the button instead of an endless spinner.
- After step 6 exactly one new sale for the cart's total is listed — never two.

## Test 18 - Title: Open the Register and Receipts in airplane mode

### What will be tested?
You open both screens with no internet. A pass means an offline message, not a blank screen.

### What do you need before starting?
- The app closed fully (swiped away), airplane mode on.

### Steps
1. Open the app and open **Register**.
2. Open **Receipts**.

### What's the expected output?
- **Register** reads **You're offline. Products will load when you reconnect.**
- **Receipts** reads **You're offline. Receipts will load when you reconnect.**
- Turning airplane mode off loads both without restarting.

## Test 19 - Title: Phone switched off, app swiped away, left in background

### What will be tested?
The app is interrupted mid-sale. A pass means you are still signed in and no half sale exists.

### What do you need before starting?
- Paracetamol in the cart.

### Steps
1. Swipe the app away from recent apps and reopen it. Open **Register** and **Receipts**.
2. Put Paracetamol in the cart, switch the phone off, switch it on, open the app.
3. Leave the app in the background for 10 minutes, then return and complete a sale.

### What's the expected output?
- After steps 1 and 2 you are still signed in, the cart is empty, and no new sale is in **Receipts**.
- After step 3 the sale completes without signing in again.

## Test 20 - Title: A call or notification mid-sale

### What will be tested?
A call arrives while cash is being typed. A pass means the cart and the cash are still there.

### What do you need before starting?
- Paracetamol in the cart, `20` typed in **Cash received (required)**.

### Steps
1. Have someone call the phone, answer, hang up, and return to the app.

### What's the expected output?
- The cart and the `20` in the cash box are still there; **Change due** still reads **12.00**.

## Test 21 - Title: Storage almost full, and wrong clock

### What will be tested?
The phone is nearly full, or its clock is off. A pass means sales still save.

### What do you need before starting?
- Phone storage almost full; separately, the clock set 5 minutes wrong.

### Steps
1. Complete a sale in each situation.

### What's the expected output?
- Both sales save and appear in **Receipts**. With the wrong clock, a sale's time on **Receipts** follows the phone's clock — note it.

## Test 22 - Title: Phone and tablet

### What will be tested?
You compare the Register and Receipts on a phone and a tablet. A pass means each fits its screen.

### What do you need before starting?
- Signed in on a phone and a tablet.

### Steps
1. On the tablet, open **Register**, then **Receipts**.
2. On the phone, open **Register**.
3. Tap a tile twice, then look at the **Items | Cart** switch at the top.
4. Tap **Cart**.
5. On the phone, open **Receipts** and a sale, and tap **Void**.

### What's the expected output?
- After step 1 the Register shows tiles and cart side by side; **Receipts** is a table with five columns.
- After step 2 the Register shows an **Items | Cart** switch at the top and only the tiles below it.
- After step 3 **Cart** carries a small coloured badge reading **2**.
- After step 4 the cart, the total, the cash box and the **Complete sale** button fill the screen.
  Nothing slides up from the bottom to take payment.
- After step 5 on the phone **Receipts** is a list of cards, and **Void sale** opens as a sheet from the bottom.
