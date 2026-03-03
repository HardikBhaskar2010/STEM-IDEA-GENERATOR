# Admin System Architecture Diagram

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER AUTHENTICATION                          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
            ┌───────▼───────┐              ┌────────▼────────┐
            │  Guest User   │              │ Authenticated   │
            │  (No Login)   │              │     User        │
            └───────┬───────┘              └────────┬────────┘
                    │                               │
                    │                    ┌──────────┴──────────┐
                    │                    │                     │
                    │           ┌────────▼────────┐  ┌────────▼─────────┐
                    │           │  Regular User   │  │   Owner/Admin    │
                    │           │  (Any Email)    │  │ hardik.bhask...  │
                    │           └────────┬────────┘  └────────┬─────────┘
                    │                    │                     │
                    │                    │                     │
┌───────────────────┴────────────────────┴─────────────────────┴─────────┐
│                          FEATURE ACCESS MATRIX                          │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┬─────────┬──────────────┬────────────────┐
│      Feature         │  Guest  │ Regular User │     Admin      │
├──────────────────────┼─────────┼──────────────┼────────────────┤
│ View Components      │   ✅    │      ✅      │       ✅       │
│ View Details         │   ❌    │      ✅      │       ✅       │
│ Add Components       │   ❌    │      ❌      │       ✅       │
│ Delete Components    │   ❌    │      ❌      │       ✅       │
│ Edit Components      │   ❌    │      ❌      │       ✅       │
│ Admin Dashboard      │   ❌    │      ❌      │       ✅       │
│ Admin Panel Link     │   ❌    │      ❌      │       ✅       │
└──────────────────────┴─────────┴──────────────┴────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LAYER 1: FRONTEND                            │
│  • AuthContext checks user email against OWNER_EMAIL                │
│  • UI components conditionally render based on isAdmin              │
│  • Admin routes redirect non-admin users                            │
│  • Delete buttons hidden from non-admins                            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LAYER 2: SUPABASE CLIENT                          │
│  • Authenticated requests include JWT token                         │
│  • Token contains user email and auth metadata                      │
│  • Client-side validation before API calls                          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│               LAYER 3: DATABASE (RLS POLICIES) 🔒                   │
│  • Row Level Security enabled on components table                   │
│  • SELECT: Anyone can view                                          │
│  • INSERT: Only hardik.bhaskar2010@gmail.com                       │
│  • UPDATE: Only hardik.bhaskar2010@gmail.com                       │
│  • DELETE: Only hardik.bhaskar2010@gmail.com                       │
│  • Enforced at PostgreSQL level - CANNOT be bypassed               │
└─────────────────────────────────────────────────────────────────────┘
```

## Admin Dashboard Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       /admin Dashboard Layout                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Header                                                      │   │
│  │  • Shield icon + "Admin Dashboard" title                    │   │
│  │  • Owner email badge                                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌───────────┬───────────┬───────────┬───────────┐                 │
│  │  Total    │  In Stock │ Out Stock │Categories │  Stats Cards    │
│  │  Comps    │           │           │           │                 │
│  └───────────┴───────────┴───────────┴───────────┘                 │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Quick Actions                                              │   │
│  │  [+ Add New Component]                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Component Management                                       │   │
│  │  ┌────────────────────────────────────────┬──────────────┐ │   │
│  │  │ Arduino Uno R3                         │ [🗑️ Delete] │ │   │
│  │  │ Microcontroller • In Stock             │              │ │   │
│  │  │ $25.00 • arduino • beginner           │              │ │   │
│  │  └────────────────────────────────────────┴──────────────┘ │   │
│  │  ┌────────────────────────────────────────┬──────────────┐ │   │
│  │  │ DHT22 Temp Sensor                      │ [🗑️ Delete] │ │   │
│  │  │ Sensor • Limited                       │              │ │   │
│  │  │ $8.99 • sensor • temperature          │              │ │   │
│  │  └────────────────────────────────────────┴──────────────┘ │   │
│  │  ...                                                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Navigation Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                            Sidebar                                   │
├─────────────────────────────────────────────────────────────────────┤
│  🏠 Dashboard                                                        │
│  ⚡ Generator                                                        │
│  💻 Veronica AI                                                      │
│  🏆 Competition                                                      │
│  🔧 Components                                                       │
│  📚 Library                                                          │
│  🎓 Learn                                                            │
│  👤 Profile                                                          │
│  ℹ️  About                                                           │
│  ─────────────────────── (separator)                                │
│  🛡️  Admin Panel  ← Only visible to admin                           │
│     (Purple gradient when active)                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow: Component Deletion

```
┌──────────────────────────────────────────────────────────────────┐
│ Step 1: User clicks delete button                                │
│         (Button only visible if isAdmin === true)                │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 2: Delete confirmation dialog appears                       │
│         "Are you sure you want to delete [component]?"          │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 3: User confirms deletion                                   │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 4: componentService.deleteComponent(id) called              │
│         Frontend sends request to Supabase                       │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 5: Supabase checks RLS policies                            │
│         • Extracts email from JWT token                         │
│         • Compares with policy: hardik.bhaskar2010@gmail.com   │
│         • If match: Allow deletion                              │
│         • If no match: Deny with permission error               │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                    ┌────┴────┐
                    │         │
              ✅ Success   ❌ Denied
                    │         │
                    ▼         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 6: Response handling                                       │
│  Success: Show toast "Component deleted"                        │
│  Error: Show toast "Failed to delete component"                │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 7: Real-time update                                        │
│         Supabase broadcasts change to all clients               │
│         Component list automatically refreshes                  │
└─────────────────────────────────────────────────────────────────┘
```

## Files Modified/Created

```
📦 Admin System Implementation
├── 📝 Modified Files
│   ├── /app/frontend/src/contexts/AuthContext.tsx
│   │   └── Added OWNER_EMAIL constant and isAdmin detection
│   ├── /app/frontend/src/App.tsx
│   │   └── Added /admin route for AdminDashboard
│   ├── /app/frontend/src/components/layout/Sidebar.tsx
│   │   └── Added Admin Panel navigation link (admin-only)
│   └── /app/frontend/src/pages/Components.tsx
│       └── Changed delete button visibility to admin-only
│
├── ✨ New Files
│   ├── /app/frontend/src/pages/AdminDashboard.tsx
│   │   └── Complete admin dashboard with stats and management
│   ├── /app/admin_security_policies.sql
│   │   └── Supabase RLS policies for database security
│   ├── /app/ADMIN_IMPLEMENTATION.md
│   │   └── Complete documentation and setup guide
│   └── /app/ADMIN_ARCHITECTURE.md
│       └── This file - visual architecture diagrams
│
└── 🔒 Security
    ├── Frontend: UI-level protection (conditional rendering)
    ├── Auth: Email-based admin detection
    └── Database: RLS policies (must be run in Supabase)
```

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Opens Application                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│               AuthContext Initializes                            │
│  • Checks for existing session                                  │
│  • If no session: Creates guest user                           │
│  • If session exists: Loads authenticated user                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Admin Detection Logic                            │
│                                                                  │
│  const isAdmin = !isGuest &&                                    │
│                  isAuthenticated &&                             │
│                  user.email === 'hardik.bhaskar2010@gmail.com' │
└────────────────────────┬────────────────────────────────────────┘
                         │
             ┌───────────┴───────────┐
             │                       │
        isAdmin=true            isAdmin=false
             │                       │
             ▼                       ▼
┌──────────────────────┐  ┌──────────────────────┐
│   Admin Features     │  │  Regular Features    │
│   • Admin Panel      │  │  • No Admin Panel    │
│   • Delete buttons   │  │  • No Delete buttons │
│   • Full access      │  │  • View only         │
└──────────────────────┘  └──────────────────────┘
```

## Future Enhancements

```
🔮 Planned Features (Not Yet Implemented)

┌─────────────────────────────────────────────────────────────────┐
│ 1. User Submission Approval System                              │
│    • New table: component_submissions                          │
│    • Users can submit components for approval                  │
│    • Admin dashboard shows pending submissions                 │
│    • Approve/reject with feedback                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 2. Role-Based Access Control                                    │
│    • Multiple admin users support                              │
│    • Teacher moderator role                                    │
│    • Custom permissions per role                               │
│    • profiles table with role column                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 3. Edit Component Functionality                                 │
│    • Edit button in admin dashboard                            │
│    • Modal form with pre-filled data                           │
│    • Update specifications, price, stock                       │
│    • Change tracking/audit log                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 4. Advanced Admin Features                                      │
│    • Bulk operations (delete multiple)                         │
│    • Export components to CSV                                  │
│    • Import components from file                               │
│    • Analytics and reporting                                   │
│    • User activity logs                                        │
│    • Component usage statistics                                │
└─────────────────────────────────────────────────────────────────┘
```
