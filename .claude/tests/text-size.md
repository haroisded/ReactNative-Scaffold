# Text size — acceptance tests

Covers how every screen's text looks at the phone's biggest text setting. Each screen on its own is
covered in its own file (`assets.md`, `inventory.md`, `stock.md`, `register-receipts.md`,
`receipts.md`, `home.md`, `profile.md`, `side-menu.md`); this file only checks that text stays
readable everywhere when it is made large.

## Group 1 — Normal use

## Test 1 - Title: Normal text size, every screen

### What will be tested?
With the phone's text size at its normal setting, you will open each main screen. A pass means the
new text sizes read clearly: titles stand out, lists are easy to scan, and money amounts line up.

### What do you need before starting?
- Signed in, with at least one system that has an item in **Assets**, one in **Inventory**, one
  receipt in **Stock** and one sale in **Receipts**.
- The phone's text size at its normal setting.

### Steps
1. On the systems list, look at the screen.
2. Open a system. Look at its **Home**.
3. Open the side menu and tap **Assets**.
4. Tap **Inventory**, then **Stock**, then **Register**, then **Receipts**, looking at each.
5. On **Receipts**, tap a sale. Its page opens.

### What's the expected output?
- On every screen, the title at the top is clearly the biggest text, and the names in lists are
  bigger than the small grey lines under them.
- On the sale's page from step 5, the total at the top is large and bold, and the money amounts in
  the list of items line up under each other on the right.
- No text anywhere is cut off at the top or bottom of its letters.

## Test 2 - Title: Biggest text size, every screen

### What will be tested?
With the phone's text size at its largest, you will open the same screens. A pass means everything
still fits and can be read — nothing cut off, nothing overlapping — so a shop owner who needs big text
can still use the till.

### What do you need before starting?
- Same as Test 1.
- In the phone's **Settings → Display → Font size** (on some phones **Accessibility → Font size**),
  the slider all the way to the largest.

### Steps
1. Open the app. Look at the systems list.
2. Open a system, then open **Assets**, **Inventory**, **Stock**, **Register** and **Receipts** from the
   side menu one after the other.
3. On **Assets**, tap an item. Its page opens. Tap **Edit**. The edit form opens.
4. Go back, open **Register**, and tap an item to add it to the cart.

### What's the expected output?
- On every screen, long text (descriptions, notes, error messages) has grown a lot and wraps onto more
  lines; nothing is hidden.
- Names in lists, labels, buttons and titles have grown less than the long text, so lists still fit
  more than one row on the screen.
- No words overlap each other or run under a button, and no buttons are pushed off the screen.
- In the **Register** cart from step 4, the total at the bottom and the **Complete Sale** button are
  both fully visible.

## Group 2 — Mistakes and edge cases

## Test 3 - Title: Changing text size while the app is open

### What will be tested?
You will change the phone's text size while the app is open on a form. A pass means the app picks up
the new size without losing what was typed.

### What do you need before starting?
- Signed in, inside a system, with the phone's text size at its normal setting.

### Steps
1. Open **Assets**, tap an item, tap **Edit**.
2. In the first text field, add `test` at the end of what is there. Do not save.
3. Leave the app, open the phone's **Settings**, and set the text size to the largest.
4. Come back to the app.

### What's the expected output?
- After step 4 the edit form shows larger text, and the field from step 2 still ends with `test`.

## Group 3 — Accounts

Does not apply: text size is a phone setting, not part of a merchant's data, and does not change
with who is signed in.

## Group 4 — Outside the app

## Test 4 - Title: Phone and tablet at the biggest text size

### What will be tested?
You will repeat Test 2 on a tablet held sideways. A pass means the wide layout (side bar, tables,
panes side by side) still fits at the largest text.

### What do you need before starting?
- Same as Test 2, on a tablet held sideways.

### Steps
1. Do the steps of Test 2 on the tablet.

### What's the expected output?
- Same as Test 2.
- **Assets**, **Inventory**, **Receipts** and **Stock** show their items as cards, one under another,
  not as a table with column headings. No heading ends in "…".
- The names down the side bar ("Hamburgher", "Resources") are whole, not cut off with "…".

## Test 5 - Title: Tablet back at normal text size shows tables again

### What will be tested?
After Test 4, you will set the text size back to normal on the tablet. A pass means the lists go back
to tables with column headings.

### What do you need before starting?
- Test 4 just done, the tablet still held sideways.

### Steps
1. In the tablet's **Settings**, set the text size back to its normal setting.
2. Come back to the app and open **Assets**, then **Receipts**.

### What's the expected output?
- Both show a table: column headings in a row across the top (for example PRODUCT, CATEGORY, PRICE),
  each heading written out in full.
