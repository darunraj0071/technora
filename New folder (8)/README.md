# TECHNORA'26 — 3-ROUND CODING & DEBUGGING CHAMPIONSHIP
### Round 1: Debug Arena (MCQs) • Round 2: Code Breaker (4 Problems) • Round 3: Final Boss (2 Hard+ Challenges)

A complete, production-ready, 3-round technical examination and competitive coding platform for the **TECHNORA'26** technical symposium. Powered by **Firebase Authentication**, **Cloud Firestore**, and **Judge0 CE Sandboxed Code Execution Engine**, with zero backend server maintenance needed.

---

## 🚀 Key Modules & Architecture

### 1. Participant Experience
- **Participant Login (`index.html`):** ID + Password authentication (Admin-generated internal credentials; no self-registration).
- **Round 1: Debug Arena (`participant.html` -> `quiz.html`):**
  - Pre-round rules + real-time waiting lobby listening to `settings/round1`.
  - Zero-refresh auto-launch into the Quiz Arena when Admin starts the round.
  - 20 hard technical debugging MCQs with code output prediction.
  - Independent question order and option shuffling (`A, B, C, D`) per candidate.
  - 20-item navigator palette (Current, Answered, Unanswered, Marked for Review).
  - Server-synchronized 20:00 countdown timer immune to reloads.
  - Scorecard (`result.html`) with answers withheld.
- **Round 2: Code Breaker (`round2.html`):**
  - "Four Problems. One Compiler. No Second Chances."
  - Real-time waiting lounge listening to `settings/round2`.
  - 14 strict examination rules -> Language selection: **Python 3**, **C++ (GCC)**, **C (GCC)**, **Java (OpenJDK)**.
  - Permanent Language Lock saved to Firestore `round2Attempts/{uid}`.
  - Professional IDE interface: Left split: Problem statement, constraints, and sample cases; Right split: Code editor with line numbers, tab indent, Reset Template, and Clear buttons; Bottom drawer: Test Results Console.
  - **4 Hard Technical Screening Problems (100 Pts each = 400 Total):**
    1. **The Sliding Window Trap** (Arrays • Sliding Window • Hash Map)
    2. **The Broken String** (Strings • Hashing • Two Pointers)
    3. **The Silent Network** (Graph • Bridges • Tarjan's Algorithm)
    4. **The Greedy Lie** (Dynamic Programming • Anti-Greedy Transitions)
  - **[ ▷ RUN CODE ]**: Evaluates candidate code against **Public Test Cases** (with inputs, expected outputs, user outputs, and execution times).
  - **[ ⚡ SUBMIT PROBLEM ]**: Evaluates against **Public (20 pts) + 20-25 Hidden Test Cases (80 pts)**.
  - Local auto-save + debounced background sync to Firestore.
  - Anti-cheat surveillance: Tab switches and window blur recorded to Firestore violation counter.
  - Scorecard (`round2-result.html`) displaying 4-problem breakdown, total /400, time taken, and violation count.
- **Round 3: Final Boss (`round3.html`):**
  - "Two problems. One chance to prove your logic."
  - Real-time waiting lounge listening to `settings/round3`.
  - Duration: **50 Minutes** (Server-synchronized countdown).
  - Language selection: **Python 3**, **C++ (GCC)**, **C (GCC)**, **Java (OpenJDK)** locked in `round3Attempts/{uid}`.
  - Professional Final Boss dark IDE interface with left problem specification pane, right code editor with line numbers and indentation, and bottom test execution drawer.
  - **2 Hard+ Competitive Coding Challenges (250 Pts each = 500 Total):**
    1. **The Vanishing State** (Graph Theory • Dijkstra / State-Space Bitmask • Sub-second Graph Search)
       - ~60 lines of realistic starter code with 3 intentional bugs (state pruning edge case, cycle detection off-by-one, memory overflow).
       - 4 public test cases + 20 hidden evaluation test cases.
    2. **The Last Paradox** (Dynamic Programming • Anti-Greedy Interval Transition • Boundary Invariants)
       - ~60 lines of starter code with subtle bugs in recurrence relation and interval boundary overlapping.
       - 4 public test cases + 20 hidden evaluation test cases.
  - Immediate real-time compilation and execution via Judge0 CE.
  - Auto-save code on every keystroke + recovery across page refreshes.
  - Real-time anti-cheat surveillance recording candidate tab switches and blur events.
  - Scorecard (`round3-result.html`) showing Problem 1 score (/250), Problem 2 score (/250), Total (/500), and link to the Unified Leaderboard.
- **Unified 3-Round Live Leaderboard (`leaderboard.html`):**
  - Real-time Firestore synchronization across all 3 rounds.
  - Combines Round 1 (/20) + Round 2 (/400) + Round 3 (/500) = **Total 920 Marks**.
  - 4-Tier Ranking hierarchy:
    1. Highest Total Score (descending)
    2. Highest Round 3 (Final Boss) Score (descending)
    3. Highest Round 2 (Code Breaker) Score (descending)
    4. Lowest Total Completion Time (ascending)

### 2. Admin Control Center (`/admin/`)
- **Tri-Round Control Center (`admin/dashboard.html`):**
  - Independent live controls for **Round 1**, **Round 2**, and **Round 3** (`START`, `PAUSE/END`, `RESET`).
  - Real-time candidate telemetry tables for each round: Active languages, problems submitted, points awarded, and violation flags.
- **Candidate Onboarding (`admin/participants.html`):**
  - Generate ID & secure temporary password.
  - 1-Click **Copy Credentials** button.
  - Disable / Enable / Reset / Permanently Delete candidate accounts.
- **Round 1 Question Bank (`admin/questions.html`):**
  - 1-Click **⚡ SEED 20 DEFAULT QUESTIONS** button into Firestore.
  - Question CRUD editor with category filter.
- **Round 2 Problems Repository (`admin/round2-problems.html`):**
  - 1-Click **⚡ SEED 4 ROUND 2 PROBLEMS TO FIRESTORE** button.
- **Round 3 Problems Repository (`admin/round3-problems.html`):**
  - 1-Click **⚡ SEED 2 ROUND 3 PROBLEMS TO FIRESTORE** button.
  - Inspect public test cases, hidden test cases, starter codes (~60 lines each), and constraints.
- **Leaderboard Audit & Report (`admin/leaderboard.html`):**
  - Convenor audit view with violation count tracking and printable ledger.

---

## 📁 File Structure

```text
/
├── index.html                   # Participant Login Portal
├── participant.html             # Round 1 Rules & Waiting Room
├── quiz.html                    # Round 1 Debug MCQ Arena
├── result.html                  # Round 1 Scorecard
├── round2.html                  # Round 2 Code Breaker Assessment IDE
├── round2-result.html           # Round 2 Scorecard & Problem Breakdown
├── round3.html                  # Round 3 Final Boss Assessment IDE
├── round3-result.html           # Round 3 Scorecard & Problem Breakdown
├── leaderboard.html             # Unified Live Leaderboard (Round 1 + 2 + 3 = 920 Pts)
│
├── admin/
│   ├── index.html               # Admin Login Gateway
│   ├── dashboard.html           # Tri-Round Control Center & Live Telemetry
│   ├── participants.html        # Candidate Management & Credential Generator
│   ├── questions.html           # Round 1 Question Bank & 1-Click Seeder
│   ├── round2-problems.html     # Round 2 Problems Bank & 1-Click Seeder
│   ├── round3-problems.html     # Round 3 Problems Bank & 1-Click Seeder
│   └── leaderboard.html         # Audit Trail & Printable Report
│
├── css/
│   ├── main.css                 # Cyber theme, glowing borders, buttons, modals
│   ├── participant.css          # MCQ arena layout, option cards, navigator
│   ├── admin.css                # Admin sidebar, metrics cards, table layouts
│   └── round2.css               # IDE split layout, editor toolbar, test drawer
│
├── js/
│   ├── firebase-config.js       # Firebase v10+ modular setup & secondary auth
│   ├── auth.js                  # Participant & Admin authentication guards
│   ├── default-questions.js     # 20 Hard technical MCQs
│   ├── round2-problems.js       # 4 Hard coding problems with test cases & starters
│   ├── round3-problems.js       # 2 Hard+ Final Boss coding problems with ~60 lines starters
│   ├── code-execution.js        # Compiler abstraction & Judge0 CE / Piston client
│   ├── participant.js           # Round 1 waiting room controller
│   ├── quiz.js                  # Round 1 MCQ assessment engine
│   ├── round2.js                # Round 2 Code Breaker assessment engine
│   ├── round3.js                # Round 3 Final Boss assessment engine
│   ├── leaderboard.js           # Unified real-time 3-round leaderboard engine
│   └── admin.js                 # Admin dashboard, round control, and telemetry
│
├── firestore.rules              # Granular Cloud Firestore security rules
├── vercel.json                  # Vercel static routing configuration
└── README.md                    # System architecture & deployment manual
```

---

## ⚙️ Compiler & Code Execution Setup

The application uses a clean service abstraction in `js/code-execution.js`:
```javascript
executeCode(language, sourceCode, input, timeoutMs)
```
- **Execution Engine:** Integrates with **Judge0 CE** (`https://ce.judge0.com/submissions?wait=true`) with fallback to **Piston API** (`https://emkc.org/api/v2/piston/execute`).
- **Supported Compilers:**
  - Python: `CPython 3.10+ / 3.8.1 (Judge0 ID 71)`
  - C++: `GCC 9.2.0 (Judge0 ID 54)`
  - C: `GCC 9.2.0 (Judge0 ID 50)`
  - Java: `OpenJDK 13.0.1 (Judge0 ID 62)`
- **Security & Sandboxing:** Code is executed in isolated containers with strict execution timeouts and memory limits.

---

## 🔒 Cloud Firestore Structure

```text
settings/
    round1          # status, startTime, endTime, duration
    round2          # status, startTime, endTime, duration, totalProblems
    round3          # status, startTime, endTime, duration (3000s), totalProblems (2)

participants/{uid}  # participantId, name, role, isActive, hasAttempted, score

questions/{qid}     # question, options, correctAnswer, category, difficulty

attempts/{uid}      # Round 1 in-progress state, questionOrder, answers, violationCount

results/{uid}       # Round 1 final scorecard (score /20, timeTaken, violations)

round2Problems/{pid} # id, title, starters, publicTests, hiddenTests, timeLimit

round2Attempts/{uid} # language, code, problemStatus, scores, violationCount

round2Results/{uid}  # Round 2 final scorecard (p1-p4 scores, total /400, timeTaken)

round3Problems/{pid} # id, title, starters (~60 lines), publicTests, hiddenTests (250 pts each)

round3Attempts/{uid} # language, code, problemStatus, scores, violationCount

round3Results/{uid}  # Round 3 final scorecard (p1-p2 scores, total /500, timeUsed)

admins/{uid}        # role: "admin", email
```

---

## 📋 SETUP CHECKLIST

Follow these steps to conduct TECHNORA'26 seamlessly:

- [ ] **Firebase Project Created:** Project created in [Firebase Console](https://console.firebase.google.com/).
- [ ] **Authentication Enabled:** Email/Password provider enabled under Authentication -> Sign-in method.
- [ ] **Firestore Enabled:** Firestore Database created in your chosen region.
- [ ] **Firebase Config Added:** Credentials pasted into `js/firebase-config.js`.
- [ ] **Security Rules Deployed:** Rules from `firestore.rules` deployed into Firestore Rules tab.
- [ ] **Admin Account Created:** Convenor account created in Firebase Authentication (e.g. `darunraj365@gmail.com`).
- [ ] **Admin Role Assigned:** Document created in Firestore collection `admins/{uid}` with `{ role: "admin", email: "..." }`.
- [ ] **Round 1 Questions Seeded:** Clicked **"⚡ SEED 20 DEFAULT QUESTIONS"** in `admin/questions.html`.
- [ ] **Round 2 Problems Seeded:** Clicked **"⚡ SEED 4 ROUND 2 PROBLEMS"** in `admin/round2-problems.html`.
- [ ] **Round 3 Problems Seeded:** Clicked **"⚡ SEED 2 ROUND 3 PROBLEMS"** in `admin/round3-problems.html`.
- [ ] **Participant Credentials Generated:** Onboarded candidates via `admin/participants.html`.
- [ ] **Round 1 Conducted:** Tested participant login -> waiting room -> Admin START -> quiz -> submit -> scorecard.
- [ ] **Round 2 Conducted:** Tested break screen -> Admin START ROUND 2 -> language lock -> run code -> submit problem -> finalize.
- [ ] **Round 3 Conducted:** Tested `round3.html` -> Admin START ROUND 3 -> 50 min countdown -> run code -> submit -> `round3-result.html`.
- [ ] **Unified Leaderboard Tested:** Checked `leaderboard.html` for combined scores (/920) and 4-tier tie-breaking.
