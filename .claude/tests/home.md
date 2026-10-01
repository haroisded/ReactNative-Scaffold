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
