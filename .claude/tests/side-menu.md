# Side menu — acceptance tests

Covers the side menu inside a system: its order, and its two groups, **Store** and **Resources**, that
open and close the screens under them. What each screen does is covered in that screen's own tests.

**Words used in this file**

- **The side menu** — the list of places inside a system. On a phone it slides in from the left when
  you tap the **☰** menu button at the top left. On a wide tablet it is a bar that stays on the left
  edge, and the **☰** button narrows it to icons only or widens it again.
- **Group** — a line in the side menu with an arrow at its right end. Tapping it does not open a
  screen; it shows or hides the lines under it.

---

## Group 1 — Normal use

## Test 1 - Title: The side menu's order on a phone

### What will be tested?
On a phone, you will open the side menu and read it top to bottom. A pass means the places sit in the
new order, with **Register** and **Receipts** moved under **Store**.

### What do you need before starting?
- Signed in, inside a system, on a phone, on **Home**.

### Steps
1. Tap the **☰** menu button at the top left. The side menu slides in from the left.
2. Read the lines in the side menu from top to bottom.

### What's the expected output?
- After step 2 the lines read, in order: **Home**, **Store**, **Dashboard**, **Resources**,
  **Discounts**, **Employees**, **Features**, **Audit**.
- **Store** and **Resources** each have an arrow at their right end. **Register**, **Receipts**,
  **Assets**, **Inventory** and **Stock** are not shown yet, and there is no **Products** line.

## Test 2 - Title: Store opens and closes its three screens

### What will be tested?
In the side menu, you will tap **Store** twice, and open one screen from under it. A pass means the
Register and its receipts are found under **Store**, next to **Assets**.

### What do you need before starting?
- Test 1 done, side menu open.

### Steps
1. Tap **Store** in the side menu.
2. Tap **Store** again.
3. Tap **Store** once more, then tap **Register** under it.
4. Open the side menu again.

### What's the expected output?
- After step 1 three lines appear just under **Store**, set in a little: **Assets**, **Register**,
  **Receipts**. The screen behind the side menu has not changed.
- After step 2 those three lines are hidden again.
- After step 3 the side menu closes and the **Register** opens.
- After step 4 **Store** is still open, and **Register** under it is highlighted with a bar at its left
  edge.

## Test 3 - Title: Resources holds Inventory and Stock only

### What will be tested?
In the side menu, you will open **Resources**. A pass means it now holds only the stock screens.

### What do you need before starting?
- Side menu open.

### Steps
1. Tap **Resources** in the side menu.
2. Tap **Inventory** under it.

### What's the expected output?
- After step 1 two lines appear under **Resources**: **Inventory** and **Stock**. **Assets** (or
  **Products**) is not among them, and neither is **Rentables**.
- After step 2 **Inventory** opens.

## Test 4 - Title: Both groups open at once

### What will be tested?
You will open **Store** and **Resources** together. A pass means one group does not close the other.

### What do you need before starting?
- Side menu open, both groups closed.

### Steps
1. Tap **Store**.
2. Tap **Resources**.

### What's the expected output?
- After step 2 both groups are open: **Assets**, **Register**, **Receipts** under **Store**, then
  **Dashboard**, then **Inventory** and **Stock** under **Resources**.

---

## Group 2 — Mistakes and edge cases

## Test 5 - Title: Back between screens in different groups

### What will be tested?
You will go from a screen under **Store** to one under **Resources**, then press the phone's back
button. A pass means Back returns to the screen you came from, not to **Home**.

### What do you need before starting?
- On a phone, inside a system, on **Home**.

### Steps
1. Open the side menu, tap **Store**, then **Register**.
2. Open the side menu, tap **Resources**, then **Inventory**.
3. Press the phone's back button.
4. Press the phone's back button again.

### What's the expected output?
- After step 3 the **Register** is showing.
- After step 4 **Home** is showing.

## Test 6 - Title: Tapping a group fast

### What will be tested?
You will tap **Store** several times quickly. A pass means the menu ends in a steady state and opens no
screen.

### What do you need before starting?
- Side menu open, **Store** closed.

### Steps
1. Tap **Store** three times quickly.

### What's the expected output?
- **Store** ends open (an odd number of taps), with its three lines under it. The screen behind the side
  menu has not changed.

---

## Group 3 — Accounts

The side menu shows no shop data — the same lines for every account — so there is nothing to compare
between accounts. Each screen's own tests cover what another account sees.

---

## Group 4 — Outside the app

## Test 7 - Title: The side menu on a tablet

### What will be tested?
On a tablet, you will use the groups from the bar on the left edge, narrowed to icons. A pass means
tapping a group's icon widens the bar first, so the screens under it have their names.

### What do you need before starting?
- Signed in, inside a system, on a tablet held upright, with a bar down the left edge. If there is no
  bar on the left edge, this tablet is too narrow and the test does not apply.

### Steps
1. Tap the **☰** button at the top left. The bar narrows to icons only.
2. Tap the shop-front icon, second from the top (**Store**).
3. Tap **Assets** under it.
4. Tap **Resources**, then **Stock**.

### What's the expected output?
- After step 1 the bar shows icons with no names.
- After step 2 the bar widens with names showing, and **Assets**, **Register** and **Receipts** appear
  under **Store**.
- After step 3 **Assets** opens beside the bar, and the bar stays in place.
- After step 4 **Stock** opens, and both groups stay open in the bar.

## Test 8 - Title: Offline

### What will be tested?
With airplane mode on, you will open and close both groups. A pass means the side menu works without
internet — it needs none.

### What do you need before starting?
- Inside a system, airplane mode on.

### Steps
1. Open the side menu, tap **Store**, then tap **Resources**.

### What's the expected output?
- Both groups open as in Test 4. Each screen you open from them shows its own offline message.
