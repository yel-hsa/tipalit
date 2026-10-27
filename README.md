# TIPalit

Campus marketplace for students of the Technological Institute of the Philippines (TIP). Students buy and sell textbooks, uniforms, electronics, calculators, and lab gear with other verified TIP students, meeting at authorized campus spots.

This monorepo includes:
- **apps/mobile**: Expo React Native mobile app for students (Android, iOS, Web)
- **apps/web**: React + Tailwind CSS web dashboard for Office of Student Affairs (OSA) administrators
- **packages/services**: Shared domain types, auth logic, and Firebase adapter
- **functions**: Firebase Cloud Functions (callables and Firestore triggers for moderation, ratings, and media cleanup)

---

## 1. Prerequisites

Make sure you have these installed:
- **Node.js**: v20 or v22 (LTS)
- **pnpm**: v9 or later (enable with `corepack enable` if needed)
- **Java JDK**: JDK 17 or later (required only if running local Firebase emulators)
- **Firebase CLI**: `npm install -g firebase-tools`
- **Expo Go** app on your phone (if testing on a physical iOS or Android device)

---

## 2. Quick Setup

Clone the repository and install all dependencies:

```bash
# install dependencies across all workspaces
corepack pnpm install
```

Copy the example environment file and configure your credentials:

```bash
cp .env.example .env
```

Fill in the `.env` file with the shared Firebase credentials:

```env
VITE_DATA_ADAPTER=firebase
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Mobile variables (mirrors the web variables)
EXPO_PUBLIC_DATA_ADAPTER=firebase
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

---

## 3. Running the Apps

### Web Admin Console (OSA Dashboard)

```bash
corepack pnpm dev
```
Open [http://localhost:8443](http://localhost:8443) in your browser.

### Student Mobile App

```bash
corepack pnpm dev:mobile
```
- Scan the displayed QR code with your camera (iOS) or the **Expo Go** app (Android).
- Or press `w` in the terminal to run it in your browser.

---

## 4. Firebase Backend Guide

Since we share the same Firebase project, follow these steps to manage the backend.

### 4.1 Login and Select the Project

```bash
firebase login
firebase use your_project_id
```

### 4.2 Deploying Firestore Rules & Storage Rules

Whenever security rules or indexes change:

```bash
# deploy firestore rules and storage rules
firebase deploy --only firestore:rules,storage

# deploy firestore composite indexes
firebase deploy --only firestore:indexes
```

### 4.3 Deploying Cloud Functions

Cloud Functions handle trusted actions like report resolutions, image finalization, and review calculations.

```bash
# build and deploy functions
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### 4.4 Setting Admin Claims for OSA

Admins require the `{ admin: true }` custom claim on their Firebase Auth token to access the Admin Console and run moderation actions:

```bash
node scripts/firebase/set-admin-claim.mjs <admin_user_uid>
```

---

## 5. Local Emulator Testing (Optional)

You can run the full Firebase suite locally without touching production data:

1. **Start the emulators**:
   ```bash
   npx firebase emulators:start --only auth,firestore,functions,storage --project demo-tipalit
   ```
   The Emulator UI will be available at [http://127.0.0.1:4000](http://127.0.0.1:4000).

2. **Seed local test accounts & mock listings**:
   ```bash
   node scripts/firebase/seed-emulator.mjs
   ```

3. **Run automated end-to-end test suite**:
   ```bash
   node scripts/firebase/test-e2e-suite.mjs
   ```

### Default Seeded Test Accounts

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `osa.admin@tip.edu.ph` | `Password123!` | Office of Student Affairs, `{ admin: true }` |
| **Student (Seller)** | `elena.torres@tip.edu.ph` | `Password123!` | 3rd Year BSA student, QC campus |
| **Student (Buyer)** | `marcus.reyes@tip.edu.ph` | `Password123!` | 2nd Year CS student, QC campus |

---

## 6. Testing & Typechecking

Run verification scripts across all packages:

```bash
# typecheck all workspaces (services, web, mobile, functions)
corepack pnpm typecheck

# run unit and functions tests
corepack pnpm test
```

---

## 7. Project Structure

```text
├── apps/
│   ├── mobile/         # expo react native app for students
│   └── web/            # vite react tailwind admin dashboard
├── packages/
│   └── services/       # shared models, adapters, seed data, and auth logic
├── functions/          # cloud functions triggers and callables
│   └── src/
├── scripts/            # emulator seeding and database scripts
├── firestore.rules     # firestore security rules
├── storage.rules       # firebase storage security rules
└── firebase.json       # emulator and deployment config
```
