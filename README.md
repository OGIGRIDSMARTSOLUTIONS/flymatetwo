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
