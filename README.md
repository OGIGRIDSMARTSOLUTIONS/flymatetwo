# FlyMate Mobile

First implementation milestone for FlyMate's React Native Sender experience.

## Run on Windows

Use Node.js 24 or newer. In Git Bash, open the extracted FlyMate folder and run:

```bash
npm ci
npm run start
```

Use an Expo Go build that supports SDK 58 on your phone, or start an Android emulator and press `a`. For a desktop browser preview run `npm run web`.

## Included

- Sender Home with the reference shipment cards and navigation.
- Package Details with an image picker, route, dimensions, weight, category, contents, offer and validation.
- Package Review with an edit action that preserves the draft while the app is open.

The three shipment cards are sample data. Use Save draft on the review screen to save the package details locally and reopen them under Shipments. Photos are preview-only until the upload backend is connected. Accounts, payment, shipment publication, traveler matching, handoffs, and Operations need the shared backend and later screens.

## Checks

```bash
npm run typecheck
npx expo install --check
npx expo export --platform all
```

## Package photo backend

The photo processor and Cloudinary adapter live in `server/photos/`.
The mobile app currently uses local photo previews.

Check an image without Cloudinary credentials:

```bash
cd server
npm ci
npm run photo:check -- /path/to/package.jpg
```

To verify an authenticated Cloudinary upload, set `CLOUDINARY_URL` in
`server/.env` and append `--upload` after the image path. The command prints
the asset reference, format, dimensions, and byte size. The upload creates an
asset in the configured Cloudinary account.

The production API will call the adapter after authenticating the sender and
checking draft ownership, then save its asset reference against the draft.

## Local PostgreSQL draft API

The backend accepts one configured development sender on the same computer.
In `server/.env`, set `DATABASE_URL` to your PostgreSQL connection string and
`FLYMATE_DEV_TOKEN` to a random secret of at least 32 characters. Set
`CLOUDINARY_URL` to enable photo uploads. Start with `npm ci` followed by
`npm start` in the `server` directory. The startup migration creates the draft
table if needed.

Use `Authorization: Bearer <your development token>` on each request.

| Method and path                         | Purpose                                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `GET /api/shipment-drafts`              | List the sender's latest 100 drafts                                                             |
| `PUT /api/shipment-drafts/<uuid>`       | Create or update a draft using the same UUID on retry                                           |
| `GET /api/shipment-drafts/<uuid>`       | Read one draft                                                                                  |
| `PUT /api/shipment-drafts/<uuid>/photo` | Send raw image bytes after saving the draft. The first successful photo is retained on retries. |

Example draft JSON for the PUT request:

```json
{
  "origin": "Lagos",
  "destination": "Ibadan",
  "weight": 4.5,
  "weightUnit": "kg",
  "size": "30 × 20 × 15 cm",
  "category": "Gift",
  "contents": "Folded fabric",
  "offerMinor": 6500,
  "currency": "USD"
}
```

`offerMinor` is in cents. The photo request returns Cloudinary asset metadata,
including its public ID. The mobile app continues using device-local drafts
until account authentication and the mobile API client are connected.

## Connect the Sender app to the local API

1. Configure the server environment described above and run `npm start` from
   `server/` in its own terminal. Configure `CLOUDINARY_URL` to test photos.
2. In the project root, create `.env` with
   `EXPO_PUBLIC_API_URL=http://127.0.0.1:5050`. Run `npm ci` and
   `npm run web -- --port 8081`. Open `http://localhost:8081`, or set
   `FLYMATE_WEB_ORIGIN` on the server to match the exact browser origin.
3. Enter your server's development token on the Connect screen. Create a
   package, select a photo, review it, and save the draft. Reconnect after
   restarting the app and open the draft under Shipments to see the saved photo.
   A failed photo upload can be retried from Review after the details are saved.

For a phone on the same trusted development network, bind the server to
the computer's LAN address with `HOST` and use that same address in the app's
`EXPO_PUBLIC_API_URL`. Use HTTPS when testing beyond the local machine where
possible. Treat the development token as a secret and enter it only in the app.
It is kept in memory for the session. The public Expo variable contains the
API URL only.

With no public API URL configured, FlyMate opens its existing offline mode.
Offline drafts are separate from server drafts. The development connection
represents one sender and is intended for local testing.

## Domestic delivery development milestone

The server now runs strict TypeScript modules on Node 24. Update both dependency
sets with `npm ci` at the project root and again in `server/`. Restart the
backend to apply the additive delivery migration to the existing PostgreSQL
database. Saved drafts carry over.

To run the full workflow, generate a second token with
`node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`
and save it as `FLYMATE_TRAVELER_TOKEN` in `server/.env`. Keep your existing
`FLYMATE_DEV_TOKEN` for the sender.

1. Connect as the sender in one browser window. Save a domestic package draft
   and choose **Publish shipment** under **Shipments**.
2. Open the app in a second window and connect with the traveler token. Submit
   an offer in USD from the traveler load board.
3. Refresh deliveries in the sender window and accept the displayed offer.
4. Refresh the traveler board. Use the sender's pickup code to confirm pickup,
   then mark the shipment in transit.
5. Refresh the sender's deliveries and give the receiver's delivery code to the
   receiver. The traveler enters it at the final handoff. Refresh either board
   to see the delivered timestamp.

This development workflow uses one configured sender and one traveler.
The sender can unlock handoff attempts after five incorrect codes.
Payments, account verification, notifications, and the Operations dashboard
remain separate milestones. Published shipment details are locked.

Run `npm run typecheck` and `npm --prefix server run typecheck` to check both
TypeScript configurations.

## Sender and Traveler accounts

This milestone uses the existing Expo app, TypeScript API, PostgreSQL and
Cloudinary setup. The same account form has a blue Sender theme and a green
Traveler theme. The selected role is saved at registration. On subsequent login
the account's saved role controls its destination and permissions.

1. Carry over the existing root `.env` and `server/.env`. Run `npm ci` in both
   directories and restart the backend. It applies the additive
   `003_accounts.sql` migration, keeping existing drafts and deliveries.
2. Start the Expo web app with `npm run web -- --port 8081` and open
   `http://localhost:8081`. The root `EXPO_PUBLIC_API_URL` enables account mode;
   leaving it unset opens the offline sample.
3. Choose **Sign up** and create a Sender with a name, email, international
   phone number, and password of at least 12 characters. In a second browser
   window create a Traveler with a different email. Use regular email/password
   login on later visits. Sessions expire after 24 hours and are held in app
   memory, so refreshing requires login.
4. Publish a shipment as a Sender, then make an offer from the Traveler
   load board. Refresh the Sender board to see the offer. If several travelers
   submit offers, the Sender chooses one. Only that traveler can confirm pickup,
   mark the shipment in transit, and confirm delivery.

Your old drafts still belong to the development sender identity. To open them,
choose **Development token sign-in** and use the existing token. They are kept
separate from account-owned data. When you no longer need development tokens,
remove both token variables and configure a stable random
`FLYMATE_HANDOFF_SECRET` of at least 32 characters. Existing installations
default to their original sender token as the signing key. Keep the same
signing key while existing handoff codes are in use. Never place it in Expo's
public environment.

Use local development only for this milestone. Public deployment needs HTTPS,
account verification and password recovery. Social login and Traveler
verification are separate milestones.

The Traveler **Board** shows published shipments and searches the loaded list
by origin, destination and package contents. Once the sender accepts an offer,
the shipment moves to **My Trips → Active**, where the traveler records each
handoff. **My Trips → Completed** shows delivered shipments and their tracking
timestamps. Use **Refresh deliveries** to pick up changes made by the sender.

### Sender shipment tracking

In connected mode, open **Shipments** to see the Sender's three filters.
**Active** contains saved drafts, published shipments, and matched shipments
awaiting pickup. **In Transit** starts when pickup is verified. **Completed**
shows delivered shipments. Tap a published shipment card to open its package
details, photo, timeline, and available offer or handoff actions. Use
**Refresh shipment** to see the latest traveler update.

### Sender onboarding, publishing and chat

Open the connected app and choose **Get started** to sign up or **Login** to
use an existing account. Create a shipment using the details and pickup
steps, then review the summary. Choose a preferred pickup date from the calendar. To publish, confirm the shipment details and choose
**Publish request**. You can also save a draft and finish it later. Older drafts
can be opened and completed with the new fields.

After accepting a Traveler offer, open **Chat** or **Chat with traveler** in the
shipment details. A matched Traveler can open the same chat under **My Trips**.
Open conversations receive messages automatically. The database migration adds chat
storage on server startup. Email/password sign-in is available in this build.
Google and Apple sign-in remain pending.

### Traveler screens and account photos

- Choose **Traveler** on the welcome screen to see the green onboarding and
  account flow. The Load Board has search plus origin, destination, and
  preferred pickup day filters. Open a card for package details, the saved
  photo, and the offer or handoff controls.
- **My Trips** shows assigned and completed shipments. **Earnings** shows
  agreed rewards from delivered shipments, with up to 100 recent entries.
  A payout provider is not connected.
- **Profile** contains Identity Verification and Background Check. The
  background screen reports actual submission state. Background screening
  is pending. Document uploads are disabled by
  default. For local integration testing with synthetic images, set
  `FLYMATE_KYC_UPLOADS=true` in `server/.env` and restart the API. The ID
  front, ID back and selfie are uploaded as authenticated assets. The API
  returns submission status and short-lived previews to the owning Traveler.
- On a regular Sender account, tap the profile circle or **Profile →
  Change profile photo** and wait for the saved confirmation. The backend
  stores the photo reference on the account and returns a fresh signed link
  when you sign in again. Photos selected in the earlier session-only build
  need to be selected again. Development-token profiles still use a preview.

Restart the updated API to apply the additive account-media migration. Use
the existing Neon and Cloudinary configuration.

## Operations dashboard

The separate React and TypeScript dashboard lives in `operations/`. It uses
the same API and database. Start the updated server once to apply the staff
migration. From `server/`, create each staff user explicitly:

```bash
npm ci
npm run staff:create -- staff@example.com "Staff Name"
npm start
```

The command prints a generated password once. Share it privately with that
staff member. Staff use their email and generated password, with an 8-hour
session held in browser memory. Sender, Traveler, and development tokens
have no access to the Operations API. No public staff registration exists.

In another terminal, from `operations/` run:

```bash
npm ci
npm run dev
```

Open `http://localhost:5173`. The dashboard defaults to the API at
`http://127.0.0.1:5050`. If you change the API address, set
`VITE_FLYMATE_API_URL` in `operations/.env`. If you change the dashboard
origin, set `FLYMATE_OPERATIONS_ORIGIN` in `server/.env` and restart the API.

The shipment view polls every 15 seconds while visible. It lists up to 200
published shipments, prioritizing active deliveries, and shows the full
tracking timeline for a selected record. Attention flags include a handoff
lockout, a preferred pickup date that has passed (UTC calendar day), or no
stage change for 24 hours before pickup or 48 hours after pickup. These are
test thresholds. The verification queue shows up to 200 Travelers, with
submitted cases first. It shows uploaded document counts, submission state and the staff review case.

### Chat updates

Keep a shipment conversation open to receive messages as they arrive. The app
marks the displayed messages as read. Unread conversations appear on the
Sender's Chat tab and the Traveler's My Trips tab while the app is open;
the badges refresh about every four seconds. This build provides in-app
notifications. Operating-system push notifications are a separate integration.

Restart the backend to create the chat read-state table, then restart Expo.
The API wakes a waiting conversation immediately on the same backend instance.
A periodic reconnect catches up after a brief disconnect or across instances.

### Review an identity case

With the updated backend running, use a Traveler test account and synthetic
images to submit the front, back and selfie. Uploads are disabled by default;
set `FLYMATE_KYC_UPLOADS=true` in `server/.env` for the local test.

1. Sign in to Operations with a staff account. Open **Verification queue**
   and choose **Open case** on the pending submission.
2. Review the three images. Cloudinary links expire after two minutes. Use
   **Refresh document links** when you need new links.
3. Choose **Approve identity**, **Request a new upload** or **Reject
   submission**. A reason is required for requests and rejections. The
   reason is visible to the Traveler. The dashboard keeps a history of
   reviewer, reason, decision and submission revision.
4. In Traveler **Profile → Identity verification**, tap **Refresh review
   status**. If a replacement was requested, replace at least one image
   and submit it again. Staff receive a new revision, and earlier decisions
   remain in the history.

Restart the API to apply the verification-review migration. Already-submitted
cases enter the pending queue. Identity approval is separate from background
screening, which remains unconnected. This review milestone does not change
access to the development Load Board or payouts.

On **Traveler → Profile → Identity verification**, each image shows a
thumbnail and its upload percentage. At 100%, the card shows **Saving
document…** while the backend processes and stores the file. A failed upload
can be retried or discarded. Reopen the screen or refresh its status to renew
the signed thumbnails for saved documents.

## Test checkout and settlement status

To enable checkout for newly accepted offers, add `STRIPE_TEST_SECRET_KEY`
with a Stripe `sk_test_` key to `server/.env` and restart the backend. This
also applies the payment migration. Keep the key in the server environment,
outside Git and Expo. The existing no-checkout development flow is available
when the test key is unset. Shipments matched before enabling checkout
continue with their existing flow.

1. Publish a shipment and accept a Traveler offer using email accounts.
2. In **My Shipments → Shipment details**, open **Test checkout**. The test
   quote uses the accepted USD reward plus a 15% service fee rounded to cents.
3. Choose **Prepare test checkout**, then **Open Stripe test checkout**.
   Complete checkout with a Stripe test card. Return to the original FlyMate
   app or log back in if a new tab opened, reopen the shipment, and tap
   **Verify test payment**.
4. FlyMate verifies the recorded Checkout Session, shipment ID, amount,
   currency, and test payment status using Stripe's API. The pickup code
   becomes available after verification. After delivery, the shipment shows
   **Settlement eligible** in Operations and on the Sender payment card.

The test integration uses on-demand verification and never initiates a
payout. Production will need a provider-approved settlement arrangement,
webhook reconciliation, refunds, and dispute handling.
