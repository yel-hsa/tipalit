# TIPalit User Manual

TIPalit is a campus marketplace for students of the Technological Institute of the Philippines (TIP). Students buy and sell textbooks, calculators, uniforms, lab gear, and drafting tools with other verified TIP students, then hand items over at campus-approved meetup spots.

This manual covers who uses the app, every screen, and the main flows. For architecture and backend wiring, see `README.md`.

---

## 1. Who uses TIPalit

| User type | Who they are | What they can do |
|---|---|---|
| **Guest** | Someone who opened the app but has not signed in | Read the 3-slide intro and the community rules. Nothing else. |
| **New member** | Signed in with a `@tip.edu.ph` Google account, setup not finished | Fill in their profile and accept the safety pledge. The marketplace stays locked until both are done. |
| **Member: buyer** | A verified student browsing their campus | Search and filter the feed, open listings, message sellers, propose meetups, rate after a hand-off, report listings or people. |
| **Member: seller** | The same account, acting as a seller | Post listings, edit them, mark them as sold or available, delete them, and accept or decline meetups. |
| **Rejected account** | Signed in with a personal or other non-TIP Google account | Sees why they were rejected and can try another account. They never get in. |
| **Admin** | Office of Student Affairs staff, signed in with a staff account that has the admin role | Everything a member can do, plus the **Admin** tab: review reports, remove listings, suspend or reinstate members, edit meetup spots, and read the activity log. |
| **Suspended member** | A member an admin has suspended | Can't sign in. Their listings are hidden from the feed. At sign-in they're told to contact the Office of Student Affairs to appeal. |
| **Reviewer** (internal) | QA, designers, or stakeholders reviewing the prototype | Everything a member can do, plus **Reviewer tools** for forcing loading, empty, and error states. Hidden from normal users. |

Every member is both a buyer and a seller; there is no separate seller account. Members belong to one campus, **TIP Manila** or **TIP Quezon City**. The campus decides which listings and meetup spots they see.

**Admin access** is a role the server grants to specific staff accounts; nobody can choose it in the app. In this prototype, sign in as **Office of Student Affairs (`osa.admin@tip.edu.ph`)** from the account chooser. Admins skip the student onboarding and land on the Admin tab.

---

## 2. First-run onboarding

```
Intro (3 slides) → Sign in → Google account chooser → Profile setup (step 1 of 2) → Safety pledge (step 2 of 2) → Feed + welcome toast
```

1. **Intro.** Three swipeable slides: *Verified TIP students only*, *Meet at campus-approved spots*, and *Chat, schedule, and rate meetups*. **Skip** or **Next**, then **Get started** on the last slide. The intro is shown once per device.
2. **Sign in.** One action: **Continue with Google**. The hint under the button reminds you to use your `@tip.edu.ph` account. **Community rules** opens the rules in a sheet.
3. **Google account chooser.** Pick an account. A non-TIP account shows an inline error, "*… isn't a TIP account*", with **Try another account**. A connection error shows **Try again**.
4. **Profile setup (step 1 of 2).** Full name (prefilled from Google), campus, program, and year level. Errors are listed on submit, and focus moves to the first problem. Tap **Continue**.
5. **Safety pledge (step 2 of 2).** The four community rules, then a required checkbox: *I agree to follow these rules*. Tap **Finish**.
6. **Feed.** You arrive on Home with a welcome toast.

**Resuming:** if you close or refresh the app during setup, you return to the step you were on. Back on step 1 asks before signing you out ("Leave setup?").

**Returning members:** the boot screen restores the session and opens the feed directly.

---

## 3. Screens

### Navigation

A bottom tab bar appears on the main screens: **Home**, **Sell**, **Chats**, and **Profile**, plus **Admin** for admins. Chats shows a red dot when a meetup request is waiting for your reply, and Admin shows one while reports are open. Detail screens (listing, chat thread, edit listing) replace the tab bar with a back button.

### 3.1 Boot
A short loading state while the app restores your session and theme.

### 3.2 Intro
Photo carousel with a title, body, and chip for each slide. Swipe, use the arrow keys, or tap **Next**. **Skip** or **Get started** goes to sign in.

### 3.3 Sign in
The TIPalit wordmark, the value line, **Continue with Google**, and the community rules link. Inline alerts cover the *wrong domain* and *network* cases.

### 3.4 Onboarding: profile setup and safety pledge
A two-step setup with a progress indicator, a back button, and a sticky **Continue** (step 1) or **Finish** (step 2) button.

### 3.5 Home (Feed)
- **Top bar:** wordmark and your avatar. **Tap the avatar to open your Profile.**
- **Greeting:** "Hi, *first name*", plus your campus badge.
- **Sticky search and filters:** search by title, subject code (for example `MATH 010`), or category. Category pills: All, Textbooks, Calculators, Uniforms, Lab Gear, Drafting Tools, CBA Dept, Engineering Dept.
- **Sell prompt:** a shortcut to list an item. Shown when no filter is active.
- **Fresh on campus:** a 2-column grid of listings, newest first. More items load as you scroll, and the list ends with "You're all caught up".
- **States:** skeleton cards while loading; an error card with **Retry**; an empty state with **Clear filters** and **Sell one instead**.

### 3.6 Listing detail
- A full-width photo with round **Back**, **Report** (or **Delete** on your own listing), and **Share** buttons. They use a dark backing with white icons so they stay visible on any photo.
- Badges for condition (Like New / Good / Used), subject code, and category. Title, price, posted time, department, and description follow.
- **Seller card:** name, program, verified badge, and rating.
- **Meetup spot:** where the hand-off happens on your campus.
- **Bottom action:**
  - Buyer: **Message Seller**, or *No longer available* once the item is sold.
  - Owner: **Edit** and **Mark as sold** / **Mark as available**. Delete is in the top bar and asks for confirmation.

### 3.7 Sell (Add / Edit listing)
Sections for Photo (tap or drag to add; replace or remove), Details (title, price, category, subject code, description), Condition, and Meetup spot (your campus's spots). Errors show on submit. **Post listing** waits for the server. If it fails, your entries are kept and an error toast appears. Edit uses the same form with **Save changes**.

### 3.8 Chats
One row per conversation, showing the listing thumbnail, the other person, and the last message. A **Respond** badge shows when a meetup needs your response. The empty state offers **Browse listings**.

### 3.9 Chat thread
- **Header:** back, the other person (verified shield), **Report user**, and a link to the listing.
- **Messages:** bubbles, a typing indicator, and meetup proposal cards.
- **Composer:** **Propose a meetup** (calendar icon), the message field, and **Send**.
- **Meetup cards:** *Pending*, then **Accept** or **Decline**. Once accepted: **Mark done**. Once done: **Rate now**.

### 3.10 Profile
- **Account card:** avatar with a verified mark, name, school email, program and year, campus badge, *Verified TIP Student* with member-since date, and **Edit profile**.
- **Activity:** active listings, chats, and meetups done.
- **My listings:** Active / Sold tabs. Each row opens the listing.
- **Preferences:** the **Dark mode** switch. Tap anywhere on the row to toggle it. The choice is saved.
- **Sign out** (with confirmation) and the app version.

For admins, the account card reads *TIPalit admin* with an **Admin** badge.

### 3.11 Admin (admins only)
- **Header:** "Admin · Office of Student Affairs · Both campuses".
- **Overview:** open reports (highlighted while any are open), flagged members (members with open reports), and suspended members.
- **Reports tab:** **Open** / **Closed** filter. Each row shows the reported listing or member, the reason, a status badge (*Open*, *Listing removed*, *Member suspended*, *Dismissed*), the campus, and how long ago it was filed. Tap a row to review it.
- **Review report sheet:** the reason, the reporter's details, who reported it and when, plus **View listing** and **View *member***. Choose a **Decision**:
  - **Remove listing** (listing reports only): takes it off the feed for good. Chats about it stay, marked "Listing removed".
  - **Suspend *member***: hides all their listings and blocks sign-in until reinstated.
  - **Dismiss report**: no rule broken. Nothing changes for the member.

  Add an optional note for the log, then confirm. The sheet says when the same decision also closes other open reports (for example, every report on a removed listing).
- **Members tab:** search by name or email, with **All** / **Flagged** / **Suspended** filters. Each row shows badges for *Admin*, *Suspended*, and open report counts.
- **Member sheet:** program, year, campus, status, active listings, open reports, and join date, with a list of open reports you can jump into. **Suspend** needs a reason, which goes in the log. **Reinstate** takes an optional note. Staff accounts can't be suspended here.
- **Spots tab:** pick a campus, remove spots (each campus keeps at least one), or add new ones. Changes apply right away to the Sell form and the meetup picker. Existing listings keep their spot.
- **Log tab:** every admin action, newest first, with who did it, when, and the note.

### 3.12 Overlays
| Overlay | Opened from | Purpose |
|---|---|---|
| Google account chooser | Sign in | Pick a Google account |
| Community rules sheet | Sign in | Read the four rules |
| Edit profile sheet | Profile | Change name, campus, program, or year. Changing campus asks for confirmation. |
| Meetup picker sheet | Chat composer | Pick a spot, a day, and a time |
| Report modal | Listing detail, chat header | Choose a reason, add optional details, and submit |
| Rate modal | Completed meetup card | Give 1–5 stars |
| Confirm modal | Delete listing, Sign out | Confirm destructive actions |
| Reviewer tools | Profile (reviewer mode only) | Force demo states |
| Review report sheet | Admin → Reports | Read a report and decide on it |
| Member sheet | Admin → Members, or a report | Suspend or reinstate a member |

---

## 4. Core flows

### Buy an item
Home → search or filter → open a listing → **Message Seller** → chat → **Propose a meetup** (spot + day + time) → the seller accepts → meet and inspect → **Mark done** → **Rate now**.

### Sell an item
**Sell** tab (or the Home sell prompt) → add a photo and details → **Post listing** → the listing opens → buyers message you → accept or decline meetups → after the hand-off, **Mark as sold**.

### Manage a listing
Profile → My listings → open a listing → **Edit**, **Mark as sold / available**, or **Delete** (with confirmation). Chats about a deleted listing stay, marked "Listing removed".

### Report
On a listing: flag icon → choose a reason (*Scam or suspicious price*, *Prohibited item*, *Misleading photos or description*, *Already sold*, *Other*).
On a person: the chat header flag → choose a reason (*Not a TIP student*, *Harassment or inappropriate messages*, *No-show at meetup*, *Scam attempt*, *Other*).

The report goes to the admin queue. The reported person isn't told who reported them. If sending fails, the form stays open with your answers so you can try again.

### Review a report (admin)
Admin → **Reports** → open a report → check it with **View listing** / **View *member*** → choose **Remove listing**, **Suspend *member***, or **Dismiss report** → add a note (optional) → confirm. The report moves to **Closed** and the action appears in the **Log**.

### Suspend or reinstate a member (admin)
Admin → **Members** → search or filter → open the member → enter a reason → **Suspend**. Their listings leave the feed at once, and they can't sign in. To undo, open them again (the **Suspended** filter helps) → **Reinstate**.

### Change meetup spots (admin)
Admin → **Spots** → pick the campus → **Add spot** or remove one. Members see the change the next time they list an item or propose a meetup.

### Change theme
Profile → Preferences → **Dark mode**.

### Sign out
Profile → **Sign out** → confirm. Your data stays saved, so signing back in with the same Google account picks up where you left off.

---

## 5. Community rules

1. **Meet only at approved spots.** Use the spots on your campus, during school hours.
2. **Inspect before you pay.** Check the item works and matches the listing.
3. **Never share passwords or OTPs.** No buyer or seller needs your login, GCash PIN, or one-time codes.
4. **Report suspicious users.** Reports are reviewed within 24 hours.

**Approved meetup spots**
- **TIP Quezon City:** Library Plaza, Main Lobby, Cafeteria Entrance, Engineering Building Steps, Gate 2 Security Post.
- **TIP Manila:** Library Lobby, Main Gate Security Post, Canteen Entrance, Student Lounge. *These are placeholders until Student Affairs confirms them.*

---

## 6. System states

| State | What the user sees |
|---|---|
| Loading | Skeletons in the shape of the content (feed cards, chat rows, profile) |
| Load failed | An error card with **Retry** |
| Empty | An explanation and a next step (for example **Browse listings** or **List an item**) |
| Action failed | An error toast. Optimistic actions (messages, meetup replies, ratings, mark as sold, delete) roll back automatically. |
| Offline at sign-in | *Couldn't reach Google* with **Try again** |

---

## 7. Reviewer mode (internal)

Turn it on with `?reviewer=1`, with `VITE_REVIEWER_MODE=true`, or by tapping **TIPalit v0.1.0** on Profile seven times. A **Reviewer tools** row then appears on Profile. It has toggles (slow network, fail next load or publish, sellers decline, empty inbox or inventory, Google failure) and shortcuts that jump to hard-to-reach states. **Reset demo data** clears everything and restarts at the intro. See `README.md §6` for the full table.

---

## 8. Backend integration at a glance

The UI talks only to the service interfaces in `src/services/types.ts`: `AuthService`, `ProfileService`, `ListingService`, `ChatService`, `PrefsService`, `ReportService`, `SettingsService`, and `AdminService`. To go live:

1. Create `src/services/<backend>/index.ts` that returns a `Services` object.
2. Register it in `src/services/index.ts` and set `VITE_DATA_ADAPTER=<backend>`.
3. Implement Google OAuth with the `hd=tip.edu.ph` hint, and **verify the `hd` claim on the server**.
4. Deliver chat events (`typing`, `message`, `meetupUpdated`) through `ChatService.subscribe`, for example over a websocket or a realtime channel.
5. Put the **admin role** on the session from the server, and **authorise every `AdminService` call on the server**. Hiding the Admin tab from members is not security.
6. Enforce suspensions on the server: refuse sign-in, revoke existing sessions, and filter suspended sellers out of `ListingService.list`.

No screen code changes are needed. `README.md §4` lists the full contract.

---

## 9. Styling

Every color, spacing, radius, type size, and elevation value lives in `src/styles/global.css`, with light and dark values. Instrument Sans is the only font face. Edit those variables to restyle the app. Notable groups:

- `--brand-*`, `--accent-*`, `--surface-*`, `--text-*`: the core palette
- `--control-fg`, `--control-border`: label, icon, and outline colors for neutral and subtle buttons (light and dark)
- `--overlay-control-bg`, `--on-overlay`: round buttons over photos
- `--switch-track-*`, `--switch-thumb*`: the dark mode switch and the reviewer toggles
