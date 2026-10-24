# Revised TIPalit product overview (only what's built)

## Decisions (settled)

- **Framing:** Describe only what the app does today. Anything that isn't built is removed or rewritten.
- **Output:** You get the revised text and a list of what changed. **No files change.** INFO.md and README.md stay as they are.
- No UI is touched, so the design-system and font rules don't come into play.

## Implementation

1. After you approve, paste the revised copy below into chat exactly as written, followed by the change list.
2. No repo edits, builds, or checks are needed.

Every claim was checked against the code: `src/services/types.ts`, `src/data/seed.ts` (categories, subject codes, meetup spots, safety rules), `FeedScreen`, `AddListingScreen`, `ProductDetailScreen`, `ChatThreadScreen`, `MeetupPickerSheet`, `RateModal`, `SellerTrustCard`, and `src/services/mock/admin.ts`.

---

## Revised copy

### Product Overview

TIPalit is a mobile-first web marketplace where students of the Technological Institute of the Philippines buy and sell academic materials and other school items with each other (consumer-to-consumer). Students don't have to dig through informal social media posts. They browse listings from their own campus in one place, message sellers in the app, and hand items over in person at campus-approved meetup spots.

### Core Capabilities and System Functionality

**Course-based discovery:** Students search listings by title, subject code (for example MATH 010 or ARCH 101), category, or description. They can also filter the feed by category or department (CBA or Engineering), so it's easy to find items for a specific course.

**Quick listing creation:** Sellers post from one short form. Title, price, category, and subject code are required. A photo and description are optional, and condition (Like New, Good, or Used) and meetup spot come pre-selected and can be changed. After posting, sellers can edit a listing, mark it as sold or available again, or delete it.

**Verified student access:** Only `@tip.edu.ph` Google accounts can sign in, and the whole marketplace, including browsing, requires sign-in. New members finish a short profile (name, campus, program, year) and accept a safety pledge before the feed unlocks.

**Campus scoping:** Each member belongs to TIP Manila or TIP Quezon City. Their feed, new listings, and meetup spots all follow that campus.

**Direct campus exchanges:** Buyers and sellers meet in person at approved spots on their campus, so there's no shipping or delivery.

### Key Features and Benefits

**Institutional verification safeguard:** Students sign in with Google using their official `@tip.edu.ph` account. Personal and other non-TIP accounts are rejected, and sellers show a "Verified TIP Student" badge.

*Benefit:* This keeps out anonymous and outside users and lowers the risk of fake accounts and scams.

**Curriculum-aligned categorization:** Listings fall into five categories: Textbooks, Calculators, Uniforms, Lab Gear, and Drafting Tools. Every listing is also tagged with a subject code.

*Benefit:* Students find items for their courses quickly instead of scrolling past unrelated posts.

**Integrated in-app messaging:** "Message Seller" on a listing opens a chat tied to that item, where buyers and sellers can ask questions and agree on details.

*Benefit:* Nobody has to share a phone number or social media account to make a deal.

**Campus meetup coordinator:** From the chat, either person proposes a meetup by picking an approved spot and a time, and the other accepts or declines. Spots are set per campus by the Office of Student Affairs, for example Library Plaza, Main Lobby, and Cafeteria Entrance at TIP Quezon City, or Library Lobby, Canteen Entrance, and Student Lounge at TIP Manila. After the hand-off, the meetup is marked done and can be rated from 1 to 5 stars with an optional comment.

*Benefit:* Students can plan exchanges around their class schedules at visible, approved places, and ratings build trust over time.

**Safety and moderation:** Members agree to safety rules during sign-up: meet only at approved spots, inspect before paying, never share passwords or OTPs, and report anything suspicious. Any listing or member can be reported from the listing page or the chat. Office of Student Affairs staff review reports in an admin console and can remove listings, suspend or reinstate members, and update meetup spots.

*Benefit:* Problems reach campus staff who can act on them, not just other students.

### Step-by-Step User Workflow

**Onboarding and verification:** A student opens TIPalit in their phone's browser, taps **Continue with Google**, and picks their `@tip.edu.ph` account. They fill in their profile (name, campus, program, year), accept the safety pledge, and land on their campus feed.

**Item listing (seller flow):** A graduating student opens the **Sell** tab, adds a photo of their drafting kit, enters a title and price, chooses the **Drafting Tools** category and the **ARCH 101** subject code, sets the condition and preferred meetup spot, and posts the listing.

**Search and discovery (buyer flow):** An incoming freshman searches for **ARCH 101**, finds the drafting kit, and taps **Message Seller** to ask about it.

**Coordination and physical exchange:** In the chat, the two agree on the details, and the buyer proposes a meetup at **Library Plaza** at a time between classes. The seller accepts. They meet, the buyer inspects the item and pays in person (TIPalit doesn't handle payments), and the meetup is marked done and rated. The seller then marks the listing as sold.

---

## What changed and why

| Original claim | Revision | Reason |
|---|---|---|
| "Downloads TIPalit" | Opens it in a phone browser | It's a mobile-first web app with no app-store download. |
| Registers with an email address, and "an automated verification link is sent" | Continue with Google using a `@tip.edu.ph` account | Sign-in is Google only. No emails or verification links are sent. |
| Only communication and transaction features are limited to verified members | The whole app, browsing included, requires sign-in | Guests can't see the feed. |
| "Department requirements" for search | Search by title, subject code, category, or description, plus CBA and Engineering department filters | That's how search and filtering actually work. |
| Uploads "photos" and publishes "in under one minute" | One optional photo, plus a list of the actual required fields | A listing holds one photo, and the timing claim isn't measured. |
| Categories include "engineering tools" and "technology gadgets" | Textbooks, Calculators, Uniforms, Lab Gear, Drafting Tools | These are the only five categories in the app. |
| Meetup spots "Student Center", "Library Lobby", "Campus Cafeteria", and "TIP Library Plaza" | Real spots for each campus, such as Library Plaza at QC and Library Lobby at Manila | Student Center and Campus Cafeteria don't exist in the app. Spots differ by campus. |
| The app "suggests" spots, and "both parties must still agree" | Propose a spot and time in chat, then accept or decline | The app has a structured propose, accept, or decline flow. |
| Engineering Drawing Kit, "selects the appropriate course code" | Drafting kit under Drafting Tools / ARCH 101 | Matches a real category and subject code. |
| Pays "through cash or an e-wallet" | Pays in person, and TIPalit doesn't handle payments | The app has no payment feature. Its safety rules talk about handing over cash. |
| Not mentioned | Campus scoping, profile and safety pledge, ratings, reporting, and Office of Student Affairs moderation | These are major built features that were missing. |
| Not mentioned | Edit, mark as sold or available, delete | These are real seller actions. |
