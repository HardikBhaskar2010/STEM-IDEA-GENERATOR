"# 🌊 3D Welcome Page – Orbital Focus Upgrade (Luna V3)

## 📌 Context

This plan **EXTENDS**:
- `/app/3D_Welcome_Page.md`
- The existing **Luna V2 Interactive Atlas** implementation

### Current System Already Includes:
- ✅ Ref-based scroll tracking (no React re-render loops)
- ✅ useFrame animation loop
- ✅ Lerp-based camera smoothing (0.08 factor)
- ✅ Feature nodes with metadata
- ✅ Neural path using CatmullRomCurve3
- ✅ Hover and click interaction
- ✅ 500vh scroll structure

**We are NOT replacing architecture.**  
**We are upgrading spatial choreography and focus logic.**

---

## 🎯 Objective

Transform the current 3D layout into a **Scroll-Controlled Orbital Focus System** where:

1. Feature nodes revolve in a **controlled arc**
2. Each node becomes **centered in sequence** during scroll
3. When centered, a **subtle text reveal** appears
4. User understands interactivity **without explicit instructions**

### What We Remove:
- ❌ No \"Click Me\" UI
- ❌ No visual clutter

### Emotional Goal:
**This must feel intentional, curated, and premium.**

---

## 🧱 Architectural Shift

### Current Issue:
- Nodes are positioned in depth layers only (Z -2, -4, -6)
- Camera moves forward
- There is **no strong focal rhythm**

**Result:**
- All nodes feel equally important
- User lacks guided focus

### New Spatial Model: Orbital Arc System

Instead of linear depth staging only:

1. Place feature nodes along a **shallow horizontal arc**
2. Think: **Half-circle in front of camera**
3. Each node occupies a position along this arc
4. **Scroll rotates the arc**

---

## 🧭 Orbital Geometry Plan

### 1️⃣ Create Orbit Group

Inside `ThreeHeroScene`:

```tsx
<group ref={orbitGroupRef}>
   {/* Feature nodes as children */}
</group>
```

**All feature nodes must be children of this group.**

---

### 2️⃣ Node Positioning

**Define:**
- **Orbit radius:** 3 units
- **Arc spread:** ~120 degrees total

**For 4 nodes:**

| Node | Angle | Position Formula |
|------|-------|------------------|
| Node 1 | -60° | `x = radius * Math.sin(angle)` |
| Node 2 | -20° | `z = -4 + radius * Math.cos(angle)` |
| Node 3 | +20° | Y variation slight (±0.3 max) |
| Node 4 | +60° | |

**Convert angle to position:**
```typescript
x = radius * Math.sin(angle)
z = -4 + radius * Math.cos(angle)
```

**This ensures:**
- Nodes appear arranged around a curved path

---

### 3️⃣ Scroll → Orbit Rotation Mapping

Instead of primary camera forward movement:

**Use `scrollProgress` to rotate `orbitGroup` on Y axis.**

**Mapping:**
```typescript
orbitGroup.rotation.y = lerp(
   currentRotation,
   scrollProgress * rotationRange,
   0.08
)
```

**Rotation range should be small:**
- Max ~0.8π radians
- **Not full spin**
- **Not carousel toy**
- **Subtle arc rotation**

**Camera should remain mostly stable at:**
- Z = 6–7
- Optional: slight forward drift (< 1 unit total)

---

## 🎯 Focus Detection System

**We must detect when a node becomes centered.**

### Criteria:
- Node's projected X position near 0 (center of screen)

### Simpler method (performance-safe):

Inside `useFrame`:

```typescript
// Get world position of node
// Convert to camera space
// If abs(x) < threshold (e.g., 0.3)
// AND z is closest among nodes
// → That node is focused
```

**Store `focusedNodeId` in a ref.**

**Only update React state when `focusedNodeId` changes.**

⚠️ **No per-frame setState spam.**

---

## 📝 Subtle Text Reveal System (Luna Style)

When `focusedNodeId` changes:

### Trigger overlay reveal:
- Title fades in (opacity 0 → 1)
- Slight upward motion (10px)
- Thin underline expands horizontally

### What NOT to include:
- ❌ No background box
- ❌ No CTA

### Text positioning:
- Centered overlay area, slightly below main hero
- Fade out when node leaves focus

### Transition duration:
- 0.4–0.6s

---

## 🎮 Focus Reinforcement Effects

### When node is focused:
- Scale → **1.05 max**
- Emissive intensity **+0.2**
- Neural path emissive boost **toward node**
- Slight reduction in global ambient intensity (optional subtle contrast)

### Non-focused nodes:
- Opacity → **0.6–0.8**

**This creates hierarchy.**

---

## 🌊 Neural Path Integration

The neural path remains fully present (**Option B logic**).

### Adjust behavior:

When `focusedNodeId` changes:
- Increase emissive intensity of tube segments **closest to node**
- Implement **gradient highlight** along path toward focused node

### Do NOT:
- ❌ Animate entire path dramatically
- ❌ Pulse aggressively

**Keep it elegant.**

---

## 📱 Mobile Behavior

Mobile should:

- ✅ Use reduced arc spread (**90° instead of 120°**)
- ✅ Disable micro camera tilt
- ✅ Use simplified focus detection
- ✅ Text reveal same as desktop
- ✅ Feature panel still bottom sheet
- ❌ Hover effects disabled
- ✅ Tap remains enabled

---

## ⚡ Performance Constraints (Mandatory)

| Constraint | Rule |
|------------|------|
| Scroll progress | Remains ref-based |
| React state | Only `focusedNodeId` and `selectedNodeId` |
| Smoothing | Lerp everywhere |
| Tube geometry | Low segment count |
| Shaders | No new heavy shaders |
| FPS target | ≥ 55 desktop |

---

## 🧪 Testing Criteria

### Correct behavior means:

- ✅ Scroll slowly → nodes take turns entering center
- ✅ Text appears only when node is centered
- ✅ No jitter
- ✅ No snap rotation
- ✅ No re-render spam
- ✅ Neural path subtly responds
- ✅ Feels **curated, not chaotic**

---

## 🎭 Emotional Outcome

The experience should feel like:

> **\"A guided product showcase.\"**

- Each feature gets a **stage moment**
- User subconsciously understands:
  
  **\"These objects are interactive.\"**
  
  **Without being told.**

---

## 🚀 Deliverables

### Update:
- `ThreeHeroScene.tsx`
- `ScrollDrivenHero.tsx`

### Add:
- Focus detection logic
- Overlay title reveal logic
- Orbital group rotation logic

### Maintain compatibility with:
- `3D_Welcome_Page.md`
- Luna V2 implementation

---

## 📋 Implementation Checklist

### Phase 1: Orbital Positioning
- [ ] Create `orbitGroupRef` in ThreeHeroScene
- [ ] Move feature nodes to orbital arc positions
- [ ] Calculate positions using arc geometry (radius 3, spread 120°)
- [ ] Test node arrangement visually

### Phase 2: Scroll-Driven Rotation
- [ ] Map `scrollProgress` to `orbitGroup.rotation.y`
- [ ] Implement lerp smoothing (0.08 factor)
- [ ] Set rotation range (~0.8π max)
- [ ] Adjust camera position (Z 6-7, minimal forward drift)
- [ ] Test smooth rotation during scroll

### Phase 3: Focus Detection
- [ ] Implement focus detection in useFrame
- [ ] Use ref for `focusedNodeRef` (avoid setState spam)
- [ ] Calculate world position → camera space
- [ ] Threshold detection (abs(x) < 0.3)
- [ ] Update React state only on change

### Phase 4: Text Reveal System
- [ ] Create FocusedNodeOverlay component
- [ ] Implement fade-in animation (0.4-0.6s)
- [ ] Add upward motion effect (10px)
- [ ] Add thin underline expansion
- [ ] Position below main hero text
- [ ] Test fade-out on focus loss

### Phase 5: Focus Effects
- [ ] Scale focused node to 1.05
- [ ] Boost emissive intensity +0.2
- [ ] Reduce non-focused nodes opacity to 0.6-0.8
- [ ] Enhance neural path toward focused node
- [ ] Test hierarchy clarity

### Phase 6: Mobile Optimization
- [ ] Reduce arc spread to 90°
- [ ] Disable camera micro-tilt
- [ ] Simplify focus detection
- [ ] Test text reveal on mobile
- [ ] Verify bottom sheet still works

### Phase 7: Performance Validation
- [ ] Verify no new re-render loops
- [ ] Check FPS ≥ 55 desktop
- [ ] Confirm lerp smoothing maintained
- [ ] Test scroll jank-free
- [ ] Validate reduced motion support

---

## 🎨 Visual Specification

### Orbital Arc Layout (Top View)

```
         Camera (Z=6)
              |
              |
        [Node 3] 20°
              /
             /
      [Node 2] -20°
            |
            |   Orbit radius: 3 units
            |   Arc center: Z=-4
      [Node 1] -60°
             \
              \
        [Node 4] 60°
```

### Focus Transition Timeline

```
Scroll 0vh → 125vh → Node 1 centered
Scroll 125vh → 250vh → Node 2 centered
Scroll 250vh → 375vh → Node 3 centered
Scroll 375vh → 500vh → Node 4 centered
```

---

## 🧠 Technical Notes

### Orbit Group Rotation Formula
```typescript
const rotationRange = 0.8 * Math.PI; // ~144 degrees
const targetRotation = scrollProgress * rotationRange;
orbitGroupRef.current.rotation.y = THREE.MathUtils.lerp(
  orbitGroupRef.current.rotation.y,
  targetRotation,
  0.08
);
```

### Focus Detection Logic
```typescript
const focusThreshold = 0.3;
featureNodes.forEach(node => {
  const worldPos = new THREE.Vector3();
  node.getWorldPosition(worldPos);
  const screenPos = worldPos.project(camera);
  
  if (Math.abs(screenPos.x) < focusThreshold && 
      worldPos.distanceTo(camera.position) < closestDistance) {
    closestDistance = worldPos.distanceTo(camera.position);
    newFocusedNode = node.userData.nodeId;
  }
});

// Only update state if changed
if (newFocusedNode !== focusedNodeRef.current) {
  focusedNodeRef.current = newFocusedNode;
  setFocusedNodeId(newFocusedNode);
}
```

### Text Reveal Animation (Framer Motion)
```typescript
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -10 }}
  transition={{ duration: 0.5, ease: 'easeOut' }}
>
  <h3 className=\"text-4xl font-bold\">{focusedNode.title}</h3>
  <motion.div
    className=\"h-px bg-gradient-to-r from-transparent via-primary to-transparent\"
    initial={{ width: 0 }}
    animate={{ width: '100%' }}
    transition={{ duration: 0.6, delay: 0.2 }}
  />
</motion.div>
```

---

## 🎯 Success Criteria

### User Perception Goals:
1. ✅ \"I can see each feature clearly\"
2. ✅ \"The system is guiding my attention\"
3. ✅ \"This feels intentional and premium\"
4. ✅ \"I know these are interactive without being told\"
5. ✅ \"This is sophisticated, not gimmicky\"

### Technical Goals:
- ✅ Smooth 60fps scroll experience
- ✅ No visual jitter or snapping
- ✅ Clear focal hierarchy at all scroll positions
- ✅ Text reveals perfectly timed with center alignment
- ✅ Neural path elegantly responds to focus

---

## 🚧 What NOT to Do

### ❌ Avoid These Mistakes:
1. **Full carousel spin** - Keep rotation subtle (~144° max)
2. **Aggressive animations** - Lerp everything, no snapping
3. **Visual clutter** - No \"Click Here\" tooltips or CTAs in focus overlay
4. **setState spam** - Use refs for per-frame values
5. **Breaking existing features** - Maintain hover/click from Luna V2
6. **Heavy performance cost** - Keep geometry segments low

---

## 📖 Reference Architecture

### Extends:
- `/app/3D_Welcome_Page.md` - Base scroll system
- `/app/LUNA_V2_IMPLEMENTATION.md` - Interactive atlas foundation

### Maintains:
- Ref-based scroll tracking
- useFrame animation loop
- Lerp smoothing (0.08 camera, 0.06 objects)
- Neural path CatmullRomCurve3
- Feature node metadata system
- Hover/click interactions
- Mobile responsiveness
- Reduced motion support

### Adds:
- Orbital arc positioning
- Scroll-driven rotation
- Focus detection system
- Subtle text reveal overlay
- Focus-based visual hierarchy

---

**Implementation Authority**: Luna V3 Specification  
**Architecture Compatibility**: Luna V2 + 3D_Welcome_Page.md  
**Status**: Ready for Implementation  

---

🌊✨ **This transforms the Interactive Atlas into a Guided Product Showcase with Premium Spatial Choreography.**
"
