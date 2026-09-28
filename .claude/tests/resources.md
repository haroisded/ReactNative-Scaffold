# Resources — acceptance tests

Covers the **Resources** group in the side menu and its three screens: **Products**, **Rentables** and
**Inventory**, with their **Setup**, add, edit, archive, restore and delete. Receiving stock and the
Inventory item's own page are covered in the inventory and stock tests instead.

**Words used in this file**

- **The side menu** — the list of places inside a system (Home, Register, Resources, …). On a phone
  it slides in from the left when you tap the **☰** menu button at the top left. On a wide tablet it
  is a narrow bar of icons that stays on the left edge.
- **Item** — anything listed on Products, Rentables or Inventory: a service, a rental, or a stock
  item.
- **Status badge** — the small word on an item's page that says what state it is in: **Draft** (not
  ready to sell yet), **Active** (ready to sell), or **Archived** (hidden from the lists and the
  register, but kept).
- **Archive** — hide an item without losing it. It can be brought back with **Restore**. **Delete**
  is different: it removes the item for good.
- **The type line** — the small line of text just above an item's name at the top of its page, saying
  what kind of item it is: **Flat Service**, **Rental Asset**, **Bookable Service** or
  **Stock / Consumable**.
- **The product form** — the screens you fill in to add or edit an item on Products or Rentables. It
  is split into steps (**General**, **Pricing**, and so on) and always ends on a step called
  **Review**, where the save buttons are. On a phone the save buttons sit at the bottom of the
  screen; on a tablet they sit in the bar across the top.

## Test 1 - Title: Resources opens and closes its three screens

### What will be tested?
In the side menu, you will tap **Resources** twice. A pass means the first tap shows the three
screens under it and the second tap hides them, and neither tap changes the page you were on.

### What do you need before starting?
- Signed in, inside a system, on a phone.

### Steps
1. Tap the **☰** menu button at the top left of the screen. The side menu slides in from the left.
2. Tap **Resources** in the side menu.
3. Look at the lines directly under **Resources**.
4. Tap **Resources** again.

### What's the expected output?
- After step 2, three new lines appear in the side menu, just under **Resources**: **Products**,
  **Rentables** and **Inventory**. The page behind the side menu stays the same page — tapping
  **Resources** does not open anything by itself.
- After step 4, **Products**, **Rentables** and **Inventory** are hidden again, and **Resources** is
  still in the side menu.

## Test 2 - Title: Resources on a tablet

### What will be tested?
On a tablet, you will use **Resources** from the narrow bar of icons on the left edge. A pass means
the bar widens to show the three screens, and **Rentables** opens from it.

### What do you need before starting?
- Signed in, inside a system, on a tablet held upright, with a narrow bar of icons down the left
  edge of the screen. (The app is locked to upright, so do not turn the tablet on its side. If there
  is no bar of icons on the left edge, this tablet is too narrow and the test does not apply.)

### Steps
1. In the bar of icons on the left edge, tap the **Resources** icon.
2. In the widened bar, tap **Rentables**.

### What's the expected output?
- After step 1, the bar on the left edge widens to show the names of its entries, and **Products**,
  **Rentables** and **Inventory** are listed under **Resources**.
- After step 2, the **Rentables** list opens, with **Rentables** as the title at the top of the page.

## Test 3 - Title: Each screen shows only its own kind of item

### What will be tested?
You will look through the lists on **Products**, **Rentables** and **Inventory**. A pass means each
screen lists only its own kind of item, so a service never shows up among rentals or stock.

### What do you need before starting?
- At least one item on **Products** and one on **Rentables**. If there are none, do Test 5 and
  Test 8 first, then come back to this test before doing Tests 7 and 10 (which delete them).

### Steps
1. Open the side menu (**☰** at the top left), tap **Resources**, then tap **Products**. The
   **Products** list opens.
2. Tap each item in the list in turn and read its type line (just above its name, at the top of its
   page). Use the back arrow at the top left to return to the list after each one.
3. Open the side menu, tap **Rentables**, and do the same for each item in the **Rentables** list.
4. Open the side menu, tap **Inventory**, and look through the **Inventory** list.

### What's the expected output?
- In step 2, every item on **Products** has the type line **Flat Service**.
- In step 3, every item on **Rentables** has the type line **Rental Asset** or **Bookable Service**.
- In step 4, none of the items you saw on **Products** or **Rentables** appear in the **Inventory**
  list — it holds only stock items.

## Test 4 - Title: Setup shows only the lists that screen uses

### What will be tested?
You will open the **Setup** page of **Products** and of **Inventory** and add a category on one. A
pass means each screen keeps its own categories, and each **Setup** page shows only the lists that
screen uses.

### What do you need before starting?
- Signed in, inside a system.

### Steps
1. Open the side menu, tap **Resources**, then **Products**.
2. Tap the **Setup** button (with a gear icon) near the top of the **Products** list. A page titled
   **Setup** opens, with **Products** written small above the title.
3. Under the **Categories** heading, tap **New category**. A **New category** box opens.
4. In the **Name** field, type `Services A`, then tap **Create**. The box closes.
5. Tap the back arrow at the top left to return to the **Products** list.
6. Open the side menu and tap **Inventory**. The **Inventory** list opens.
7. Tap the **Setup** button near the top of the **Inventory** list.
8. Look at the headings and the categories on this **Setup** page.

### What's the expected output?
- After step 4, **Services A** is listed under **Categories** on the **Products** Setup page.
- The **Products** Setup page (step 2) has two lists: **Categories** and **Tax classes**.
- The **Inventory** Setup page (step 8) has only a **Categories** list — no **Tax classes** and no
  suppliers. (Suppliers now live on the **Stock** screen.)
- **Services A** is not among the categories on the **Inventory** Setup page.

## Test 5 - Title: Record 1 — add a service and save it as active

### What will be tested?
On **Products**, you will add a new service and save it with **Save as active** on the form's last
step. A pass means the last step offers both ways to save, and the saved service opens on its own
page marked **Active**.

### What do you need before starting?
- On the **Products** list, with internet on.

### Steps
1. Tap **Add product** near the top of the **Products** list. The product form opens on its first
   step, **General**.
2. In the name field, type `Delivery fee`.
3. Tap **Next** at the bottom of the screen (on a tablet, the next step in the list on the left)
   until you reach the last step, **Review**.
4. Look at the buttons at the bottom of the **Review** step.
5. Tap **Save as active**.

### What's the expected output?
- In step 4, the **Review** step has three buttons: **Save as draft**, **Save as active** and
  **Cancel**. There is no "Save as" switch above them.
- After step 5, the page for **Delivery fee** opens. Its status badge reads **Active**.
- At the bottom of the screen, a message bar reads **Product saved**, with an **Add another** button
  in it.

## Test 6 - Title: Record 1 — edit, then view

### What will be tested?
You will rename the active service from Test 5. A pass means editing an item that is already active
only offers **Save changes** (not the draft/active choice again), and the item stays **Active** with
its new name.

### What do you need before starting?
- Test 5 done, on the page for **Delivery fee**.

### Steps
1. Tap **Edit** (at the bottom of the screen on a phone, at the top right on a tablet). The product
   form opens with the item's details filled in.
2. In the name field, change the name to `Delivery fee (city)`.
3. Tap **Next** until you reach the **Review** step.
4. Look at the buttons on the **Review** step.
5. Tap **Save changes**.

### What's the expected output?
- In step 4, the **Review** step has only two buttons: **Save changes** and **Cancel**. **Save as
  draft** and **Save as active** are not there.
- After step 5, the item's page opens with the name **Delivery fee (city)** at the top, and its
  status badge still reads **Active**.

## Test 7 - Title: Record 1 — archive, restore, delete

### What will be tested?
On the service's page, you will archive it, restore it, and then delete it. A pass means archiving
happens straight away without a "delete" warning, **Restore** brings the item back as a draft, and
**Delete** asks first and then removes it for good.

### What do you need before starting?
- Test 6 done, on the page for **Delivery fee (city)**.

### Steps
1. Tap **Archive** (at the bottom of the screen on a phone, at the top right on a tablet).
2. Look at the status badge, the **Archive** button, and the bottom of the screen.
3. Tap **Restore** — the same button, which now has a new name.
4. Look at the status badge and the message at the bottom of the screen.
5. Tap the red bin-shaped **Delete** button at the top right. A box headed **Delete permanently**
   opens.
6. In the **Delete permanently** box, tap **Delete**.

### What's the expected output?
- After step 1, no box asking you to confirm a delete opens.
- In step 2, the status badge reads **Archived**, the **Archive** button now reads **Restore**, and a
  message bar at the bottom of the screen reads **Delivery fee (city) archived**, with an **Undo**
  button in it.
- In step 4, the message bar reads **Delivery fee (city) restored as a draft**, and the status badge
  reads **Draft**.
- After step 5, the **Delete permanently** box asks **Delete Delivery fee (city)?** and warns that
  this cannot be undone.
- After step 6, the app goes back to the **Products** list, and **Delivery fee (city)** is no longer
  in it.

## Test 8 - Title: Record 2 — a rental asks for its type first

### What will be tested?
On **Rentables**, you will add a mountain bike and save it as a draft. A pass means the screen asks
whether it is a **Rental Asset** or a **Bookable Service** before showing the form, the form never
lets you change that choice, and the bike saves as a **Draft**.

### What do you need before starting?
- On the **Rentables** list.

### Steps
1. Tap **Add rentable** near the top of the **Rentables** list.
2. Look at the page that opens.
3. Tap the **Rental Asset** card. The product form opens on its first step.
4. In the name field, type `Mountain bike`.
5. Go through each step with **Next** until the **Review** step, looking for anywhere to change
   **Rental Asset**.
6. On the **Review** step, tap **Save as draft**.

### What's the expected output?
- In step 2, a page headed **What are you adding?** shows two cards, **Rental Asset** and **Bookable
  Service**, and says the choice cannot be changed later. No form fields are shown yet.
- In step 5, no step of the form has a field or button to change **Rental Asset** to something else.
- After step 6, the page for **Mountain bike** opens. The type line above its name reads **Rental
  Asset**, and its status badge reads **Draft**.

## Test 9 - Title: Record 2 — edit a draft, then make it active

### What will be tested?
You will edit the draft bike from Test 8 and save it as active. A pass means a draft still gets the
choice between draft and active when edited, and choosing active changes its status badge.

### What do you need before starting?
- Test 8 done, on the page for **Mountain bike**.

### Steps
1. Tap **Edit** (at the bottom of the screen on a phone, at the top right on a tablet). The product
   form opens.
2. Tap **Next** until the **Review** step, and look at its buttons.
3. Tap **Save as active**.

### What's the expected output?
- In step 2, the **Review** step has three buttons: **Save as draft**, **Save as active** and
  **Cancel**.
- After step 3, the page for **Mountain bike** opens and its status badge reads **Active**.

## Test 10 - Title: Record 2 — archive with Undo, then delete

### What will be tested?
You will archive the bike and then undo it straight away from the message bar. A pass means **Undo**
puts the bike back exactly as it was (still **Active**, not a draft), and it can then be deleted.

### What do you need before starting?
- Test 9 done, on the page for **Mountain bike**, with its status badge reading **Active**.

### Steps
1. Tap **Archive**. A message bar appears at the bottom of the screen reading **Mountain bike
   archived**, with an **Undo** button.
2. Tap **Undo** in that message bar, before it disappears.
3. Look at the status badge on the page.
4. Tap the red bin-shaped **Delete** button at the top right. A box headed **Delete permanently**
   opens. Tap **Delete** in it.

### What's the expected output?
- After step 2, the status badge reads **Active** again — not **Archived**, and not **Draft**.
- After step 4, the app goes back to the **Rentables** list, and **Mountain bike** is no longer in
  it.

## Test 11 - Title: Opening hours use a 12-hour clock

### What will be tested?
On a **Bookable Service**, you will set an opening time. A pass means every time is picked and shown
as hours, minutes and AM/PM — never as a 24-hour clock like 14:30.

### What do you need before starting?
- On **Rentables**: tap **Add rentable**, tap the **Bookable Service** card, then tap **Next** until
  you reach the **Availability** step.
- Run this test once on an iPhone and once on an Android phone.

### Steps
1. Under **Open**, turn on the switch next to any day (for example **Mon**). Two time fields appear
   for that day, with the word **to** between them.
2. Tap the first time field (the opening time). A box headed **Pick a time** opens.
3. Look at the scrolling wheels in the **Pick a time** box.
4. Scroll the wheels to hour `2`, minute `30`, and `PM`.
5. Tap **Done** in the **Pick a time** box. The box closes.

### What's the expected output?
- In step 1, the two time fields show **9:00 AM** and **5:00 PM**, not 09:00 and 17:00.
- In step 3, the **Pick a time** box has three scrolling wheels side by side: an hour (1 to 12), a
  minute, and **AM** / **PM**. There is no 24-hour clock anywhere in it, and it looks the same on the
  iPhone and the Android phone.
- After step 5, the opening time field for that day reads **2:30 PM**.

## Test 12 - Title: Cancel with and without changes

### What will be tested?
On the **Review** step of the product form, you will tap **Cancel** — once without typing anything,
and once after typing a name. A pass means the app only warns you when something would be lost, and
**Discard** really throws the typing away.

### What do you need before starting?
- On the **Products** list.

### Steps
1. Tap **Add product**. Without typing anything, tap **Next** until the **Review** step, then tap
   **Cancel**.
2. Tap **Add product** again. In the name field, type `Test`. Tap **Next** until the **Review** step,
   then tap **Cancel**. A box opens.
3. In that box, tap **Keep editing**.
4. Tap **Cancel** again, and in the box that opens, tap **Discard**.

### What's the expected output?
- After step 1, the app goes straight back to the **Products** list. No box asks you anything.
- After step 2, a box headed **Discard your changes?** opens, saying what you changed has not been
  saved and will be lost. It has two buttons, **Keep editing** and **Discard**.
- After step 3, the box closes and you are still on the product form, with `Test` still in the name
  field.
- After step 4, the app goes back to the **Products** list, and there is no item called **Test** in
  it.

## Test 13 - Title: Saving with a required field empty

### What will be tested?
You will try to save a new product with no name. A pass means nothing is saved, and the form shows
you exactly which step needs fixing and takes you there.

### What do you need before starting?
- On the **Products** list. Tap **Add product** so the product form opens on its **General** step.

### Steps
1. Leave the name field empty.
2. Tap **Next** until the **Review** step.
3. Tap **Save as active**.

### What's the expected output?
- On the **Review** step, the **General** row is marked **Needs attention**.
- After step 3, a line near the save buttons reads **Some fields need attention before this can be
  saved.**, and the form jumps back to the **General** step, where the name field is marked in red.
- Nothing is saved: going back to the **Products** list shows no new item.

## Test 14 - Title: Double-tapping Save

### What will be tested?
You will tap **Save as active** twice very quickly. A pass means only one item is made, not two
copies of it.

### What do you need before starting?
- On the **Products** list. Tap **Add product**, type `Double` in the name field, and tap **Next**
  until the **Review** step.

### Steps
1. Tap **Save as active** twice, as fast as you can.
2. Go back to the **Products** list (tap the back arrow at the top left of the item's page).
3. Look for **Double** in the list.

### What's the expected output?
- In step 3, the **Products** list shows exactly one item called **Double** — not two.
- Delete **Double** afterwards (open it and use the red bin-shaped **Delete** button at the top
  right).

## Test 15 - Title: The phone's Back button in the middle of a form

### What will be tested?
On an Android phone, you will press the phone's own Back button while adding an Inventory item. A
pass means the app asks before throwing your typing away, instead of silently leaving the form.

### What do you need before starting?
- An Android phone, on the **Inventory** list.

### Steps
1. Tap **Add item** near the top of the **Inventory** list. The **Add an inventory item** form opens.
2. In the **Pack name** field, type `Test item`.
3. Press the phone's own Back button (or swipe back from the edge of the screen).

### What's the expected output?
- After step 3, a box headed **Discard your changes?** opens over the form, saying **This item has
  not been saved.**, with the buttons **Keep editing** and **Discard**.
- The form is still behind the box — you have not been taken back to the **Inventory** list yet.

## Test 16 - Title: A link that opens an item under the wrong screen

### What will be tested?
You will open a link that points to a **Rentables** item but asks for it under **Products**. A pass
means the app refuses to show the item in the wrong place, instead of showing it with the wrong
screen's settings.

### What do you need before starting?
- A developer gives you a link that opens a **Rentables** item under **Products**. Skip this test if
  no one can.

### Steps
1. Tap the link on the phone. The app opens.

### What's the expected output?
- The app shows a page that reads **This product is no longer available.**, with a **Back to the
  list** button.
- None of the item's details (name, price, and so on) are shown.

## Test 17 - Title: Sign out and back in

### What will be tested?
You will sign out while looking at the **Products** list, then sign back in. A pass means signing
out goes cleanly to the sign-in screen, and the items are all still there afterwards.

### What do you need before starting?
- Signed in, with at least one item on **Products**. Note the names of the items in the list.

### Steps
1. With the **Products** list open, tap the person-shaped **Account** button at the top right. The
   **Profile** screen opens.
2. Scroll down to **Sign Out** and tap it.
3. On the **Sign in** screen, sign in again as the same person.
4. Open the same system, then open the side menu, tap **Resources**, then **Products**.

### What's the expected output?
- After step 2, the app goes to the **Sign in** screen without freezing.
- After step 4, the **Products** list shows the same items you noted before starting.

## Test 18 - Title: A different person sees none of the first person's items

### What will be tested?
You will sign in as a second person on the same phone and look through all three screens. A pass
means the second person never sees any of the first person's items or categories. This is the most
important test in this file: a failure would show one shop's data to another shop.

### What do you need before starting?
- Person A: an account with items on **Products**, **Rentables** and **Inventory**, and at least one
  category in each screen's **Setup**.
- Person B: a second account, with at least one system of its own.
- Signed in as Person A.

### Steps
1. Sign out of Person A (**Account** button, then **Sign Out** on the **Profile** screen).
2. Sign in as Person B.
3. Open each of Person B's systems. In each one, open **Products**, **Rentables** and **Inventory**
   from the side menu, and each screen's **Setup** page.

### What's the expected output?
- On every list and every **Setup** page in step 3, **none of Person A's items or categories appear,
  even for a moment** while the page is loading.
- Person A's systems are not in Person B's list of systems either.

## Test 19 - Title: Delete the account while it has items

### What will be tested?
You will delete an account that has items on all three screens, then sign up again with the same
login. A pass means the items are deleted along with the account, and the new start is empty.

### What do you need before starting?
- A throwaway account (one you are happy to lose for good) with at least one item on **Products**,
  **Rentables** and **Inventory**.

### Steps
1. Open **Profile** (the **Account** button at the top right, or **Account** in the tab bar). Scroll
   down to **Delete account** and tap it. A box headed **Delete account?** opens.
2. In the **Delete account?** box, tap **Delete**.
3. On the **Sign in** screen, sign in again with the same Google or Facebook login.
4. Create a new system, then open the side menu, tap **Resources**, then **Products**.

### What's the expected output?
- After step 2, the app goes to the **Sign in** screen.
- After step 3, the home screen shows no systems — the old ones are gone.
- After step 4, the **Products** list is empty. None of the old account's items are there.

## Test 20 - Title: The internet drops while saving

### What will be tested?
You will tap save while the phone is in airplane mode. A pass means the app clearly says it is
waiting for the internet and will finish by itself, instead of spinning forever or losing the item.

### What do you need before starting?
- On the **Products** list. Tap **Add product**, type `Offline test` in the name field, and tap
  **Next** until the **Review** step.

### Steps
1. Turn on the phone's airplane mode.
2. Tap **Save as active**.
3. Look at the area around the save buttons.
4. Turn airplane mode off, and wait a few seconds.

### What's the expected output?
- In step 3, a line near the save buttons reads **Waiting for a connection. This finishes on its own
  when you reconnect.** There is no loading circle that keeps spinning with no message.
- After step 4, the save finishes by itself: the page for **Offline test** opens, with a message bar
  reading **Product saved** at the bottom.
- Delete **Offline test** afterwards.

## Test 21 - Title: Opening a screen in airplane mode

### What will be tested?
You will open **Rentables** with no internet. A pass means the screen says it is offline, instead of
showing a blank page or a loading circle that never stops.

### What do you need before starting?
- The app open inside a system, on a screen other than **Rentables**.
- The phone's airplane mode turned on.

### Steps
1. Open the side menu (**☰** at the top left), tap **Resources**, then tap **Rentables**.

### What's the expected output?
- Where the **Rentables** list would be, the page reads **You're offline. Rentables will load when you
  reconnect.**, with a **Try again** button. It names **Rentables**, not Products.
- The page is not blank, and does not show a loading circle that keeps spinning.

## Test 22 - Title: The app is closed in the middle of a form

### What will be tested?
You will close the app while halfway through adding an Inventory item. A pass means nothing
half-finished is saved: the unsaved item simply is not there when you come back.

### What do you need before starting?
- On the **Inventory** list. Tap **Add item**, and type `Half item` in the **Pack name** field. Do
  not save.

### Steps
1. Close the app fully: open the phone's recent apps and swipe the app away. (Or switch the phone
   off and on again.)
2. Open the app again.
3. Open the same system, then open the side menu, tap **Resources**, then **Inventory**.

### What's the expected output?
- After step 2, the app is still signed in — it does not show the **Sign in** screen.
- After step 3, **Half item** is not in the **Inventory** list, and no item with a blank or partly
  filled name has appeared.

## Test 23 - Title: A call or notification mid-form, and ten minutes away

### What will be tested?
You will be interrupted while typing in the product form, first by a call and then by leaving the
app for ten minutes. A pass means what you typed is still there both times, and you are not asked to
sign in again.

### What do you need before starting?
- On the **Products** list. Tap **Add product**, and type `Interrupted` in the name field. Do not
  save.

### Steps
1. Have someone call the phone (or open any notification), then return to the app.
2. Look at the name field.
3. Press the phone's home button so the app goes to the background. Wait ten minutes.
4. Open the app again from the recent apps list, and look at the name field.

### What's the expected output?
- In step 2 and in step 4, the product form is still open, and the name field still reads
  `Interrupted`.
- The app does not show the **Sign in** screen at any point.
- Tap **Cancel** and then **Discard** when finished, so nothing is saved.

## Test 24 - Title: Phone storage almost full, and the clock set wrong

### What will be tested?
You will save a product on a phone that is almost out of storage, then try Google sign-in with the
phone's clock set wrong. A pass means saving still works; the sign-in may fail, and the test is to
record exactly what it says.

### What do you need before starting?
- A phone with almost no free storage (fill it with videos or photos if needed), signed in, on the
  **Products** list.

### Steps
1. Tap **Add product**, type `Full phone` in the name field, go to the **Review** step, and tap
   **Save as active**.
2. In the phone's Settings, turn off automatic time and set the clock five minutes wrong.
3. In the app, sign out, then tap **Continue with Google** on the **Sign in** screen and sign in.
4. Set the phone's clock back to automatic when finished.

### What's the expected output?
- After step 1, the page for **Full phone** opens with a **Product saved** message bar, the same as
  on a phone with free space. Delete **Full phone** afterwards.
- Step 3 may fail. If it does, write down the exact message shown on the **Sign in** screen (it may
  read **Sign-in failed. Try again.**), so the developer can match it.

## Test 25 - Title: Phone and tablet layouts

### What will be tested?
You will look at the product form's **Review** step and an archived item's page on a phone and on a
tablet. A pass means the buttons fit on both sizes, with none cut off, and each layout puts them in
its own place.

### What do you need before starting?
- A phone and a tablet, both signed in to the same account.
- One archived item on **Products** (archive any item with its **Archive** button).

### Steps
1. On the phone, open **Products**, tap **Add product**, and tap **Next** until the **Review** step.
   Look at the save buttons.
2. On the tablet, do the same.
3. On each device, go back to the **Products** list and open the archived item's page. (The list
   hides archived items by default: use the **Filters and sort** button to show **All**.)

### What's the expected output?
- On the phone in step 1, the three buttons (**Save as draft**, **Save as active**, **Cancel**) are
  stacked one above the other across the full width at the bottom of the screen, and none is cut off.
- On the tablet in step 2, **Cancel**, **Save as draft** and **Save as active** sit in the bar across
  the top of the screen, and the form's steps are listed down the left side.
- On both devices in step 3, the archived item's page shows a **Restore** button where **Archive**
  would normally be, and never both buttons at once.
