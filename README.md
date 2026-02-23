# MyHouseholdMgmt

A shared household management PWA built with React, TypeScript, and Firebase. Manage shopping lists, action items, and household members — all in real-time.

## Features

### Shopping Lists
- Create multiple shopping lists with custom names, icons, and categories
- Add, edit, reorder (drag & drop), and delete items
- Swipe-to-delete on mobile
- Mark items as completed, with a collapsible completed section
- **Bonus tag** — optionally enable per list to tag items on sale
- **All Items** view — see items across all lists, drag items between lists
- **Inbox** — add items without assigning to a list, then drag them where they belong

### Action Lists
- Create action/to-do lists with priorities (urgent, high, medium, low)
- Assign actions to household members with due dates
- Overdue indicators and priority badges
- **All Actions** view — aggregate view across all action lists
- **Action Inbox** — quick-capture actions and sort them later

### Household Management
- Create and join households via invite link or code
- Multi-household support — switch between households
- Role-based access: **Admin** and **Member** roles
- Admins can rename the household, manage members, promote/demote roles, and share invite links
- Member list with avatars, names, emails, and role badges
- Custom household icon (image upload, auto-resized to 128×128)

### Settings
- iOS-style settings modal with **General**, **Members**, and **Account** tabs
- Rename household, change icon, manage invite sharing
- Custom list and action categories
- Per-list bonus tag toggle
- Sign out and leave household

### UX
- iOS-inspired design with Tailwind CSS
- Installable PWA with offline support and update prompts
- Real-time sync across devices via Firestore
- Drag & drop reordering for lists and items (touch + mouse)
- **Reorder mode** — drag handles hidden by default on mobile, toggled via header button (Dashboard only)
- **Swipe gestures** — swipe left to delete, swipe right to mark complete
- Category filters on dashboard and aggregate views
- Responsive layout optimized for mobile

### Security
- Firestore rules with role-based access control (admin / member / non-member)
- Household data restricted to members only — non-members cannot read household documents
- Separate `/invites/{code}` collection for join previews (exposes name only)
- Field-level validation: whitelisted fields, string length limits, schema enforcement
- `memberInfo` shape validated on join (`hasOnly` displayName + email)
- Last-admin protection — cannot demote the only remaining admin
- Security headers via Vercel (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- localStorage household ID validated against expected format before use
- No `dangerouslySetInnerHTML`, `eval`, or DOM injection — React JSX escaping throughout

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| Backend | Firebase Firestore + Firebase Auth (Google) |
| PWA | vite-plugin-pwa (Workbox) |
| Routing | React Router 7 |
| Hosting | Vercel |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test
```

## Project Structure

```
src/
├── main.tsx                  # Entry point
├── App.tsx                   # Root component, auth gate, routing
├── components/               # Reusable UI components
│   ├── ActionRow.tsx         # Action item with priority/due date
│   ├── ActionsTab.tsx        # Actions tab on dashboard
│   ├── CategoryPicker.tsx    # Category selector with add-new
│   ├── ConfirmDialog.tsx     # Reusable confirmation modal
│   ├── HouseholdIconPicker   # Household icon upload/picker
│   ├── HouseholdSwitcher     # Multi-household switcher
│   ├── IconPicker.tsx        # Emoji icon picker
│   ├── Icons.tsx             # SVG icon components
│   ├── ItemRow.tsx           # Shopping item with bonus tag
│   ├── SettingsModal.tsx     # Settings with tabs (General/Members/Account)
│   ├── SwipeableItem.tsx     # Swipe-to-delete wrapper
│   └── UpdatePrompt.tsx      # PWA update notification
├── context/
│   ├── AuthContext.tsx        # Firebase Auth provider
│   └── HouseholdContext.tsx   # Household selection & join/create
├── hooks/
│   └── useHousehold.ts        # Core data hook (Firestore CRUD)
├── lib/
│   ├── firebase.ts            # Firebase config & initialization
│   ├── i18n.tsx               # i18n context (EN/NL, in progress)
│   ├── share.ts               # Web Share API / clipboard fallback
│   ├── utils.ts               # Utility functions
│   └── translations/          # Translation dictionaries
├── pages/
│   ├── Dashboard.tsx          # Main dashboard with Lists/Actions tabs
│   ├── JoinScreen.tsx         # Create or join a household
│   ├── ListView.tsx           # Single shopping list view
│   ├── ActionsView.tsx        # Single action list view
│   ├── AllItemsView.tsx       # Aggregate items across all lists
│   └── AllActionsView.tsx     # Aggregate actions across all lists
└── __tests__/                 # Unit tests
```

## Environment Variables

Create a `.env` file with your Firebase project config:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## License

Private project.
