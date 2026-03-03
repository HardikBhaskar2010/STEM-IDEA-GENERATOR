# Bugfix Requirements Document

## Introduction

The STEM Idea Adventure application currently suffers from a critical architectural issue where multiple background rendering systems compete for the same visual space, causing rendering conflicts, z-index chaos, pointer-event interception, and background persistence issues across route transitions. This bug affects user experience across all routes, with particularly severe issues on the Welcome page (/), Login page (/login), Motion Studio (/motion-studio), and various content pages (Dashboard, Generator, Components, etc.).

The root cause is the lack of a centralized background management system. Currently, three competing systems exist:
- Global `BackgroundLayer` component (from Effects Engine)
- Global `FloatingLinesBackground` component
- Page-level full-screen backgrounds (`HeroScene3D`, `BackgroundCanvas3D`, `ScrollDrivenHero`)

This creates a situation where 2-3 backgrounds can render simultaneously on the same route, causing visual conflicts, performance degradation, and interaction blocking.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the application renders any route THEN multiple background systems (BackgroundLayer, FloatingLinesBackground, and page-level backgrounds) render simultaneously causing visual conflicts and z-index chaos

1.2 WHEN navigating to the Welcome page (/) THEN both ScrollDrivenHero (page-level) and FloatingLinesBackground (global) attempt to render, with FloatingLinesBackground incorrectly appearing despite route exclusion logic

1.3 WHEN navigating to the Login page (/login) THEN global background systems (BackgroundLayer, FloatingLinesBackground) interfere with the page's own AuthLayout background effects

1.4 WHEN navigating to Motion Studio (/motion-studio) THEN default backgrounds (FloatingLinesBackground) inherit into the studio, conflicting with the studio's preview-controlled background system

1.5 WHEN navigating to content pages (Dashboard, Generator, Home, Components, Learn, CodeGenerator) THEN page-level full-screen backgrounds (BackgroundCanvas3D, HeroScene3D) render in addition to global backgrounds, creating duplicate fixed layers

1.6 WHEN backgrounds use inconsistent z-index values (z-0, -z-10, random values) THEN layering conflicts occur causing some backgrounds to appear above interactive content

1.7 WHEN backgrounds use `pointer-events: auto` or lack `pointer-events: none` THEN user interactions with buttons, forms, and links are blocked or intercepted

1.8 WHEN transitioning between routes THEN backgrounds fail to unmount cleanly, causing persistence of previous route backgrounds or flickering during transitions

1.9 WHEN App.tsx mounts both BackgroundLayer and FloatingLinesBackground at the root level THEN both systems attempt to render simultaneously regardless of route context

1.10 WHEN pages like Home, Dashboard, and Generator include their own `<BackgroundCanvas3D>` or `<HeroScene3D>` components THEN these compete with global background systems for the same fixed positioning space

### Expected Behavior (Correct)

2.1 WHEN the application renders any route THEN exactly ONE background system SHALL render per route with no visual conflicts or z-index issues

2.2 WHEN navigating to the Welcome page (/) THEN the system SHALL render ONLY ScrollDrivenHero (interactive 3D with raycasting and hover nodes) with no other background systems active

2.3 WHEN navigating to the Login page (/login) THEN the system SHALL render NO global backgrounds, allowing the page's AuthLayout to control its own background

2.4 WHEN navigating to Motion Studio (/motion-studio) THEN the system SHALL render NO global backgrounds, allowing the studio to control preview backgrounds independently

2.5 WHEN navigating to content pages (Dashboard, Generator, Home, Components, Learn, CodeGenerator, etc.) THEN the system SHALL render ONLY FloatingLinesBackground as the global background with no page-level backgrounds

2.6 WHEN any global background renders THEN it SHALL use the standardized layering contract: `className="fixed inset-0 pointer-events-none -z-10"`

2.7 WHEN any global background renders THEN it SHALL NOT intercept pointer events, ensuring all user interactions with page content function correctly

2.8 WHEN transitioning between routes THEN backgrounds SHALL mount and unmount cleanly with no persistence, flickering, or rendering artifacts

2.9 WHEN App.tsx initializes THEN it SHALL mount ONLY a single GlobalBackground component that uses route-aware logic to determine which background to render

2.10 WHEN pages render their content THEN they SHALL NOT include any full-screen background components (no `fixed inset-0` or `absolute inset-0` backgrounds), delegating all background rendering to GlobalBackground

### Unchanged Behavior (Regression Prevention)

3.1 WHEN ScrollDrivenHero renders on the Welcome page (/) THEN it SHALL CONTINUE TO provide interactive 3D functionality with raycasting, hover effects, and node interactions

3.2 WHEN FloatingLinesBackground renders on content pages THEN it SHALL CONTINUE TO display animated floating lines with theme-based gradient colors from PreferencesContext

3.3 WHEN the Login page renders THEN its AuthLayout and AuthCard components SHALL CONTINUE TO function with their existing background effects and styling

3.4 WHEN Motion Studio renders THEN its LivePreview component SHALL CONTINUE TO control preview backgrounds independently without interference

3.5 WHEN users interact with page content (buttons, forms, links, cards) THEN all interactions SHALL CONTINUE TO work correctly without pointer-event blocking

3.6 WHEN the Effects Engine (BackgroundLayer) is used for effect previews in Motion Studio THEN it SHALL CONTINUE TO function within the studio's preview context

3.7 WHEN CursorLayer renders globally THEN it SHALL CONTINUE TO provide cursor effects across all routes without modification

3.8 WHEN users navigate between routes THEN route transitions SHALL CONTINUE TO be smooth with proper component mounting/unmounting

3.9 WHEN the application uses Layout component THEN it SHALL CONTINUE TO provide navigation, sidebar, and page structure without background-related modifications

3.10 WHEN theme changes occur via PreferencesContext THEN FloatingLinesBackground SHALL CONTINUE TO update its gradient colors dynamically based on the selected theme
