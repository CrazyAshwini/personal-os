# Personal OS — Quality Assurance Checklist

**Status:** Active Regression Protocol  
**Platforms:** Desktop Web (Chrome, Edge, Safari, Firefox) + Android PWA (Chrome Mobile, Samsung Internet)  

---

## 1. Automated Verification Matrix

| Check Category | Command | Target Criteria | Status |
| :--- | :--- | :--- | :--- |
| **Unit & Integration Tests** | `npm test` | 100% pass across all test suites | **PASS** |
| **TypeScript Strictness** | `npx tsc --noEmit` | 0 type errors | **PASS** |
| **Linting & Code Style** | `npm run lint` | 0 errors, 0 warnings | **PASS** |
| **Production Build** | `npm run build` | Turbopack compilation succeeds, all routes static/dynamic | **PASS** |

---

## 2. Functional Regression Checklist

### Authentication & Sessions
- [ ] User registration with password validation
- [ ] 6-digit OTP delivery and validation
- [ ] User login with valid credentials
- [ ] User login rejection with invalid credentials
- [ ] Password reset request and link delivery
- [ ] Protected route redirect to `/login` when unauthenticated
- [ ] User session persistence across browser reload
- [ ] Sign out action and cookie clearance

### Core Modules
- [ ] **Dashboard**: Personalized greeting, academic attendance summary, pending task count, Pomodoro widget, calendar agenda
- [ ] **Academics**: Subject management, class session attendance logging, attendance % derivation against 75% threshold
- [ ] **Productivity**: Task creation, subtasks, priority badges, completion toggling, tag filtering
- [ ] **Pomodoro**: Focus timer starts/pauses/resets, interval completion, session history persistence
- [ ] **Calendar**: Event creation, reminder alarms, month/week views

### Personal Modules
- [ ] **Finance**: High-precision ₹ INR formatting, account balance reconciliation on expense/income/transfer, recurring bill tracking, FD maturity, EMI logging
- [ ] **Travel**: Trip creation, packing checklist, status updates
- [ ] **Books**: Reading progress tracking, rating, status transitions
- [ ] **Entertainment**: Watchlist management and ratings
- [ ] **Habits & Goals**: Daily check-in streaks and goal progress bars
- [ ] **Notes**: Markdown note editing and search
- [ ] **Documents**: Secure document upload, metadata listing, deletion

---

## 3. Visual & Theme Quality Checklist

- [ ] Light Theme: Canvas `#F5F4EF`, Card `#FFFFFF`, Sage Accent `#788D79`, text contrast >= 4.5:1
- [ ] Dark Theme: Canvas `#171A18`, Card `#202421`, Sage Accent `#91A58F`, text contrast >= 4.5:1
- [ ] System Theme: Auto-adapts to OS appearance (`prefers-color-scheme`)
- [ ] Zero theme flash on initial render
- [ ] All inputs, buttons, dialogs, badges, and charts adapt smoothly to active theme
- [ ] No hardcoded grayscale colors conflicting with the warm neutral design tokens

---

## 4. Mobile PWA & Viewport Testing

| Viewport | Device Profile | Navigation Layout | Horizontal Overflow | Touch Target >= 44px |
| :--- | :--- | :--- | :--- | :--- |
| **360 × 800** | Compact Android | Top Header + Bottom Bar | None | Yes |
| **390 × 844** | Standard Mobile | Top Header + Bottom Bar | None | Yes |
| **768 × 1024** | Tablet Portrait | Collapsible Drawer / Top Nav | None | Yes |
| **1280 × 800** | Laptop / Tablet Landscape | Desktop Sidebar | None | Yes |
| **1440 × 900** | Desktop Standard | Desktop Sidebar | None | Yes |
| **1920 × 1080** | Large Desktop Display | Desktop Sidebar (Max-w 7xl) | None | Yes |

### PWA Capabilities
- [ ] Web App Manifest valid (`/manifest.webmanifest`)
- [ ] Service worker registers and activates (`/sw.js`)
- [ ] Offline fallback displays when network is disconnected (`/offline.html`)
- [ ] Standalone mode launch without browser URL chrome
