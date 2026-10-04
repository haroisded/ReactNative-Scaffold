# Sign-in — acceptance tests

Covers the **Sign in** screen's layout. Signing in with Google and Facebook, and cancelling, are in the
project README's **Verify** list.

---

## Group 1 — Normal use

Not covered here: the only change to this screen is its layout, tested in Group 4.

## Group 2 — Mistakes and edge cases

Not covered here, for the same reason.

## Group 3 — Accounts

Not covered here, for the same reason.

---

## Group 4 — Outside the app

## Test 1 - Title: Sign-in buttons on a tablet and a phone

### What will be tested?
You will look at the **Sign in** screen on a tablet held sideways and on a phone. A pass means the
buttons on the tablet are a sensible width in the middle of the screen, not stretched from edge to edge,
and the phone looks as it did.

### What do you need before starting?
- A tablet and a phone, each signed out (on the **Sign in** screen).

### Steps
1. On the tablet, look at the **Sign in** heading and the two buttons under it.
2. Look at the phone's **Sign in** screen.

### What's the expected output?
- On the tablet, **Sign in**, the dark **Continue with Google** button and the light
  **Continue with Facebook** button sit in one column in the middle of the screen, about a third of the
  screen wide. The heading lines up with the left edge of the buttons, not with the edge of the screen.
- On the phone, the heading and both buttons stretch across the screen, as before.
