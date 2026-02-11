# STEM IDEA ADVENTURE
## Competition Platform Integration Plan

A streamlined plan to transform STEM Idea Adventure into a school-ready competition platform while preserving the existing generator experience.

---

## Core Approach
Enhance the existing app by turning the **Idea Generator** into the core engine of the competition system.

### What We Keep
- All current features (Generator, Components, Learn, etc.)
- Supabase authentication
- AI project generation
- Existing UI and design system

### What We Add
- Team system with join codes
- Competition submissions powered by the Generator
- Leaderboards tracking points and consistency
- Level system (Explorer → Visionary)
- Points and XP tracking

---

## Implementation Plan – 4 Phases

### Phase 1: Database Schema (PostgreSQL / Supabase)
Create tables for:
- teams
- team_members
- idea_submissions
- user_activities
- user_levels
- idea_votes

### Phase 2: Backend APIs (FastAPI)
Build APIs for:
- Team management
- Submission system
- Leaderboards
- Points and XP calculation
- Upvoting

### Phase 3: Frontend Integration (React)
Add and integrate:
- Team setup flow
- Submission button on generated ideas
- New pages:
  - Leaderboards
  - Progress
  - Teacher dashboard
- Level displays
- Team info in profile

### Phase 4: Points and Levels Logic
- Assign points for submissions, upvotes, and daily bonuses
- Five level tiers:
  - Explorer
  - Builder
  - Innovator
  - Inventor
  - Visionary

---

## How the Competition Works
1. A teacher creates a team and shares a join code.
2. Students join the team using the code.
3. Students generate or submit ideas to the team.
4. Each submission earns points.
5. Peers can upvote ideas for additional points.
6. Leaderboards update in real time.
7. Users level up based on accumulated XP.

---

## Current Project Status

### Completed So Far
- **Phase 1:** Database schema and triggers implemented
- **Phase 2:** Backend APIs for team and submission management integrated with Supabase
- **Phase 3:** Partially completed frontend integration

### Upcoming Work: Phase 4
- Final frontend integration
- Points and levels display
- Animations and interaction polish

---

## Key Product Decisions

### Team Requirement Before Submission
**Decision:** Team membership is required in competition mode.

**Behavior:**
- In **Solo Mode**: students can generate ideas normally.
- After entering a **team code**: the app switches to **Competition Mode**.
- All future submissions are linked to the team.

**Result:**
- No team → normal app experience
- In a team → competition-enabled experience

---

### Competition Feature Location
**Decision:** Main navigation tab called **Competition**.

**Navigation Structure:**
- Home
- Generate Idea
- Competition
- Profile

**Inside the Competition Tab:**
- Team information
- Leaderboard
- Level progress
- Submission history

---

### AI Submission Flow
**Decision:** Manual confirmation required.

**Flow:**
1. Student generates an idea.
2. Reviews the result.
3. Clicks **Submit to Competition**.

**Reasons:**
- Prevents accidental submissions
- Reduces spam
- Encourages intentional participation
- Preferred by schools

---

### Submission Categories
**Decision:** Include a simple category system.

**Starter Categories:**
- Robotics
- Environment
- IoT
- AI / Software
- Healthcare
- Energy
- General STEM

**Behavior:**
- AI-generated ideas → category auto-detected
- Manual submissions → student selects a category

**Benefits:**
- Enables category-based leaderboards later
- Provides better insights for teachers
- Keeps data organized

---

### Leaderboard Visual Style
**Decision:** Clean, minimal, and school-friendly.

**Ideal Look:**
- Card-style leaderboard
- Top three users highlighted
- Remaining users in a clean list
- Subtle level badges
- Progress bars for level advancement

**Avoid:**
- Flashy gaming aesthetics
- Overly complex animations
- Overloaded stat screens

**Design Direction:**
Google Classroom × Duolingo — clean, motivating, and easy to understand.

---

## Final Decisions Summary
- Team required before submission: **Yes (competition mode)**
- Competition access: **Main navigation tab**
- AI submission: **Manual confirmation**
- Categories: **Yes, simple set**
- Leaderboard style: **Clean, minimal, professional**
