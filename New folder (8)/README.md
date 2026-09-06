# TECHNORA'26 — ROUND 1: DEBUG ARENA
### Technical Screening & Code Output Assessment Platform

A production-ready, real-time web application built for the **TECHNORA'26** technical symposium. Designed with a bespoke, cyber-technical dark aesthetic featuring glassmorphism, cyan/electric blue glows, real-time synchronization via Firebase v10+ modular SDK and Cloud Firestore, proctoring surveillance, and candidate exam sandboxing.

---

## 🚀 Key Features

### 1. Dual Independent Interfaces
- **Participant Panel:**
  - Strict credential authentication (no self-registration).
  - Pre-round official examination guidelines screen (`[ I UNDERSTAND ]`).
  - Real-time waiting lobby listening to `settings/round1` status updates.
  - Automatic zero-refresh entry into the quiz when Admin starts the round.
  - Server-synced countdown timer immune to page reloads.
  - Single-question display with high-contrast code viewer (`07 / 20`).
  - Independent question order randomization per candidate.
  - Independent option shuffling (`A, B, C, D`) per candidate with internal answer key mapping.
  - 20-item question navigator palette with status colors (Current, Answered, Unanswered, Marked for Review).
  - Anti-cheat surveillance engine detecting tab switches, window blur, and focus drops with permanent violation logging.
  - Instant `localStorage` auto-save + periodic background Firestore sync.
  - Result scorecard display (Score, Correct, Wrong, Unanswered, Time Taken) with answers withheld.
  - Live symposium leaderboard with tie-breaker sorting.

- **Admin Control Center:**
  - Round orchestration toolbar (`START ROUND`, `PAUSE ROUND`, `END ROUND`, `RESET ROUND`).
  - Duration configuration (default 20 minutes).
  - Live candidate monitoring table streaming answered counts (`12/20 answered`), active status, violation counts, and scores in real-time.
  - Participant Credential Generator with 1-click **Copy Credentials** button.
  - Secondary Firebase Auth architecture: creates participant accounts without kicking out or invalidating the logged-in administrator's session!
  - 20 Verified Hard Technical MCQs pre-configured and 1-Click Seeder button into Firestore.
  - Question CRUD editor with syntax highlight preview and category filtering.
  - Printable / exportable candidate audit report.

---

## 📁 Project Structure

```text
/
├── index.html               # Participant Login Gateway
├── participant.html         # Pre-Round Rules & Real-Time Waiting Room
├── quiz.html                # High-Intensity MCQ Debug Arena
├── result.html              # Candidate Submission Scorecard
├── leaderboard.html         # Live Public/Participant Symposium Leaderboard
│
├── admin/
│   ├── index.html           # Convenor & Faculty Access Portal
│   ├── dashboard.html       # Arena Control Center & Real-Time Monitoring
│   ├── participants.html    # Participant Management & Credential Generator
│   ├── questions.html       # Question Bank Manager & 1-Click 20 MCQ Seeder
│   └── leaderboard.html     # Leaderboard Audit Trail & Printable Report
│
├── css/
│   ├── main.css             # Cyber design system, technical grid, neon glow
│   ├── participant.css      # Quiz layout, navigator palette, options styling
│   └── admin.css            # Dashboard sidebar, metrics cards, table layouts
│
├── js/
│   ├── firebase-config.js   # Firebase v10+ Modular SDK, Secondary Auth setup
│   ├── auth.js              # Session verification, role guards, toast alerts
│   ├── participant.js       # Rules acceptance, Firestore round status listener
│   ├── quiz.js              # Shuffling algorithms, timer, anti-cheat, submit
│   ├── leaderboard.js       # Real-time results listener, rank & tie-breakers
│   ├── admin.js             # Round status controls, live telemetry, seeder
│   └── default-questions.js # 20 Verified Hard Technical MCQs (Section 35)
│
├── firestore.rules          # Granular Firestore Security Rules
└── README.md                # Documentation & Setup Checklist
```

---

## 🛠️ Step-by-Step Setup Guide

### 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project** and name it (e.g., `technora-26-debug-arena`).
3. Disable Google Analytics (optional) and click **Create Project**.

### 2. Enable Authentication
1. In the Firebase console left menu, navigate to **Build > Authentication**.
2. Click **Get Started**.
3. Under the **Sign-in method** tab, choose **Email/Password**.
4. Enable **Email/Password** and click **Save**. (Do not enable Email link).

### 3. Create Cloud Firestore Database
1. Navigate to **Build > Firestore Database**.
2. Click **Create Database**.
3. Select your closest location and choose **Start in test mode** (or production mode, we will deploy custom rules next).
4. Click **Create**.

### 4. Configure Firebase in the Application
1. In Firebase Console, click the **Gear Icon** (Project Settings) > **General**.
2. Scroll to **Your apps**, click the **Web icon (`</>`)**, and register the app.
3. Copy the `firebaseConfig` object.
4. Open `js/firebase-config.js` and replace the placeholder credentials:
```javascript
export const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "technora-26.firebaseapp.com",
  projectId: "technora-26",
  storageBucket: "technora-26.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 5. Deploy Firestore Security Rules
1. In Firebase Console, navigate to **Firestore Database > Rules**.
2. Paste the contents of `firestore.rules` from this repository.
3. Click **Publish**.

### 6. Create First Administrator Account
1. In **Authentication > Users**, click **Add user**.
2. Enter an email (e.g., `admin@technora.edu`) and a secure password.
3. Copy the generated User UID.
4. Navigate to **Firestore Database > Data**.
5. Click **Start collection**:
   - Collection ID: `participants`
   - Document ID: Paste the Admin's UID
   - Fields:
     - `role`: `"admin"` (string)
     - `email`: `"admin@technora.edu"` (string)
     - `name`: `"Symposium Convener"` (string)
     - `isActive`: `true` (boolean)
6. Alternatively, create an entry in `admins/{uid}`.

### 7. Seed the 20 Hard Technical Questions
1. Open your browser and navigate to `admin/index.html`.
2. Log in using your Admin credentials.
3. In the sidebar, click **Questions Bank**.
4. Click the green button: **Seed 20 Verified Hard Questions**.
5. All 20 hard technical questions covering all 20 required concepts (Python mutable defaults, C undefined behavior, Java String pool, SQL NULLs, BST worst-case, Deadlock conditions, etc.) will be written to Firestore with 1 click!

### 8. Generate Participant Credentials
1. In Admin panel, click **Participants** in the sidebar.
2. Click **Generate Participant**.
3. Enter Candidate Name (e.g., `Arun Kumar`) and Candidate ID (`TECH001`).
4. Click **Create & Generate Passcode**.
5. Click **Copy Credentials** to copy the login payload. The participant can now log in at `index.html` with:
   - **Participant ID:** `TECH001`
   - **Password:** (e.g. `X7K9P2`)

### 9. Run the Event
1. Instruct participants to open `index.html` and sign in.
2. Participants will read the rules and wait in the real-time **Waiting Room**.
3. When the convener is ready, click **START ROUND 1** in `admin/dashboard.html`.
4. All candidate browsers will automatically launch the quiz simultaneously!

---

## 🔒 Security & Architecture Decisions

### 1. Internal Email Alias Strategy
To provide a clean, competition-grade participant experience without requiring personal student emails or allowing self-registration:
- Participant enters ID: `TECH001`.
- Frontend automatically maps this internally to `tech001@technora.internal`.
- Firebase Authentication validates the credential safely.

### 2. Secondary Auth Instance for Admin User Generation
Normally in client-side Firebase Auth, calling `createUserWithEmailAndPassword()` immediately logs the browser in as the newly created user, kicking out the administrator.
To solve this cleanly without requiring an external backend server:
- `js/firebase-config.js` exposes `getSecondaryAuth()`, creating a named secondary Firebase App instance (`initializeApp(config, "TechnoraSecondaryApp")`).
- The Admin's primary authentication token remains completely undisturbed while issuing participant accounts!

### 3. Server-Based Timer
The quiz timer calculates elapsed time against `settings/round1.startTime` from Firestore. Reloading or manipulating local storage will never extend remaining test time.

### 4. Score Calculation & Security Note
As specified in section 26:
- Answer keys are hidden from the participant during the quiz.
- For purely client-hosted Firebase deployments, final scores are computed at the moment of submission.
- For high-stakes institutional competitions with serverless Cloud Functions, the submission payload can simply forward the selected answers to a Cloud Function (e.g. `submitRound1Answers`), which validates against the private Firestore collection and commits the score.

---

## ✅ SETUP CHECKLIST

- [ ] Firebase project created
- [ ] Authentication enabled (Email/Password)
- [ ] Firestore database created
- [ ] Firebase config added to `js/firebase-config.js`
- [ ] Security rules deployed from `firestore.rules`
- [ ] Admin account created in Firebase Authentication
- [ ] Admin document added to `participants/{uid}` with `role: "admin"`
- [ ] Questions imported via 1-Click Seeder button in `admin/questions.html`
- [ ] Participant credentials generated in `admin/participants.html`
- [ ] Round tested in participant waiting room and started from Admin Dashboard
- [ ] Leaderboard tested with real-time updates

---

*TECHNORA'26 — Department of Computer Science & Engineering*
