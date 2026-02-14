# Auth Guard & Guest Mode Testing Plan

## Objective
Verify that the guest/locked feature authentication system works correctly across all pages.

## Test Scenarios

### 1. Initial Load - Auto Guest Creation
**Steps:**
1. Clear all localStorage/cookies
2. Load the app fresh
3. Check console for auth state logs

**Expected Results:**
- ✅ Console log: "🔐 Auth State: { hasUser: true, isGuest: true, mode: 'guest' }"
- ✅ User is automatically set as guest
- ✅ Sidebar shows "Sign In" button for guests
- ✅ Navbar shows "Sign In" button in top right

### 2. Profile Page - Guest Lock
**Steps:**
1. As a guest user, navigate to /profile

**Expected Results:**
- ✅ Console log: "👤 Profile - Auth State: { hasUser: true, isGuest: true }"
- ✅ Page shows LockedFeatureCard with:
  - Title: "Unlock Your Profile"
  - Lock icon with purple gradient
  - "Start Your Adventure" button
- ✅ Profile content is NOT visible (replaced by lock card)

### 3. Library Page - Guest Lock
**Steps:**
1. As a guest user, navigate to /library

**Expected Results:**
- ✅ Page shows LockedFeatureCard with:
  - Title: "Unlock Your Project Library"
  - Description about signing in to save projects
  - "Start Your Adventure" button
- ✅ No project grid visible

### 4. Generator Page - Save Button Lock
**Steps:**
1. As a guest user, navigate to /generator
2. Fill in project form (any values)
3. Click "Generate Architecture"
4. After project generates, click "Save Lab" button

**Expected Results:**
- ✅ Generation works (guests CAN generate)
- ✅ When clicking "Save Lab", LoginModal appears with:
  - Title: "Unlock save projects"
  - Google sign-in button
  - Email sign-in option
- ✅ Project is NOT saved

### 5. Components Page - Details Lock
**Steps:**
1. As a guest user, navigate to /components
2. Browse components (should be visible)
3. Click "Explore Details" on any component

**Expected Results:**
- ✅ Components list is visible (browsing allowed)
- ✅ When clicking "Explore Details", LoginModal appears with:
  - Title: "Unlock component details"
  - Sign-in options
- ✅ Details modal does NOT open

### 6. Sidebar Auth Button
**Steps:**
1. Open sidebar (on mobile or desktop)
2. Look for Sign In button at top of navigation

**Expected Results:**
- ✅ "Sign In" button visible at top of sidebar nav
- ✅ Button has purple gradient styling
- ✅ Clicking button navigates to /login

### 7. Logout → Auto Guest
**Steps:**
1. Sign in with any method (if possible, or skip this)
2. Navigate to /profile
3. Click "Log Out" button
4. Check console and UI state

**Expected Results:**
- ✅ Console log: "🔐 Auth State: { hasUser: true, isGuest: true, mode: 'guest' }"
- ✅ User is automatically set as guest (not null)
- ✅ Profile page shows lock overlay again
- ✅ Sidebar shows "Sign In" button again

## Debug Indicators
During testing, look for these console logs:
- `🔐 Auth State:` - from AuthContext
- `👤 Profile - Auth State:` - from Profile page
- `Guest: Yes/No` - from Sidebar debug badge (development mode only)

## Success Criteria
- ✅ All 7 test scenarios pass
- ✅ No errors in console
- ✅ Guest users see lock UI on appropriate pages
- ✅ Auth state transitions properly (logout → guest)
