# Upkeep

Upkeep is a cross-platform (iOS/Android, plus web) app for tracking home and
vehicle maintenance: it builds a starter maintenance schedule for your
vehicles and home, reminds you when something's due, and keeps a history of
completed work.

## Tech stack

- **Expo SDK 56** managed workflow, **Expo Router** for navigation, **TypeScript** in strict mode
- **NativeWind v4** (Tailwind) for styling
- **Offline-first data layer**: `expo-sqlite` is the local source of truth, with an outbox queue that syncs to **Supabase** (Postgres + Auth + Row Level Security) when online
- **TanStack Query** for reactive reads from SQLite
- **expo-notifications** for local task-reminder notifications (with "Mark done" / "Snooze" actions)

## Project structure

```
app/                  Expo Router routes
  (auth)/             Sign in / sign up
  (onboarding)/       First-run flow: add your first vehicle or home
  (app)/(tabs)/       Dashboard, Assets, Settings
  (app)/asset/        Asset detail + "add another asset" flow
components/           Shared UI primitives and feature components
core/domain/          Pure business logic: due-date math, VIN decoding,
                       notification scheduling, household permissions,
                       starter task templates — fully unit tested
lib/
  auth/               Supabase session + Apple/Google sign-in
  db/                 SQLite schema, repositories, row<->domain mappers, outbox
  household/          Resolves the signed-in user's household + role
  notifications/      Local reminder scheduling and notification actions
  sync/               Push outbox to Supabase, pull latest household data
  supabase/           Supabase client + generated types
  vin/                NHTSA VIN decoder client
supabase/migrations/  Postgres schema, triggers, and RLS policies
```

## Prerequisites

- Node.js 20+
- A free [Supabase](https://supabase.com) project
- For iOS builds/simulator: a Mac with Xcode
- For Android builds/emulator: Android Studio
- [`eas-cli`](https://docs.expo.dev/eas/) for native builds (`npx eas-cli ...`, no global install needed)

## 1. Install dependencies

```sh
npm install
```

## 2. Set up Supabase

1. Create a new Supabase project.
2. Open the SQL editor and run the files in `supabase/migrations/` **in order**
   (`0001` through `0004`). These create the schema (households, assets,
   maintenance tasks, service records, documents, notification schedules),
   the triggers that auto-create a profile + "My Household" on signup, and
   the RLS policies that scope every table to household membership.
3. Under **Project Settings → API**, copy the **Project URL** and **anon
   public key** — you'll need these for `.env`.
4. Under **Authentication → Providers**, enable the sign-in methods you want:
   - **Email**: enabled by default.
   - **Apple**: add your Services ID, Team ID, Key ID, and private key. Set
     the redirect URL to `https://<project-ref>.supabase.co/auth/v1/callback`.
   - **Google**: add the OAuth client ID/secret from Google Cloud Console,
     with the same Supabase callback URL as the authorized redirect URI.
5. Under **Authentication → URL Configuration**, add `upkeep://auth/callback`
   to the **Redirect URLs** allow list — this is the deep link the app
   listens on after a Google OAuth round-trip.

## 3. Configure environment variables

```sh
cp .env.example .env
```

Fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from
step 2.3. Both must keep the `EXPO_PUBLIC_` prefix to be readable in client
code.

## 4. Run the app

```sh
npx expo start
```

Press `i` for the iOS simulator, `a` for an Android emulator, or `w` for web.

> **Note:** `expo-sqlite`, the dashboard, and email/password auth all work in
> **Expo Go**. **Sign in with Apple** and the Google OAuth deep-link flow
> require a **development build** (see below) because they depend on native
> modules / custom URL schemes that Expo Go doesn't support.

### Development build (required for Apple/Google sign-in and push notifications)

```sh
npx expo prebuild
npx expo run:ios      # or: npx expo run:android
```

Or build one with EAS (no local native toolchain required):

```sh
npx eas-cli build --profile development --platform ios
```

## Testing & type-checking

```sh
npm test          # unit tests for core/domain (due dates, VIN decoding,
                   # notification scheduling, permissions, task templates)
                   # and SQLite row<->domain mappers
npm run typecheck  # tsc --noEmit, strict mode
```

## EAS Build & submission

1. Log in: `npx eas-cli login`
2. Link the project: `npx eas-cli build:configure` (writes a project ID into
   `app.json`'s `extra.eas` block)
3. Push your Supabase env vars to EAS so production builds can read them:
   ```sh
   npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_URL --value <your-url> --environment production
   npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <your-anon-key> --environment production
   ```
   (repeat for `preview`/`development` environments as needed)
4. Build:
   ```sh
   npx eas-cli build --profile production --platform ios
   npx eas-cli build --profile production --platform android
   ```
5. Submit to the stores:
   ```sh
   npx eas-cli submit --platform ios
   npx eas-cli submit --platform android
   ```

`eas.json` defines `development` (dev client, internal distribution),
`preview` (internal distribution for TestFlight/internal testing tracks),
and `production` profiles.

## App store readiness checklist

- [ ] Replace placeholder icons/splash in `assets/` with final artwork
- [ ] Write a privacy policy and link it from the app store listings (the app
      collects an email address and household/asset data via Supabase)
- [ ] Complete each store's data-safety / privacy "nutrition label" — declare
      what's collected (account email, vehicle details, home details,
      maintenance history) and that it's not sold to third parties
- [ ] Configure an APNs key in EAS for production push notifications
      (`eas credentials`)
- [ ] Verify RLS policies end-to-end with a second household member account
      (not just the owner)
- [ ] Test the offline flows (airplane mode: add an asset, complete a task,
      then reconnect and confirm sync)
- [ ] Bump `app.json`'s `version` (and build numbers via EAS) before each
      submission
- [ ] Add RevenueCat API keys and configure the entitlement before enabling
      any paywalled features
- [ ] Run `npx expo-doctor` and resolve any warnings

## Architecture notes

- **Offline-first**: every write goes to SQLite first and is queued in an
  outbox table; `runSync()` (in `lib/sync`) drains the outbox to Supabase and
  pulls the latest household data back down. UI reads come from SQLite via
  TanStack Query, so the app is fully usable offline.
- **Navigation**: `app/_layout.tsx` uses `Stack.Protected` to switch between
  `(auth)`, `(onboarding)`, and `(app)` route groups based on whether a
  session exists and whether the household has any assets yet.
- **Household-scoped data**: `HouseholdProvider` resolves the signed-in
  user's household and role (owner/admin/member/viewer) once at startup and
  caches it; all queries and RLS policies are scoped to that household.
- **Domain logic lives in `core/domain`**, is framework-free, and is the most
  heavily tested part of the codebase — due-date/interval math, VIN decoding,
  notification-reminder timing (including quiet hours), and household
  permission checks.

## Known limitations / next steps

- Local notifications only — reminders are rescheduled from on-device data
  when the app opens, not pushed from a server. Server-scheduled push
  notifications (so reminders fire even if the app hasn't been opened
  recently) are a planned v2 addition.
- Document/photo attachments on service records: `expo-image-picker` is
  installed and permission strings are configured, but the capture UI isn't
  built yet.
- RevenueCat-based subscriptions are not yet wired up.
