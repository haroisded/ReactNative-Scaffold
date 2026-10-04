# Home — acceptance tests

Covers the **Home** screen: your list of systems, and the form that makes a new one. It holds the
part of the retired Inventory and Stock Test 39 that is about this screen.

---

## Group 1 — Normal use

Not covered here yet: no change has touched this screen since the tests were split by screen.

## Group 2 — Mistakes and edge cases

Not covered here yet, for the same reason.

## Group 3 — Accounts

Not covered here yet, for the same reason.

---

## Group 4 — Outside the app

## Test 1 - Title: The new system form on a phone and a tablet

> Retired by home.md Test 3.

### What will be tested?
You will open the form that makes a new system on a tablet and on a phone. A pass means it fills the
whole screen on both, instead of opening as a box in the middle.

### What do you need before starting?
- A phone and a tablet signed in to the same account, each on **Home** (tap **Home** in the bar at the
  bottom).

### Steps
1. On the tablet, tap **Create New System**.
2. Tap the back arrow at the top left.
3. Do steps 1 and 2 on the phone.

### What's the expected output?
- After step 1, on both, the new system form fills the whole screen with a back arrow at the top left.
- After step 2, on both, **Home** shows again with no new system added.

## Test 2 - Title: Systems list on a tablet held sideways

> Retired by home.md Test 4.

### What will be tested?
You will look at the list of your systems on a tablet. A pass means nothing is stretched across the
whole screen: the create button is button-sized and each system is a card, side by side.

### What do you need before starting?
- Signed in on a tablet held sideways, with at least one system.

### Steps
1. Open the app. The list of your systems shows.

### What's the expected output?
- Under the "Your POS Systems" heading, a dark **Create New System** button about as wide as its words,
  on the left. It does not stretch across the screen.
- Each system is a card with a wide grey picture area, its name, and **Edit** and **Remove** buttons.
  The grey area is wider than it is tall.
- Several systems sit side by side in a row, not one per line.

---

## Added later — Normal use

## Test 3 - Title: The Create System card on a tablet, and the button on a phone

### What will be tested?
On **Home** you will start a new system on a tablet and on a phone. A pass means the tablet offers a
**Create New System** card as the first card in the list of systems, the phone still offers a
**Create New System** button, and both open the same full-screen form.

### What do you need before starting?
- A phone and a tablet signed in to the same account, each on **Home** (on the phone, tap **Home** in the
  bar at the bottom).

### Steps
1. On the tablet, look at the first card in the list of your systems, at the top left under
   **Your POS Systems**.
2. Tap that card. A form opens.
3. Tap the back arrow at the top left. **Home** shows again.
4. On the phone, tap the dark **Create New System** button under **Quick Actions**.
5. Tap the back arrow at the top left.

### What's the expected output?
- After step 1, the first card has a thin dashed grey outline, a red circle with a white **+** in its
  middle, **Create New System** under the circle, and **Make your own point-of-sale system.** under that.
  There is no dark **Create New System** button above the cards on the tablet.
- After step 2, the new system form fills the whole tablet screen, with a back arrow at the top left.
- After step 3, no new system was added to the list.
- After step 4, the same form fills the whole phone screen. After step 5, **Home** shows again with no new
  system added.

## Test 4 - Title: Systems list on a tablet held sideways

### What will be tested?
You will look at **Home** on a tablet held sideways. A pass means the heading reads clearly at the top
and your systems sit three to a row, as cards of the same height, with the **Create New System** card
first.

### What do you need before starting?
- Signed in on a tablet held sideways, with at least two systems.

### Steps
1. Open the app. **Home** shows the list of your systems.
2. Look at the bar at the very top, then at the heading under it, then at the cards.

### What's the expected output?
- In the top bar, **Merchant** sits beside a dark circle on the left, with a bell and a person icon on the
  right. **Merchant** is easy to read, about the size of the heading on a page.
- Under the bar, **Your POS Systems** is a large bold heading, with
  **Manage, edit, and monitor your custom point-of-sale system.** in ordinary text right under it.
- The cards start right under that line. The first row holds three cards side by side: the
  **Create New System** card, then two of your systems. A fourth card, if any, starts a new row.
- Every card in a row is the same height. Each system card has a grey picture area, its name, and
  **Edit** and **Remove** buttons.

---

## Added later — Accounts

## Test 5 - Title: A new account on a tablet sees only the Create System card

### What will be tested?
You will sign in on a tablet with an account that has no systems. A pass means **Home** shows only the
**Create New System** card, and none of the other account's systems, even for a moment.

### What do you need before starting?
- A tablet signed in to an account that has at least one system, and a second Google or Facebook account
  that has never made a system.

### Steps
1. On **Home**, tap the person icon at the top right. A **Profile** window opens over **Home**.
2. Tap the red **Sign Out** at the bottom right of that window. The sign-in screen opens.
3. Sign in with the second account. Watch **Home** as it opens.

### What's the expected output?
- After step 3, **Home** shows the **Your POS Systems** heading and one card only: **Create New System**.
- At no point during step 3 does a system of the first account appear, even briefly.
- There is no **No systems yet** line on the tablet: the **Create New System** card stands in for it.

---

## Added later — Outside the app

## Test 6 - Title: Home on a tablet with no internet

### What will be tested?
You will open **Home** on a tablet with the internet off. A pass means the **Create New System** card
still shows, with a clear offline line under it, not an endless spinner.

### What do you need before starting?
- Signed in on a tablet, with at least one system.

### Steps
1. Swipe the app away from recent apps.
2. Turn on airplane mode.
3. Open the app.
4. Turn airplane mode off, and wait a few seconds.

### What's the expected output?
- After step 3, **Home** shows the **Create New System** card, or your systems if they were already
  loaded. If they were not, the line **You're offline. Your systems will load when you reconnect.** is
  under the card — no spinner that never stops.
- After step 4, your systems appear beside the **Create New System** card without tapping anything.
