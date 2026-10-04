# Assets — acceptance tests

Covers the **Assets** screen on its own: what it lists, its one way to add (**Add from Inventory**),
pricing an asset, and archive and delete. Assets used to be called **Products**. The side menu that
leads here is covered in the side menu tests, and moving between Inventory and Assets in the Inventory
and Assets tests.

**Words used in this file**

- **The side menu** — the list of places inside a system. On a phone it slides in from the left when
  you tap the **☰** menu button at the top left. On a wide tablet it is a bar on the left edge.
- **Asset** — one thing the Register can sell, made from an Inventory item: one for each way the item
  is sold (for example **Paracetamol 500mg (tablet)** and **Paracetamol 500mg (box)**).
- **Draft** — an asset that has no price yet. The Register does not show it until it is priced and
  made **Active**.
- **An asset's page** — what opens when you tap an asset in the list. Its **Edit** and **Archive**
  buttons sit at the bottom of the screen on a phone and at the top right on a tablet; **Delete** is a
  red bin icon at the top right on a phone and a red **Delete** button on a tablet.

Before any test: Inventory and Stock tests 2 and 3 and Inventory Test 1 done, so **Paracetamol 500mg**
(sold by the tablet) and **Rice 5kg** exist in Inventory, and both are sold.

---

## Group 1 — Normal use

## Test 1 - Title: Assets has no create button

### What will be tested?
You will open **Assets** and look at its buttons and at one asset's page. A pass means the only way to
add is **Add from Inventory**, so nothing can be sold that is not counted in Inventory.

### What do you need before starting?
- Signed in, inside a system.

### Steps
1. Open the side menu and tap **Store**, then **Assets** under it. The **Assets** screen opens.
2. Look at the buttons at the top right of the screen.
3. Tap **Paracetamol 500mg (tablet)** in the list. Its page opens.

### What's the expected output?
- The title at the top of the screen reads **Assets**, with a count under it such as **2 assets**.
- After step 2 there are two buttons: **Setup**, and **Add from Inventory** — the filled one. There is
  no **Add product** or **Add asset** button anywhere on the screen.
- After step 3 the asset's page has **Edit**, **Archive** and **Delete**, and no **Duplicate** button
  or copy icon.

## Test 2 - Title: Record 1 — price Paracetamol's draft

### What will be tested?
On **Assets**, you will give the **Paracetamol 500mg (tablet)** draft a price and make it active. A pass
means the asset is ready for the Register.

### What do you need before starting?
- Test 1 done.

### Steps
1. On **Assets**, tap **Paracetamol 500mg (tablet)**. Its page opens.
2. Tap **Edit**. The edit form opens on its first step.
3. Go to the **Pricing** step and type `8` in **Selling price**.
4. Go to **Review** and tap **Save as active**.

### What's the expected output?
- After step 1, the page shows **Draft** and has no price.
- After step 4 you are back on **Paracetamol 500mg (tablet)**'s page. It shows **Active** and the
  price **8.00**.
- Back on the **Assets** list, its row no longer shows **Needs price**.

## Test 3 - Title: Record 1 — delete, then bring it back with Add from Inventory

### What will be tested?
On **Assets**, you will delete **Paracetamol 500mg (tablet)** and add it back. A pass means a deleted
asset can always be brought back from Inventory, and comes back as a draft to price again.

### What do you need before starting?
- Test 2 done.

### Steps
1. On **Assets**, tap **Paracetamol 500mg (tablet)**, then **Delete** on its page. A dialog asking to
   delete it opens.
2. Tap **Delete** in that dialog.
3. Tap **Add from Inventory** at the top right. On a phone a sheet slides up from the bottom; on a
   tablet a box opens in the middle of the screen. Its small title reads **Assets**.
4. Tap **Paracetamol 500mg** in the list.

### What's the expected output?
- After step 2, **Paracetamol 500mg (tablet)** is gone from the **Assets** list.
- After step 3, **Paracetamol 500mg** is in the **Add from Inventory** list. **Rice 5kg** is not, if
  its asset is still on the screen.
- After step 4 the **Add from Inventory** box closes and the edit form for **Paracetamol 500mg
  (tablet)** opens, as a **Draft** with no price.

## Test 4 - Title: Record 2 — Rice from start to delete

### What will be tested?
On **Assets**, you will price **Rice 5kg**, view it, archive it and delete it. A pass means the second
record goes through the whole cycle.

### What do you need before starting?
- Test 1 done.

### Steps
1. On **Assets**, tap **Rice 5kg**, tap **Edit**, type `250` in **Selling price** on the **Pricing**
   step, and tap **Save as active** on **Review**.
2. On **Rice 5kg**'s page, tap **Archive**.
3. Tap **Undo** in the bar at the bottom of the screen.
4. Tap **Archive** again, then **Delete**, and **Delete** in the dialog that opens.

### What's the expected output?
- After step 1, **Rice 5kg**'s page shows **Active** and **250.00**.
- After step 2 the page shows **Archived**, and a bar at the bottom offers **Undo**.
- After step 3 it shows **Active** again.
- After step 4 you are back on the **Assets** list, **Rice 5kg** is gone from it, and **Add from
  Inventory** lists **Rice 5kg** again.

## Test 5 - Title: An empty Assets screen

### What will be tested?
With no assets at all, you will look at the middle of the **Assets** screen. A pass means the empty
screen points to **Add from Inventory**, not to a create form.

### What do you need before starting?
- A new system with nothing in it yet (make one from **Your systems**).

### Steps
1. Open the side menu, tap **Store**, then **Assets**.
2. Tap the button in the middle of the screen.

### What's the expected output?
- After step 1 the middle of the screen reads **No assets yet.** with an **Add from Inventory** button
  under it.
- After step 2 the **Add from Inventory** box opens and reads **Every Sellable and Both item in
  Inventory is already on this screen.** — this system has no Inventory items yet.

## Test 6 - Title: Setup still opens

### What will be tested?
On **Assets**, you will open **Setup**. A pass means categories and tax classes are still managed from
here.

### What do you need before starting?
- Test 1 done.

### Steps
1. Tap **Setup** at the top right of **Assets**.

### What's the expected output?
- The **Setup** screen opens with **Assets** as its small title, and lists **Categories** and **Tax
  classes**.

---

## Group 2 — Mistakes and edge cases

## Test 7 - Title: An old product made before Assets

### What will be tested?
If this system had products made directly on the old **Products** screen, you will open one. A pass
means nothing was lost when the create button went away.

### What do you need before starting?
- A system with a product added on the old **Products** screen before this update. If there is none,
  skip this test.

### Steps
1. On **Assets**, find the old product in the list and tap it.
2. Tap **Edit**, change its **Selling price**, and save.

### What's the expected output?
- After step 1 the old product is listed and its page opens as before.
- After step 2 the new price shows on its page.

## Test 8 - Title: Double-tap Add from Inventory, and Cancel

### What will be tested?
On **Assets**, you will tap **Add from Inventory** twice fast, then cancel. A pass means one box opens
and cancelling changes nothing.

### What do you need before starting?
- Test 1 done.

### Steps
1. Tap **Add from Inventory** twice quickly.
2. Tap **Cancel** at the bottom of the **Add from Inventory** box.

### What's the expected output?
- After step 1 one **Add from Inventory** box is open, not two stacked.
- After step 2 the box is gone and the **Assets** list is unchanged.

---

## Group 3 — Accounts

## Test 9 - Title: A different account sees none of these assets

### What will be tested?
You will sign out and sign in as someone else. A pass means none of the first person's assets appear,
even for a moment.

### What do you need before starting?
- Tests 2–4 done. A second account.

### Steps
1. On **Assets**, go to **Profile** and tap **Sign out**.
2. Sign in as the second account and open one of its systems, then **Store** › **Assets**.

### What's the expected output?
- After step 1 the sign-in screen shows, with nothing frozen.
- After step 2 none of the first account's assets appear, not even for a moment.

---

## Group 4 — Outside the app

## Test 10 - Title: Assets in airplane mode

### What will be tested?
With the internet off, you will open **Assets** and **Add from Inventory**. A pass means each shows an
offline message instead of a blank screen or an endless spinner.

### What do you need before starting?
- Airplane mode on, app freshly opened.

### Steps
1. Open the side menu, tap **Store**, then **Assets**.
2. Tap **Add from Inventory**.

### What's the expected output?
- After step 1 the screen says you're offline and assets will load when you reconnect.
- After step 2 the **Add from Inventory** box opens and does not spin forever.
- Turn airplane mode off: the list loads by itself.

## Test 11 - Title: Phone and tablet

### What will be tested?
You will open **Assets** on a phone and on a tablet. A pass means each gets its own layout.

### What do you need before starting?
- One phone and one tablet signed in to the same account.

### Steps
1. On the phone, open **Assets** and tap **Add from Inventory**.
2. On the tablet, open **Assets** and tap **Add from Inventory**.

### What's the expected output?
- On the phone the list is cards, and **Add from Inventory** slides up from the bottom.
- On the tablet the list is a table with checkboxes, and **Add from Inventory** opens as a box in the
  middle.

---

## Added later — Normal use

## Test 12 - Title: An asset saves with no category

### What will be tested?
On **Assets**, you will price **Paracetamol 500mg (tablet)** and leave its category empty. A pass means
the category is optional, and the asset's page names the Inventory item it sells.

### What do you need before starting?
- Test 3 done, so **Paracetamol 500mg (tablet)** is a draft again with no price.

### Steps
1. On **Assets**, tap **Paracetamol 500mg (tablet)**. Its page opens.
2. Look under the price on its page.
3. Tap **Edit**. The edit form opens on its first step.
4. Look at the **Category** field on that step, and leave it empty.
5. Go to the **Pricing** step and type `8` in **Selling price**.
6. Go to **Review** and tap **Save as active**.

### What's the expected output?
- After step 2 a grey line reads **From Inventory: Paracetamol 500mg**, followed by its SKU.
- After step 4 **Category** has no **(required)** after its name.
- After step 6 it saves with no message about the category, and the asset's page shows **Active** and
  **8.00**.

## Added later — Outside the app

## Test 13 - Title: Setup's New category on a phone and a tablet

> Retired by assets.md Test 14.

### What will be tested?
From **Assets**, you will open the new category form on a tablet and on a phone. A pass means it fills
the whole screen on both, instead of opening as a box in the middle.

### What do you need before starting?
- A phone and a tablet signed in to the same account, each on **Assets**.

### Steps
1. On the tablet, tap **Setup** at the top right of **Assets**. The **Setup** screen opens.
2. Tap **New category**.
3. Tap the back arrow at the top left.
4. Do steps 1–3 on the phone.

### What's the expected output?
- After step 2, on both, the **New category** form fills the whole screen with a back arrow at the top
  left — not a box in the middle of the screen.
- After step 3, on both, the **Setup** screen shows again.

## Test 14 - Title: New category, subcategory and tax class as windows on a tablet

### What will be tested?
From **Assets** you will open the forms that make a category, a subcategory and a tax class, on a
tablet and on a phone. A pass means each opens as a window in the middle of the tablet's screen, over the
page you were on, and as a full page on the phone, and that what you make is picked in the field you
came from.

### What do you need before starting?
- A phone and a tablet signed in to the same account, each on **Assets**, with at least one asset.

### Steps
1. On the tablet, tap **Setup** at the top right of **Assets**. The **Setup** screen opens.
2. Tap **New category**. A **New category** window opens.
3. Type `Window Drinks` and tap **Create** at the bottom right of the window.
4. Go back to **Assets**, tap an asset's name, then **Edit** at the top right of its page. On the form
   that opens, find the **Category** field, tap it and pick **Window Drinks**.
5. Tap the **Subcategory** field, then **+ New subcategory** at the bottom of the list. A
   **New subcategory** window opens, with **In Window Drinks** in small red letters above its title.
6. Type `Window Hot` and tap **Create**.
7. Find the **Tax class** field on the form, tap it, then **+ New tax class** at the bottom of the list.
8. Tap **Cancel** at the bottom right of the **New tax class** window, then leave the form without
   saving.
9. On the phone, tap **Setup**, then **New category**, then the back arrow at the top left.

### What's the expected output?
- After steps 2, 5 and 7, each window sits in the middle of the tablet screen, with the page you came
  from showing through a grey shade behind it, its title at the top and **Cancel** and **Create** at its
  bottom right. It does not fill the screen.
- After step 3, the window closes and **Window Drinks** is in **Setup**'s categories.
- After step 6, the window closes and the **Subcategory** field reads **Window Hot**.
- After step 8, the form shows again with the **Tax class** field as it was.
- After step 9, on the phone, **New category** filled the whole screen with a back arrow at the top left,
  and Back returned to **Setup**.
