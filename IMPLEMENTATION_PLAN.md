# School Management System (SMS) - Implementation Plan

## Current Progress Status

- **Day 1 (Foundation):** MongoDB configured, Express server running, Mongoose models initialized (`User`, `Student`, `Teacher`, `Class`, `Fee`).
- **Day 2 (Security):** `bcryptjs` and `jsonwebtoken` installed, Authentication controller/middleware built, Admin registration and Login complete.
- **Day 3 (Registrar/User Management):** Backend supports User mapping. (Frontend implementations pending Vite setup).
- **Day 4 (Bursar/Fee Management):** Backend `FeeController` and routes created for recording payments and calculating defaulters based on Ethiopian months.

---

## Phase 1: Frontend Initialization (Vite + React)

**Goal:** Replace the static `index.html` in the frontend directory with a modern React SPA setup.

1. **Bootstrap Project:** Use Vite to scaffold a React setup inside `frontend/`.
2. **Styling & UI Library:** Install Tailwind CSS, PostCSS, and configure Shadcn/UI for rapid, accessible component development (Cards, DataTables, Select, Forms).
3. **Routing:** Set up `react-router-dom` for navigation (e.g., `/login`, `/dashboard`, `/fees`).
4. **State Management/API Client:** Set up `axios` with an interceptor to dynamically inject the JWT token into all requests.

---

## Phase 2: Security & Authentication (Frontend - Day 2)

**Goal:** Ensure no one accesses protected routes without a valid JWT token.

1. **Login Page:**
   - A clean Shadcn/UI Card containing an Email and Password form.
   - Upon success, store the JWT token locally (e.g., `localStorage`).
2. **Auth Provider (React Context):**
   - Manage the current logged-in user state.
   - **Protected Route Wrapper:** A component that redirects to `/login` if no valid token is found.

---

## Phase 3: The Registrar (User Management - Day 3)

**Goal:** Admin dashboard to view and register students/teachers.

1. **Master Data Table:**
   - Implement Shadcn/UI `DataTable` to fetch and list all Students. Gives us search and pagination.
2. **Registration Form:**
   - A Modal/Page to register a new Student (Requires tying an auth `User` to a `Student` record).

---

## Phase 4: The Bursar (Fee Management - Day 4)

**Goal:** The commercial core. Recording payments and tracking defaulters.

1. **API Integration (Backend already done):**
   - `POST /api/fees` (Record a new payment).
   - `GET /api/fees/defaulters/:month` (Fetch students missing payments).
   - need `GET /api/students` (Fetch all students to populate dropdowns).

2. **UI Component 1: Record Payment Form:**
   - **Fields**: Student (Searchable Dropdown/Combobox), Amount (Number Input), Month (Select dropdown with: Meskerem to Pagume).
   - **Action**: Submits to the API and shows a success toast.

3. **UI Component 2: Defaulters View:**
   - A top bar with a Month selector.
   - A Shadcn/UI `DataTable` below it.
   - **Logic**: When a month is selected, fetch from `/api/fees/defaulters/:month` and render the list of students with unpaid status.

---

## Next Action Steps Required:

If you approve of this plan, my next immediate actions will be:

1. Deleting the dummy `index.html` in `frontend/`.
2. Running the Vite + React bootstrap commands.
3. Setting up TailwindCSS and Shadcn/UI dependencies.
4. Building the API service wrapper (`axios`) to handle your JWT tokens securely.
