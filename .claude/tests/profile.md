# Profile — acceptance tests

Covers the **Profile** screen: the **Themes** row under **Preferences**, and the actions around it
(**Sign Out**, **Delete account**). The rows **Account Information**, **Your Businesses**,
**Manage Devices**, **Privacy Policy** and **Terms of Service** are not built yet — tapping them is
meant to do nothing, so they are not tested here.

**Words used in this file**

- **Light look / dark look** — the app's two colour schemes. The light look has a pale background
  with dark writing; the dark look has a dark background with pale writing.
- **The theme button** — the round button with two arrows going in a circle, at the right end of the
  **Themes** row. Each tap swaps the app between the light look and the dark look.
- **Closing the app fully** — opening the phone's list of recent apps and swiping the app away, so it
  is no longer running at all.

## Test 1 - Title: The Themes row looks right

### What will be tested?
On the **Profile** screen, you will find the **Themes** row and check its two pictures. A pass means
the row is there with its name, a picture on the left and a working-looking button on the right,
rather than empty squares where a picture failed to load.

### What do you need before starting?
- Signed in, on a phone.

### Steps
1. Open **Profile**: tap **Account** in the tab bar at the bottom of the screen, or, inside a system,
   tap the person-shaped **Account** button at the top right. The **Profile** screen opens.
2. Scroll down until you see the heading **Preferences**.
3. Look at the row directly under **Preferences**.

### What's the expected output?
- Under the **Preferences** heading on the **Profile** screen there is a row that reads **Themes**.
- At the left end of the **Themes** row is a picture of a paint palette — not an empty square or a
  question mark.
- At the right end of the **Themes** row is a round button showing two arrows going in a circle —
  not an empty square.

## Test 2 - Title: The theme button changes the app between light and dark

### What will be tested?
On the **Profile** screen, you will tap the theme button twice. A pass means each tap changes the
look of the whole screen straight away, and the second tap puts it back how it started.

### What do you need before starting?
- Signed in, on the **Profile** screen, on a phone.

### Steps
1. Look at the screen and note whether the app is in the light look (pale background) or the dark
   look (dark background).
2. Scroll to **Preferences** and tap the theme button at the right end of the **Themes** row.
3. Look at the screen.
4. Tap the theme button again.

### What's the expected output?
- After step 2, the whole **Profile** screen swaps to the other look straight away: a pale background
  turns dark, or a dark background turns pale. There is no loading circle and no blank screen in
  between.
- After step 4, the **Profile** screen is back in the look you noted in step 1.

## Test 3 - Title: The app remembers the look after being closed

### What will be tested?
You will pick a look, close the app fully and open it again. A pass means the app opens in the look
you picked, so the owner does not have to choose it again every time.

### What do you need before starting?
- Signed in, on the **Profile** screen, on a phone.

### Steps
1. Tap the theme button on the **Themes** row once, so the app is in the opposite look to the one it
   started in. Note which look it is now.
2. Close the app fully: open the phone's recent apps and swipe the app away.
3. Tap the app's icon on the phone's home screen to open it again.

### What's the expected output?
- When the app opens in step 3, every screen is in the look you noted in step 1.
- While the app is starting up, it does not flash the other look first, not even for a split second.

## Test 4 - Title: The app's choice wins over the phone's own dark mode

### What will be tested?
You will pick the dark look in the app, then switch the phone's own dark mode on and off. A pass
means that once a look is picked in the app, the phone's own setting no longer changes it.

### What do you need before starting?
- Signed in, on the **Profile** screen, on a phone.
- The phone's own dark mode turned **off** (in the phone's Settings, under Display).

### Steps
1. Tap the theme button on the **Themes** row until the app is in the dark look.
2. Leave the app, open the phone's Settings, and turn the phone's dark mode **on**.
3. In the phone's Settings, turn the phone's dark mode **off** again.
4. Go back to the app.

### What's the expected output?
- Back in the app after step 4, the **Profile** screen is still in the dark look.
- At no point did the app switch itself to the light look because of the phone's setting.

## Test 5 - Title: The phone's clock and icons stay readable in both looks

### What will be tested?
You will look at the thin strip at the very top of the phone's screen — the clock, battery and
signal icons — in each look. A pass means that strip is readable against the app's background in
both, never pale writing on a pale background or dark on dark.

### What do you need before starting?
- Signed in, on the **Profile** screen, on a phone.

### Steps
1. Using the theme button on the **Themes** row, put the app in the light look.
2. Look at the clock, battery and signal icons at the very top edge of the phone's screen.
3. Tap the theme button to put the app in the dark look.
4. Look at the clock, battery and signal icons again.
5. Look at the phone's own buttons along the very bottom edge of the screen (back, home, recent
   apps), in both looks.

### What's the expected output?
- After step 2, the clock, battery and signal icons at the top edge are dark and clearly readable on
  the pale background.
- After step 4, the same icons are pale and clearly readable on the dark background.
- For step 5, write down what the phone's buttons at the bottom edge look like in each look. They are
  known not to follow the app's look yet, so report what you see rather than marking it a failure.

## Test 6 - Title: Tapping the theme button many times quickly

### What will be tested?
You will tap the theme button very fast, many times in a row. A pass means the app settles on one
look for the whole screen, and does not freeze, close, or leave some parts in the other look.

### What do you need before starting?
- Signed in, on the **Profile** screen, on a phone.

### Steps
1. Tap the theme button on the **Themes** row eight times, as fast as you can.
2. Stop, and wait two seconds.
3. Look over the whole **Profile** screen, from the top edge to the bottom edge.

### What's the expected output?
- After step 3, the whole **Profile** screen is in one look — the background, the cards, the writing
  and the tab bar at the bottom all match. No card or bar is left in the other look.
- The app did not freeze, and did not close itself.

## Test 7 - Title: Every other screen follows the look

### What will be tested?
You will change the look on **Profile** and then visit other screens. A pass means the look applies
to the whole app, not only to the **Profile** screen.

### What do you need before starting?
- Signed in, on the **Profile** screen, on a phone, with at least one system (shop) already created.

### Steps
1. Tap the theme button on the **Themes** row once. Note which look the app is in now.
2. Go back to the list of your systems: tap **Home** in the tab bar at the bottom.
3. Tap one of your systems. It opens on its own home page.
4. Tap the **☰** menu button at the top left. The side menu slides in. Tap **Resources**, then
   **Products**. The **Products** list opens.
5. Tap any product in the list, if there is one. That product's page opens.

### What's the expected output?
- The list of systems in step 2, the system's home page in step 3, the side menu and the **Products**
  list in step 4, and the product's page in step 5 are all in the look you noted in step 1.

## Test 8 - Title: The Themes row on a tablet

### What will be tested?
You will find and use the **Themes** row on a tablet, where **Profile** is laid out wider. A pass
means the row is there in the wider layout and works the same way as on a phone.

### What do you need before starting?
- Signed in, on a tablet held upright. The app is locked to upright, so do not turn the tablet on
  its side.

### Steps
1. Open **Profile**: tap **Account** in the tab bar, or the person-shaped **Account** button at the
   top right inside a system. The **Profile** screen opens.
2. Find the **Preferences** heading on the screen.
3. Tap the theme button at the right end of the **Themes** row.

### What's the expected output?
- After step 2, the **Preferences** heading and the **Themes** row under it are on the **Profile**
  screen, below the **Account Details** card that shows the account's name and email.
- After step 3, the whole tablet screen swaps between the light look and the dark look straight
  away, the same as it does on a phone.

## Test 9 - Title: Sign out and sign back in as the same person

### What will be tested?
You will pick a look, sign out and sign back in. A pass means signing out does not reset the look,
and the sign-in screen itself already uses it.

### What do you need before starting?
- Signed in, on the **Profile** screen, on a phone.

### Steps
1. Tap the theme button on the **Themes** row once, so the app is in the opposite look to the one it
   started in. Note which look it is now.
2. Scroll down the **Profile** screen to **Sign Out** and tap it. The app leaves Profile.
3. Look at the screen that opens — the sign-in screen, headed **Sign in**, with **Continue with
   Google** and **Continue with Facebook** buttons.
4. Sign in again with the same account you used before.

### What's the expected output?
- After step 3, the sign-in screen is already in the look you noted in step 1.
- After step 4, the app is still in that same look on every screen.

## Test 10 - Title: A different person signs in on the same phone

### What will be tested?
You will pick the dark look as one person, then sign in as a second person. A pass means the look
stays with the phone (the second person gets the dark look too), while none of the first person's
details are shown to the second person.

### What do you need before starting?
- Two different accounts that can sign in on this phone — the first person's and the second
  person's.
- Signed in as the first person.

### Steps
1. On the **Profile** screen, tap the theme button on the **Themes** row until the app is in the
   dark look.
2. Scroll down to **Sign Out** and tap it. The **Sign in** screen opens.
3. Sign in with the second person's account.
4. Open **Profile** (tap **Account** in the tab bar at the bottom).
5. Look at the name and email shown on the **Profile** screen, in the **Account Details** card.

### What's the expected output?
- After step 3, the app is in the dark look for the second person as well.
- After step 5, the **Account Details** card on the **Profile** screen shows the second person's name and email.
- The first person's name, email or systems never appear while the second person is signed in, not
  even for a moment while a screen is loading.

## Test 11 - Title: Delete the account

### What will be tested?
You will delete an account from the **Profile** screen. A pass means the app signs out to the
sign-in screen, keeps the phone's chosen look, and that signing up again starts with nothing — the
old systems are gone.

### What do you need before starting?
- A throwaway account (one you are happy to lose for good) that has at least one system.
- Signed in as that account, on a phone, with the app in the dark look.

### Steps
1. Open **Profile** and scroll down to **Delete account**. Tap it. A box headed **Delete
   account?** opens, warning that this cannot be undone.
2. In the **Delete account?** box, tap **Delete**.
3. On the **Sign in** screen, sign in again the same way as before (the same Google or Facebook
   account).
4. Look at the list of systems on the home screen.

### What's the expected output?
- After step 2, the app goes to the **Sign in** screen, and that screen is still in the dark look.
- After step 4, the home screen shows no systems at all — the system the deleted account had is
  gone.

## Test 12 - Title: Changing the look with no internet

### What will be tested?
You will change the look while the phone is in airplane mode. A pass means the look needs nothing
from the internet: it changes, and is remembered, even offline.

### What do you need before starting?
- Signed in, on the **Profile** screen, on a phone.

### Steps
1. Turn on the phone's airplane mode.
2. Tap the theme button on the **Themes** row once, and look at the screen.
3. Tap the theme button again, and look at the screen. Note which look the app is in.
4. Close the app fully (swipe it away from recent apps), then open it again.
5. Turn airplane mode off when finished.

### What's the expected output?
- After step 2 and after step 3, the **Profile** screen swaps look straight away both times, with no
  error message and no loading circle.
- After step 4, the app opens in the look you noted in step 3.

## Test 13 - Title: A phone call, then a long time in the background

### What will be tested?
You will interrupt the app with a call, then leave it in the background for ten minutes. A pass
means the look you picked is still there after both, and the app does not ask you to sign in again.

### What do you need before starting?
- Signed in, on the **Profile** screen, on a phone.
- The app set to the opposite look to the phone's own dark-mode setting (for example: phone dark
  mode off, app in the dark look).

### Steps
1. Have someone call the phone (or open any notification), then return to the app.
2. Press the phone's home button so the app goes to the background. Wait ten minutes.
3. Open the app again from the recent apps list.

### What's the expected output?
- After step 1, the app is in the same look as before the call.
- After step 3, the app is still in that look, and it is still signed in — it shows the screen you
  left, not the **Sign in** screen.

## Test 14 - Title: Phone storage almost full

### What will be tested?
You will change the look on a phone that has almost no free storage. A pass means the app can still
change and remember the look even when the phone is short of space.

### What do you need before starting?
- A phone with almost no free storage (fill it with videos or photos if needed), signed in, on the
  **Profile** screen.

### Steps
1. Tap the theme button on the **Themes** row once. Note which look the app is in now.
2. Close the app fully (swipe it away from recent apps), then open it again.

### What's the expected output?
- After step 1, the **Profile** screen swaps look straight away.
- After step 2, the app opens in the look you noted in step 1. If it opens in the other look, write
  that down — it means the phone had no room to save the choice.

---

**Sample records:** none. Nothing on this screen creates, edits or deletes a record of its own, so
the two-record cycle in the acceptance-test rules does not apply here. Test 11 is the one thing that
removes data, and it removes the account itself.
