# Your systems — acceptance tests

Covers the list of your POS systems on the **Home** tab, and creating a new system with only its name.
Profile, reached from this screen's person icon on a tablet, is in `account.md`; what you see inside a
system is in `side-menu.md`.

## Test 1 - Title: Create a system by its name on a phone

### What will be tested?
On the **Home** tab of a phone, you will create a new system by typing only its name. A pass means a
shop owner can set up a new system in one step, and it appears in their list straight away.

### What do you need before starting?
- A phone, signed in, internet on.
- On the **Home** tab (the house icon in the bar at the bottom).

### Steps
1. Tap the **Create New System** button near the top of the screen, under **Quick Actions**. A page
   titled **Name your system** opens.
2. Tap the field under **SYSTEM NAME (REQUIRED)**.
3. Type `Corner Cafe`.
4. Tap the **Create System** button under the field.

### What's the expected output?
- The **Name your system** page closes by itself and you are back on the **Home** tab.
- Under **Active Systems**, a card named **Corner Cafe** is there, with a shop icon at its left and
  **Edit** and **Remove** buttons under it.
- No other question was asked: no email, no phone, no address and no category.

## Test 2 - Title: Open the system made in Test 1

### What will be tested?
From the **Home** tab, you will open the **Corner Cafe** system made in Test 1. A pass means a new
system opens onto its own screen, carrying the name it was given.

### What do you need before starting?
- Test 1 done, on the same phone, still signed in.

### Steps
1. On the **Home** tab, tap the **Corner Cafe** card (on its name, not on its buttons). A screen with
   a coloured bar at the top that reads **Merchant** opens.
2. Tap the **☰** menu button at the left of that top bar. A side menu slides in from the left.

### What's the expected output?
- At the top of the side menu: a round badge with the letters **CC**, then **Corner Cafe**, and under
  it **POS system**.
- The body of the screen behind the menu is empty — that is expected for now.

## Test 3 - Title: Remove the system made in Test 1

### What will be tested?
On the **Home** tab, you will remove **Corner Cafe**. A pass means a system can be deleted for good,
and only after its name is typed to confirm.

### What do you need before starting?
- Tests 1 and 2 done, back on the **Home** tab (tap **Your systems**, the four-squares icon at the
  right of the top bar, if you are still inside the system).

### Steps
1. On the **Corner Cafe** card, tap the red **Remove** button. A panel rises from the bottom titled
   **Remove Corner Cafe?**.
2. Look at the red **Delete** button at the bottom of that panel without typing anything.
3. Tap the field in the panel and type `Corner Cafe`.
4. Tap **Delete**.

### What's the expected output?
- After step 2, **Delete** is greyed out and does nothing when tapped.
- After step 4, the panel closes and the **Corner Cafe** card is gone from **Active Systems**.
- The panel's text says everything stored in the system will be deleted — it no longer mentions
  products, sales or employees.

## Test 4 - Title: Create a system by its name on a tablet

### What will be tested?
On a tablet's **Home** screen, you will create a second system using the big **Create New System**
card. A pass means the tablet layout creates a system in one step too.

### What do you need before starting?
- A tablet, signed in, internet on, on the screen titled **Your POS Systems**.

### Steps
1. Tap the first card in the grid, **Create New System** (a + in a circle). A page titled **Name your
   system** opens.
2. Tap the field under **SYSTEM NAME (REQUIRED)** and type `Main Street Pharmacy`.
3. Tap **Create System**.

### What's the expected output?
- The page closes and you are back on **Your POS Systems**.
- A card named **Main Street Pharmacy** is in the grid next to the **Create New System** card, with a
  shop picture on a grey band at its top and **Edit** and **Remove** buttons under its name.
- On the **Name your system** page, the field and the button sat at the left, not stretched across the
  whole tablet.

## Test 5 - Title: Open the system made in Test 4

### What will be tested?
On the tablet, you will open **Main Street Pharmacy**. A pass means the tablet shows the system with
its menu always visible on the left.

### What do you need before starting?
- Test 4 done.

### Steps
1. Tap the **Main Street Pharmacy** card on its name. A screen with a coloured **Merchant** bar at the
   top opens.

### What's the expected output?
- A coloured strip down the left side shows a round badge with **MS**, then **Main Street Pharmacy**,
  and under a thin line one item: **Home**, highlighted.

## Test 6 - Title: Remove the system made in Test 4

### What will be tested?
On the tablet, you will remove **Main Street Pharmacy**. A pass means the tablet's remove works the
same way, in a box in the middle of the screen instead of a panel from the bottom.

### What do you need before starting?
- Test 5 done. Tap **Your systems** (the four-squares icon at the right of the top bar) to get back to
  **Your POS Systems**.

### Steps
1. On the **Main Street Pharmacy** card, tap **Remove**. A box titled **Remove Main Street
   Pharmacy?** opens in the middle of the screen.
2. Type `Main Street Pharmacy` in its field.
3. Tap **Delete**.

### What's the expected output?
- The box closes and the **Main Street Pharmacy** card is gone from the grid. Only **Create New
  System** is left (unless you had other systems before).

> Editing a system is not part of this screen yet: the **Edit** button on a card does nothing, so the
> records above go create → view → delete.

## Test 7 - Title: Create System with the name left empty

### What will be tested?
On the **Name your system** page, you will try to create a system without typing a name. A pass means
nothing nameless is ever created.

### What do you need before starting?
- A phone, signed in, on the **Home** tab.

### Steps
1. Tap **Create New System**. The **Name your system** page opens.
2. Without typing anything, tap **Create System**.

### What's the expected output?
- The page stays open. Under the field, red text reads **Enter a system name.**, and the field's
  outline turns red.
- Going back to the **Home** tab (the back arrow at the top left), no new card was added.

## Test 8 - Title: A name made only of spaces

### What will be tested?
On the **Name your system** page, you will type nothing but spaces. A pass means a blank-looking name
is refused the same as an empty one.

### What do you need before starting?
- A phone, signed in, on the **Home** tab.

### Steps
1. Tap **Create New System**.
2. Tap the field and type five spaces.
3. Tap **Create System**.

### What's the expected output?
- The page stays open with **Enter a system name.** in red under the field. No card is added on the
  **Home** tab.

## Test 9 - Title: A very long name

### What will be tested?
On the **Name your system** page, you will type a name longer than the app allows (80 letters). A pass
means the app says so instead of failing in a way the user cannot understand.

### What do you need before starting?
- A phone, signed in, on the **Home** tab.

### Steps
1. Tap **Create New System**.
2. Tap the field and type `The Very Long Named Neighbourhood Convenience Store and Coffee Bar of Fifth Avenue`
   (more than 80 letters).
3. Tap **Create System**.
4. Delete letters from the end until the name is `The Very Long Named Neighbourhood Convenience Store`.
5. Tap **Create System**.

### What's the expected output?
- After step 3, red text under the field reads **System name is too long.** and the page stays open.
- After step 5, the page closes and a card with that shorter name is on the **Home** tab. Remove it
  afterwards (Test 3's steps).

## Test 10 - Title: Tapping Create System twice quickly

### What will be tested?
On the **Name your system** page, you will tap the button twice in a row. A pass means one tap makes
one system, never two.

### What do you need before starting?
- A phone, signed in, internet on, on the **Home** tab.

### Steps
1. Tap **Create New System** and type `Double Tap Test`.
2. Tap **Create System** twice, as fast as you can.

### What's the expected output?
- The page closes once. On the **Home** tab there is exactly one **Double Tap Test** card, not two.
  Remove it afterwards.

## Test 11 - Title: Leaving the form halfway with the phone's Back

### What will be tested?
On the **Name your system** page, you will type a name and then leave without creating. A pass means
leaving creates nothing.

### What do you need before starting?
- An Android phone, signed in, on the **Home** tab.

### Steps
1. Tap **Create New System** and type `Not Saved`.
2. Press the phone's own Back button (or swipe back from the screen edge).

### What's the expected output?
- You are back on the **Home** tab and there is no **Not Saved** card.

## Test 12 - Title: Another person never sees your systems

### What will be tested?
On the **Home** tab, you will sign in as a second person after creating a system as the first. A pass
means one person's systems never show for another, even for a moment — the most important test in
this file.

### What do you need before starting?
- Two Google or Facebook accounts (Person A and Person B), a phone, internet on.
- Signed in as Person A, with one system named `Person A Shop` (Test 1's steps).

### Steps
1. Tap the **Account** tab (the person icon in the bottom bar). The **Profile** page opens.
2. Tap **Sign Out**. The sign-in screen appears.
3. Sign in as Person B.
4. Watch the **Home** tab closely as it loads.
5. Sign out again (steps 1–2) and sign back in as Person A.

### What's the expected output?
- After step 4, **Person A Shop** never appears on Person B's **Home** tab, not even for a moment while
  it loads.
- After step 5, **Person A Shop** is back on Person A's **Home** tab.

## Test 13 - Title: Creating a system with no internet

### What will be tested?
On the **Name your system** page, you will create a system while the phone is offline. A pass means
the app waits and says so clearly, instead of a spinner that never ends, and the system lands once the
internet is back.

### What do you need before starting?
- A phone, signed in, on the **Home** tab, with your systems already showing.

### Steps
1. Turn on airplane mode.
2. Tap **Create New System** and type `Offline Shop`.
3. Tap **Create System**.
4. Wait ten seconds and look under the button.
5. Turn airplane mode off and wait.

### What's the expected output?
- After step 4, the page is still open and, under the **Create System** button, grey text reads
  **Waiting for a connection. This finishes on its own when you reconnect.** The button is not stuck
  spinning.
- After step 5, the page closes by itself and an **Offline Shop** card is on the **Home** tab. Remove
  it afterwards.

## Test 14 - Title: Opening the Home tab in airplane mode

### What will be tested?
You will open the app with no internet. A pass means the **Home** tab explains it is offline instead of
showing a blank screen or a spinner forever.

### What do you need before starting?
- A phone, signed in. Close the app fully (swipe it away from recent apps).

### Steps
1. Turn on airplane mode.
2. Open the app.

### What's the expected output?
- The **Home** tab shows either your systems (if the app still had them) or the line **You're offline.
  Your systems will load when you reconnect.** — never an endless spinner.

## Test 15 - Title: A phone call while typing a name

### What will be tested?
On the **Name your system** page, something outside the app interrupts you. A pass means what you
typed is still there when you come back.

### What do you need before starting?
- A phone, signed in, and a second phone to call it from (or any notification you can open).

### Steps
1. Tap **Create New System** and type `Interrupted`.
2. Receive a call on the phone, answer it, then hang up.
3. Go back to the app.

### What's the expected output?
- The **Name your system** page is still open with `Interrupted` in the field. Tapping **Create
  System** creates it as normal. Remove it afterwards.

## Test 16 - Title: Tapping Create System again while waiting for a connection

### What will be tested?
On the **Name your system** page, with no internet, you will try to create the same system more than
once. A pass means a shop owner who taps again because nothing seems to happen still ends up with
one system, not two.

### What do you need before starting?
- A phone, signed in, on the **Home** tab.

### Steps
1. Turn on airplane mode.
2. Tap **Create New System** and type `Offline Twice`.
3. Tap **Create System**. Grey text under the button reads **Waiting for a connection. This finishes
   on its own when you reconnect.**
4. Tap **Create System** again.
5. Tap the name field, then the keyboard's **Done** (✓) key.
6. Turn airplane mode off and wait.

### What's the expected output?
- After step 3, the **Create System** button is greyed out and does nothing when tapped (steps 4 and
  5 change nothing).
- After step 6, the page closes by itself and there is exactly one **Offline Twice** card on the
  **Home** tab, not two. Remove it afterwards.

> Not covered here: sign-out and account deletion while on this screen (`account.md`), battery dying
> and the app swiped away mid-form — the form saves nothing until **Create System** is tapped, so
> either the system is in the list afterwards or it is not.
