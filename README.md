# FlyMate Mobile 0.1

Native Android and iOS prototype built with React Native and Expo SDK 54.
The app uses fictional data in memory. Restarting it clears demo bookings.

## Test on an Android phone

1. Extract the ZIP and open this directory in VS Code.
2. Install Node.js 20.19 or later.
3. Install an Expo Go version compatible with SDK 54 from https://expo.dev/go.
4. Run these commands on your computer:

```sh
npm install
npm start
```

Connect the phone and computer to the same Wi-Fi and scan the QR code in
Expo Go. Try tracking FM-24018 and confirming the handoff with code 4826.

## Build a standalone Android APK

Sign into your Expo account when prompted and link the project:

```sh
npx eas-cli@latest build --platform android --profile preview
```

The build page provides the APK download after the build succeeds. The
Android package and iOS bundle identifier are provisional. Choose your
permanent identifiers before an app-store release.

## Hosting

Vercel can host a future FlyMate API or web dashboard. This package contains
the native mobile source. It currently runs without an API.

## TypeScript modules and rate API

Booking, tracking, verification, rates, and shared UI have separate folders
under src. Demo bookings and delivery confirmation are stored in memory.
The booking screen can request a quote from the Vercel function at POST
/api/rates. The web app uses the same origin. Native builds default to
https://flymatetwo.vercel.app. Set EXPO_PUBLIC_API_URL before building
to use a different API host.

The demo provider uses kilograms internally, accepts pounds, and computes
volumetric weight using length × width × height in centimeters divided by
5,000. Billable weight is the higher of actual and volumetric weight, rounded
up to the next 0.5 kg increment. The amount is a fictional NGN estimate
based on shipment type and billable weight. A live carrier integration
would implement RateProvider with carrier-specific rules and server-side
credentials.

Run npm run typecheck and npx expo export --platform web before pushing.
Deploy the repository root to Vercel using the included vercel.json. Test
quotes on the deployed web app or in an environment serving the function.
Rebuild the Android APK to test the changes on a phone.
