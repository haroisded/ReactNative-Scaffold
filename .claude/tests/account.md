# Account — acceptance tests

Covers the **Profile** page — opened from the **Account** tab on a phone, and from the person icon at
the top of **Your POS Systems** on a tablet — with **Sign Out** and **Delete account**. Profile is no
longer opened from inside a system (`side-menu.md` Test 3).

## Test 1 - Title: Profile from the Account tab on a phone

### What will be tested?
On a phone, you will open **Profile** from the bottom bar. A pass means a shop owner can always find
their account details and the sign-out button.

### What do you need before starting?
- A phone, signed in, on the **Home** tab.

### Steps
1. Tap **Account** (the person icon at the right end of the bottom bar). A page titled **Profile**
   opens.

### What's the expected output?
- Near the top of **Profile**: a round person picture, your name in bold, and your email under it.
- Further down: **ACCOUNT** and **SECURITY & PRIVACY** lists, a **Themes** row, a red **Sign Out**
  button and a red **Delete account** text button.
- There is no **Back to your systems** button.

## Test 2 - Title: Profile from the person icon on a tablet

### What will be tested?
On a tablet, where there is no bottom bar, you will open **Profile** from the top of the systems list.
A pass means a tablet user can still reach Sign Out and Delete account.

### What do you need before starting?
- A tablet held sideways, signed in, on **Your POS Systems**.

### Steps
1. Tap the person icon at the right end of the top bar. A page titled **Profile** fills the screen.
2. Tap the **Go Back** button near the bottom of the page.

### What's the expected output?
- After step 1, **Profile** shows an **Account Details** card (full name, email address, signed in
  with, account ID), the **Themes** row, and **Go Back** and **Sign Out** buttons side by side.
- It is a full page, not a box floating over the systems list.
- After step 2, **Your POS Systems** is back on screen.

## Test 3 - Title: Sign out from Profile

### What will be tested?
On **Profile**, you will sign out. A pass means signing out always lands on the sign-in screen with
nothing frozen.

### What do you need before starting?
- A phone, signed in, on **Profile** (Test 1).

### Steps
1. Tap **Sign Out**.
2. Sign back in as the same person.

### What's the expected output?
- After step 1, the sign-in screen appears.
- After step 2, the **Home** tab shows the same systems you had before signing out.

## Test 4 - Title: Cancel deleting the account

### What will be tested?
On **Profile**, you will start deleting your account and then change your mind. A pass means
cancelling deletes nothing.

### What do you need before starting?
- A phone, signed in, on **Profile**.

### Steps
1. Tap the red **Delete account** text. A panel rises from the bottom titled **Delete account?**.
2. Tap **Cancel** in that panel.

### What's the expected output?
- The panel closes and **Profile** is still showing, with your name and email unchanged.

## Test 5 - Title: Delete an account that has systems

### What will be tested?
On **Profile**, you will delete an account that owns a system. A pass means the account and its
systems are gone for good, and signing up again starts empty.

### What do you need before starting?
- A spare Google or Facebook account you are willing to delete, signed in on a phone.
- One system made with it (`systems.md` Test 1 steps), so the **Home** tab is not empty.

### Steps
1. Tap **Account** in the bottom bar. **Profile** opens.
2. Tap **Delete account**. The **Delete account?** panel rises from the bottom.
3. Tap the red **Delete** button in the panel.
4. Sign in again with the same spare account.

### What's the expected output?
- After step 3, the sign-in screen appears.
- After step 4, the **Home** tab shows **No systems yet.** — the system from before is gone.

## Test 6 - Title: Delete account on a tablet

### What will be tested?
On a tablet's **Profile**, you will open the delete confirmation. A pass means the tablet asks in a
box over the page, and cancelling it changes nothing.

### What do you need before starting?
- A tablet, signed in, on **Profile** (Test 2, step 1).

### Steps
1. Tap **Delete account**. A box titled **Delete account?** opens in the middle of the screen.
2. Tap **Cancel**.

### What's the expected output?
- After step 1, the box sits over **Profile**, with **Cancel** and a red **Delete** button.
- After step 2, the box closes and **Profile** is unchanged.

## Test 7 - Title: Delete account with no internet

### What will be tested?
On **Profile**, you will try to delete the account while offline. A pass means the app says it is
offline instead of hanging, and nothing is half-deleted.

### What do you need before starting?
- A phone, signed in, on **Profile**.

### Steps
1. Turn on airplane mode.
2. Tap **Delete account**, then **Delete** in the panel that rises.
3. Turn airplane mode off.

### What's the expected output?
- After step 2, red text in the panel reads **You're offline. Reconnect and try again.** and the panel
  stays open; you are still signed in.
- After step 3, you are still signed in and your systems are still on the **Home** tab (tap **Cancel**
  to close the panel).

> Another person's account: that one person never sees another's systems is `systems.md` Test 12.
>
> Not covered here: battery, interruptions and storage — **Profile** saves nothing; its only writes
> are Sign Out and Delete account, covered above.
