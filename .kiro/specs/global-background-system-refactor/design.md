# Global Background System Refactor Bugfix Design

## Overview

The STEM Idea Adventure application suffers from a critical architectural issue where multiple background rendering systems compete for the same visual space. Currently, three systems render simultaneously: BackgroundLayer (Effects Engine), FloatingLinesBackground (global), and page-level backgrounds (ScrollDrivenHero, BackgroundCanvas3D, HeroScene3D). This causes visual conflicts, z-index chaos, pointer-event interception, and background persistence across route transitions.

The fix involves creating a centralized GlobalBackground component with route-aware logic that ensures exactly one background system renders per route. This component will replace the current ad-hoc approach where App.tsx mounts both BackgroundLayer and FloatingLinesBackground globally, and pages independently mount their own full-screen backgrounds.

The solution establishes clear route-specific rules:
- `/` (Welcome) → ScrollDrivenHero only (interactive 3D with raycasting)
- `/login` and `/motion-studio` → No global backgrounds (pages control their own)
- All other routes → FloatingLinesBackground only

All backgrounds will enforce a standardized layering contract: `className="fixed inset-0 pointer-events-none -z-10"` to prevent z-index conflicts and pointer-event blocking.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when multiple background systems render simultaneously on the same route
- **Property (P)**: The desired behavior - exactly one background system renders per route with no visual conflicts
- **Preservation**: Existing functionality that must remain unchanged (ScrollDrivenHero interactivity, FloatingLinesBackground theme integration, AuthLayout styling, Motion Studio preview control)
- **GlobalBackground**: The new centralized component in `frontend/src/components/layout/GlobalBackground.tsx` that uses route-aware logic to determine which background to render
- **BackgroundLayer**: The Effects Engine component in `frontend/src/effects/background/BackgroundLayer.tsx` that renders effect previews (currently mounted globally in App.tsx)
- **FloatingLinesBackground**: The animated lines component in `frontend/src/components/layout/FloatingLinesBackground.tsx` with theme-based gradients (currently mounted globally in App.tsx)
- **ScrollDrivenHero**: The interactive 3D hero component in `frontend/src/components/ScrollDrivenHero.tsx` used on the Welcome page with raycasting and hover effects
- **Page-level backgrounds**: Full-screen background components (BackgroundCanvas3D, HeroScene3D) currently embedded in individual pages
- **Layering contract**: The standardized CSS pattern `fixed inset-0 pointer-events-none -z-10` that all global backgrounds must use
- **Route-aware logic**: Conditional rendering based on current route path to determine which background system should be active

## Bug Details

### Fault Condition

The bug manifests when the application renders any route and multiple background systems attempt to render simultaneously. The root cause is the lack of centralized background management - App.tsx mounts both BackgroundLayer and FloatingLinesBackground at the root level, while pages independently mount their own full-screen backgrounds, creating a situation where 2-3 backgrounds compete for the same fixed positioning space.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { route: string, mountedBackgrounds: string[] }
  OUTPUT: boolean
  
  RETURN (
    // Multiple backgrounds mounted simultaneously
    input.mountedBackgrounds.length > 1
    
    OR
    
    // FloatingLinesBackground renders on "/" despite exclusion logic
    (input.route === '/' AND 'FloatingLinesBackground' IN input.mountedBackgrounds)
    
    OR
    
    // Global backgrounds interfere with /login or /motion-studio
    (input.route IN ['/login', '/motion-studio'] 
     AND ('BackgroundLayer' IN input.mountedBackgrounds 
          OR 'FloatingLinesBackground' IN input.mountedBackgrounds))
    
    OR
    
    // Page-level backgrounds render alongside global backgrounds
    (input.route IN ['/dashboard', '/generator', '/home', '/components', '/learn', '/code-generator']
     AND 'page-level-background' IN input.mountedBackgrounds
     AND ('BackgroundLayer' IN input.mountedBackgrounds 
          OR 'FloatingLinesBackground' IN input.mountedBackgrounds))
    
    OR
    
    // Inconsistent z-index or pointer-events
    (EXISTS background IN input.mountedBackgrounds WHERE
      background.zIndex NOT IN [-10] 
      OR background.pointerEvents !== 'none')
    
    OR
    
    // Background persistence during route transitions
    (input.transitionState === 'navigating' 
     AND previousRouteBackground.mounted === true)
  )
END FUNCTION
```

### Examples

- **Welcome Page Conflict**: Navigate to `/` → Both ScrollDrivenHero (page-level) and FloatingLinesBackground (global) render simultaneously, with FloatingLinesBackground appearing at z-0 despite route exclusion logic attempting to hide it
  - Expected: Only ScrollDrivenHero renders
  - Actual: FloatingLinesBackground visible behind ScrollDrivenHero

- **Login Page Interference**: Navigate to `/login` → BackgroundLayer and FloatingLinesBackground render globally, interfering with AuthLayout's own background effects
  - Expected: No global backgrounds, AuthLayout controls its own styling
  - Actual: Global backgrounds create visual conflicts with auth page design

- **Content Page Duplication**: Navigate to `/dashboard` → Both FloatingLinesBackground (global) and BackgroundCanvas3D (page-level) render as fixed layers
  - Expected: Only FloatingLinesBackground renders
  - Actual: Two backgrounds compete for same space, causing z-index conflicts

- **Z-Index Chaos**: FloatingLinesBackground uses `z-0`, BackgroundLayer uses `z-0`, page backgrounds use random values → Some backgrounds appear above interactive content, blocking clicks
  - Expected: All backgrounds use `-z-10` and `pointer-events-none`
  - Actual: Inconsistent layering causes interaction blocking

- **Route Transition Persistence**: Navigate from `/dashboard` to `/login` → Previous route's FloatingLinesBackground persists briefly, causing flickering
  - Expected: Clean unmount/mount with no persistence
  - Actual: Background from previous route visible during transition

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- ScrollDrivenHero on Welcome page must continue to provide interactive 3D functionality with raycasting, hover effects, and node interactions
- FloatingLinesBackground must continue to display animated floating lines with theme-based gradient colors from PreferencesContext
- Login page AuthLayout and AuthCard components must continue to function with their existing background effects and styling
- Motion Studio LivePreview component must continue to control preview backgrounds independently
- All user interactions with page content (buttons, forms, links, cards) must continue to work without pointer-event blocking
- Effects Engine BackgroundLayer must continue to function within Motion Studio's preview context
- CursorLayer must continue to provide cursor effects across all routes
- Route transitions must continue to be smooth with proper component mounting/unmounting
- Layout component must continue to provide navigation, sidebar, and page structure
- Theme changes via PreferencesContext must continue to update FloatingLinesBackground gradient colors dynamically

**Scope:**
All inputs that do NOT involve background rendering logic should be completely unaffected by this fix. This includes:
- User authentication flows and session management
- Navigation and routing behavior (except background rendering)
- Component library functionality
- Data fetching and state management
- Form submissions and user interactions
- Theme switching and preferences
- Effects Engine functionality outside of global background rendering

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Lack of Centralized Management**: App.tsx mounts both BackgroundLayer and FloatingLinesBackground at the root level without route-aware logic, causing both to attempt rendering regardless of route context
   - Both components are rendered as siblings in the component tree
   - No single source of truth for which background should be active
   - Route exclusion logic in FloatingLinesBackground (checking `location.pathname === '/'`) is insufficient

2. **Page-Level Background Duplication**: Pages like Dashboard, Generator, and Home include their own `<BackgroundCanvas3D>` or `<HeroScene3D>` components that compete with global backgrounds
   - These components use `fixed inset-0` positioning, same as global backgrounds
   - No coordination between page-level and global background systems
   - Creates 2-3 simultaneous fixed layers on the same route

3. **Inconsistent Layering Contract**: Backgrounds use different z-index values and pointer-events settings
   - FloatingLinesBackground uses `zIndex: 0` instead of `-z-10`
   - BackgroundLayer uses `z-0` instead of `-z-10`
   - Some backgrounds lack `pointer-events: none`, causing interaction blocking
   - No enforced standard across all background components

4. **Route Transition Lifecycle Issues**: Backgrounds don't unmount cleanly when navigating between routes
   - React component lifecycle doesn't guarantee immediate unmount
   - Previous route's background may persist briefly during transition
   - No explicit cleanup or transition management

## Correctness Properties

Property 1: Fault Condition - Single Background Per Route

_For any_ route navigation where the application renders a page, the fixed GlobalBackground component SHALL render exactly one background system based on route-specific rules (ScrollDrivenHero for "/", no background for "/login" and "/motion-studio", FloatingLinesBackground for all other routes), with no other background systems active, ensuring no visual conflicts, z-index issues, or pointer-event interception.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10**

Property 2: Preservation - Existing Functionality Unchanged

_For any_ user interaction, theme change, or route transition that does NOT involve the background rendering logic itself, the fixed code SHALL produce exactly the same behavior as the original code, preserving ScrollDrivenHero interactivity, FloatingLinesBackground theme integration, AuthLayout styling, Motion Studio preview control, cursor effects, and all other existing functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File 1**: `frontend/src/components/layout/GlobalBackground.tsx` (NEW)

**Purpose**: Create centralized background management component with route-aware logic

**Specific Changes**:
1. **Create GlobalBackground Component**: New component that uses `useLocation()` to determine current route and conditionally renders the appropriate background
   - Import `useLocation` from `react-router-dom`
   - Import `ScrollDrivenHero`, `FloatingLinesBackground`, and `BackgroundLayer`
   - Implement route-specific logic: "/" → ScrollDrivenHero, "/login" and "/motion-studio" → null, all others → FloatingLinesBackground
   - Ensure BackgroundLayer is NOT rendered globally (only in Motion Studio preview context)

2. **Enforce Layering Contract**: Wrap each background in a container with standardized CSS
   - Use `className="fixed inset-0 pointer-events-none -z-10"` for all backgrounds
   - Ensure `pointer-events-none` to prevent interaction blocking
   - Use `-z-10` consistently to place backgrounds behind all content

3. **Handle ScrollDrivenHero Special Case**: ScrollDrivenHero already has its own positioning and layering
   - Render ScrollDrivenHero directly without additional wrapper (it manages its own fixed positioning)
   - Ensure it only renders on "/" route

4. **Clean Mount/Unmount**: Use React's component lifecycle to ensure clean transitions
   - Each background component will unmount when route changes
   - No manual cleanup required - React handles this automatically

**File 2**: `frontend/src/App.tsx`

**Purpose**: Replace dual global background mounting with single GlobalBackground component

**Specific Changes**:
1. **Remove BackgroundLayer Import and Mount**: Delete `import { BackgroundLayer } from "@/effects/background/BackgroundLayer"` and remove `<BackgroundLayer />` from JSX
   - BackgroundLayer should only be used in Motion Studio preview context, not globally

2. **Remove FloatingLinesBackground Import and Mount**: Delete `import { FloatingLinesBackground } from "@/components/layout/FloatingLinesBackground"` and remove `<FloatingLinesBackground />` from JSX
   - FloatingLinesBackground will be managed by GlobalBackground instead

3. **Add GlobalBackground Import and Mount**: Add `import { GlobalBackground } from "@/components/layout/GlobalBackground"` and mount `<GlobalBackground />` once in the component tree
   - Place it after `<PerfPromptBanner />` and before `<Suspense>`
   - This ensures it's inside BrowserRouter context (needed for useLocation)

4. **Keep CursorLayer Unchanged**: CursorLayer remains globally mounted as it's not a background system

**File 3**: `frontend/src/components/layout/FloatingLinesBackground.tsx`

**Purpose**: Remove route exclusion logic (now handled by GlobalBackground)

**Specific Changes**:
1. **Remove Route Exclusion Logic**: Delete `useLocation` import and the conditional return for "/" route
   - GlobalBackground now handles route-specific rendering
   - FloatingLinesBackground becomes a pure presentation component

2. **Fix Z-Index**: Change `zIndex: 0` to use Tailwind class `-z-10` or inline style `zIndex: -10`
   - Ensures consistent layering with other backgrounds
   - Prevents appearing above content

3. **Ensure Pointer Events**: Verify `pointerEvents: 'none'` is set
   - Already present in current implementation
   - Prevents interaction blocking

**File 4**: `frontend/src/pages/Dashboard.tsx` (and similar pages)

**Purpose**: Remove page-level full-screen backgrounds

**Specific Changes**:
1. **Remove BackgroundCanvas3D Import and Usage**: Delete any imports of `BackgroundCanvas3D` or `HeroScene3D` and remove their JSX usage
   - These components compete with GlobalBackground
   - GlobalBackground now handles all background rendering

2. **Remove Fixed Positioning Backgrounds**: Search for any `<div>` elements with `fixed inset-0` or `absolute inset-0` that serve as backgrounds and remove them
   - Page content should not include full-screen backgrounds
   - Only GlobalBackground should render fixed backgrounds

3. **Verify Page Content Remains Intact**: Ensure removing backgrounds doesn't break page layout
   - Page content should work with transparent background
   - GlobalBackground provides the visual backdrop

**File 5**: `frontend/src/pages/Generator.tsx`, `frontend/src/pages/Home.tsx`, `frontend/src/pages/Components.tsx`, etc.

**Purpose**: Same as Dashboard - remove page-level backgrounds

**Specific Changes**: Apply the same changes as Dashboard.tsx to all content pages that currently include page-level backgrounds

**File 6**: `frontend/src/pages/Welcome.tsx`

**Purpose**: Ensure ScrollDrivenHero is only rendered via GlobalBackground

**Specific Changes**:
1. **Remove ScrollDrivenHero from Page**: Delete `import ScrollDrivenHero` and remove `<ScrollDrivenHero>` JSX from the page
   - GlobalBackground now handles rendering ScrollDrivenHero on "/"
   - Prevents duplicate rendering

2. **Adjust Page Structure**: The page content that was passed as `overlayContent` to ScrollDrivenHero needs to be restructured
   - Move overlay content to be part of the page's main content
   - Ensure proper positioning to appear above GlobalBackground's ScrollDrivenHero
   - Use `relative z-10` or similar to ensure content appears above background

**File 7**: `frontend/src/pages/Login.tsx` and `frontend/src/pages/MotionStudio.tsx`

**Purpose**: Verify no global backgrounds interfere

**Specific Changes**:
1. **No Code Changes Required**: These pages should work correctly once GlobalBackground excludes them
   - GlobalBackground returns `null` for these routes
   - Pages maintain full control over their own backgrounds

2. **Verification**: Test that AuthLayout and Motion Studio preview backgrounds work correctly
   - No visual conflicts with global backgrounds
   - Pointer events work correctly

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that navigate to each route and inspect the DOM to count how many background systems are mounted. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Welcome Page Multiple Backgrounds**: Navigate to "/" and assert that both ScrollDrivenHero and FloatingLinesBackground are present in the DOM (will fail on unfixed code - should find 2 backgrounds)
2. **Login Page Global Background Interference**: Navigate to "/login" and assert that BackgroundLayer or FloatingLinesBackground are present (will fail on unfixed code - should find global backgrounds)
3. **Dashboard Page Duplication**: Navigate to "/dashboard" and assert that both FloatingLinesBackground and BackgroundCanvas3D are present (will fail on unfixed code - should find 2 backgrounds)
4. **Z-Index Inconsistency**: Inspect all mounted backgrounds and assert they use z-index: -10 (will fail on unfixed code - should find z-index: 0)
5. **Pointer Events Blocking**: Inspect all mounted backgrounds and assert they use pointer-events: none (may fail on unfixed code - some backgrounds may lack this)
6. **Route Transition Persistence**: Navigate from "/dashboard" to "/login" and assert previous background unmounts immediately (may fail on unfixed code - background may persist briefly)

**Expected Counterexamples**:
- Multiple background components mounted simultaneously on the same route
- FloatingLinesBackground visible on "/" despite exclusion logic
- Global backgrounds present on "/login" and "/motion-studio"
- Inconsistent z-index values (0 instead of -10)
- Missing pointer-events: none on some backgrounds
- Background persistence during route transitions

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL route IN ['/', '/login', '/dashboard', '/motion-studio', '/generator', '/components'] DO
  navigate(route)
  mountedBackgrounds := getDOMBackgrounds()
  
  ASSERT isBugCondition({ route, mountedBackgrounds }) === false
  
  // Verify single background per route
  IF route === '/' THEN
    ASSERT mountedBackgrounds.length === 1
    ASSERT mountedBackgrounds[0].type === 'ScrollDrivenHero'
  ELSE IF route IN ['/login', '/motion-studio'] THEN
    ASSERT mountedBackgrounds.length === 0
  ELSE
    ASSERT mountedBackgrounds.length === 1
    ASSERT mountedBackgrounds[0].type === 'FloatingLinesBackground'
  END IF
  
  // Verify layering contract
  FOR EACH background IN mountedBackgrounds DO
    ASSERT background.zIndex === -10
    ASSERT background.pointerEvents === 'none'
  END FOR
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL interaction IN [clickButton, submitForm, changeTheme, hoverNode, navigateRoute] DO
  // Test on unfixed code
  originalResult := performInteraction_original(interaction)
  
  // Test on fixed code
  fixedResult := performInteraction_fixed(interaction)
  
  ASSERT originalResult === fixedResult
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for user interactions, theme changes, and route transitions, then write property-based tests capturing that behavior.

**Test Cases**:
1. **ScrollDrivenHero Interactivity Preservation**: Observe that hovering over nodes on "/" triggers hover effects and raycasting works correctly on unfixed code, then write test to verify this continues after fix
2. **FloatingLinesBackground Theme Integration Preservation**: Observe that changing theme updates FloatingLinesBackground gradient colors on unfixed code, then write test to verify this continues after fix
3. **AuthLayout Styling Preservation**: Observe that "/login" page displays correctly with AuthLayout background effects on unfixed code, then write test to verify this continues after fix
4. **Motion Studio Preview Control Preservation**: Observe that Motion Studio can control preview backgrounds independently on unfixed code, then write test to verify this continues after fix
5. **User Interaction Preservation**: Observe that clicking buttons, submitting forms, and interacting with page content works correctly on unfixed code, then write test to verify this continues after fix
6. **Route Transition Smoothness Preservation**: Observe that navigating between routes is smooth on unfixed code, then write test to verify this continues after fix

### Unit Tests

- Test GlobalBackground component renders correct background for each route
- Test GlobalBackground returns null for "/login" and "/motion-studio"
- Test GlobalBackground renders ScrollDrivenHero for "/"
- Test GlobalBackground renders FloatingLinesBackground for other routes
- Test that all backgrounds use standardized layering contract (z-index: -10, pointer-events: none)
- Test that FloatingLinesBackground no longer has route exclusion logic
- Test that App.tsx only mounts GlobalBackground once
- Test that pages no longer mount page-level backgrounds

### Property-Based Tests

- Generate random route paths and verify GlobalBackground renders exactly one background (or none for excluded routes)
- Generate random theme values and verify FloatingLinesBackground updates gradient colors correctly
- Generate random user interactions (clicks, hovers, form submissions) and verify they work correctly across all routes
- Generate random route transition sequences and verify backgrounds mount/unmount cleanly with no persistence

### Integration Tests

- Test full navigation flow: "/" → "/dashboard" → "/login" → "/motion-studio" → "/components"
- Verify each route displays correct background with no conflicts
- Test theme switching while navigating between routes
- Verify ScrollDrivenHero interactivity on "/" (hover, click, raycasting)
- Verify FloatingLinesBackground animation and theme integration on content pages
- Verify AuthLayout displays correctly on "/login" with no global background interference
- Verify Motion Studio preview backgrounds work independently with no global background interference
- Test that all user interactions (buttons, forms, links) work correctly on all routes
- Test route transitions are smooth with no flickering or background persistence
