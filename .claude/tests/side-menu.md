# Side menu — acceptance tests

Covers what you see inside a system: the top bar, the side menu (a strip on a tablet, a slide-in menu
on a phone) with **Home** as its only item, and the way back to your list of systems.

## Test 1 - Title: The phone's side menu has only Home

### What will be tested?
Inside a system on a phone, you will open the side menu. A pass means the menu shows only **Home** —
none of the old screens (Assets, Register, Receipts, Inventory, Stock, Dashboard and so on) are left.

### What do you need before starting?
- A phone, signed in, with at least one system on the **Home** tab (make one with `systems.md`
  Test 1 if needed).

### Steps
1. On the **Home** tab, tap a system's card on its name. The system opens, with a coloured bar at the
   top reading **Merchant**.
2. Tap the **☰** menu button at the left of that top bar. A menu slides in from the left.

### What's the expected output?
- The menu shows the system's badge and name at the top, a thin line, then one item: **Home**,
  highlighted with a coloured bar on its left edge.
- There is no **Store**, **Resources**, **Assets**, **Register**, **Receipts**, **Inventory**,
  **Stock**, **Dashboard**, **Discounts**, **Employees**, **Features** or **Audit** anywhere in it.

## Test 2 - Title: The tablet's side strip has only Home

### What will be tested?
Inside a system on a tablet, you will look at the strip down the left side. A pass means the tablet
shows the same single **Home** item, and the strip can still be narrowed and widened.

### What do you need before starting?
- A tablet held sideways, signed in, with at least one system.

### Steps
1. Tap a system's card on its name. The system opens.
2. Look at the coloured strip on the left.
3. Tap the **☰** button at the left of the top bar.
4. Tap **☰** again.

### What's the expected output?
- After step 2, the strip shows the badge, the system's name, then only **Home** with its house icon.
- After step 3, the strip narrows to icons only — just the badge and the house icon.
- After step 4, it widens again and **Home** has its label back.

## Test 3 - Title: Your systems takes you back to the list on a phone

### What will be tested?
Inside a system on a phone, you will use the four-squares button in the top bar. A pass means there is
always a visible way out of a system, on iPhone too, where there is no Back button.

### What do you need before starting?
- A phone (an iPhone if you have one), signed in, inside a system (Test 1, steps 1).

### Steps
1. Look at the right end of the top bar.
2. Tap the four-squares button (its name, read out by the screen reader, is **Your systems**).

### What's the expected output?
- After step 1, the top bar shows a bell and a four-squares button on its right. There is no person
  icon — Profile is no longer reached from inside a system.
- After step 2, the system closes and you are on the **Home** tab with your list of systems.

## Test 4 - Title: Your systems takes you back to the list on a tablet

### What will be tested?
The same way out, on a tablet. A pass means it works with the side strip showing.

### What do you need before starting?
- A tablet, signed in, inside a system.

### Steps
1. Tap the four-squares button at the right end of the top bar.

### What's the expected output?
- The system closes and **Your POS Systems** is on screen, with its grid of system cards.

## Test 5 - Title: Tapping Home while already on Home

### What will be tested?
On a phone's side menu, you will tap the item that is already open. A pass means nothing breaks or
jumps.

### What do you need before starting?
- A phone, inside a system, side menu open (Test 1).

### Steps
1. Tap **Home** in the side menu.

### What's the expected output?
- The menu slides closed and the same system's screen is showing, with the **Merchant** bar at the top.

## Test 6 - Title: The phone's own Back inside a system

### What will be tested?
Inside a system on an Android phone, you will press the phone's Back button. A pass means Back leaves
the system for the list, rather than closing the app or doing nothing.

### What do you need before starting?
- An Android phone, inside a system, side menu closed.

### Steps
1. Press the phone's Back button (or swipe back from the edge, if that is how the phone is set up).

### What's the expected output?
- The system closes and the **Home** tab with your systems is showing.

## Test 7 - Title: Turning the tablet between portrait and landscape

### What will be tested?
Inside a system on a tablet, you will rotate the tablet. A pass means the menu switches between the
fixed strip and the slide-in menu without losing your place, and shows only **Home** either way.

### What do you need before starting?
- A tablet, inside a system, held sideways.

### Steps
1. Turn the tablet upright.
2. If the strip on the left is gone, tap **☰** at the left of the top bar.
3. Close the menu and turn the tablet sideways again.

### What's the expected output?
- Upright, the strip may change into a slide-in menu (opened with **☰**); it shows only **Home**.
- Sideways again, the strip is back on the left with only **Home**. The same system is open throughout.

> Accounts: the side menu shows only the open system's own name, and which systems a person can open
> is tested in `systems.md` Test 12, so this file has no account test.
>
> Outside the app: the side menu loads nothing of its own, so offline, battery and interruption cases
> are the same as for opening a system — `systems.md` Tests 13–15.
