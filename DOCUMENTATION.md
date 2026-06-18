# Oppora CRM Clone Documentation

Welcome to the documentation for **Oppora CRM**, a multi-tenant Customer Relationship Management (CRM) application. This application features a React 19 + Vite frontend coupled with a Django REST Framework (DRF) backend, integrating OpenAI assistants, Hunter.io people lookup, AbstractAPI company enrichment, and Celery background workers.

---

## 1. System Architecture & Tech Stack

### Frontend Stack
* **Core**: React 19, Vite 8, JavaScript (ES6+)
* **Styling**: Vanilla CSS with a modern dark purple glassmorphism design system
* **Icons**: `lucide-react`
* **API Client**: Fetch-based `ApiClient` ([api.js](file:///c:/Users/USER/Desktop/abc/oppora_clone/oppora_clone/frontend/src/api.js)) with automatic SimpleJWT token refresh on `401 Unauthorized` responses and dynamic active workspace header injection.

### Backend Stack
* **Framework**: Django 5.2 + Django REST Framework (DRF)
* **Authentication**: JWT authentication via `djangorestframework-simplejwt`
* **Database**: SQLite (`db.sqlite3` in development)
* **Task Queue**: Celery + Redis (`redis://127.0.0.1:6379/0`) for background jobs
* **API Documentation**: OpenAPI 3.0 schema generation via `drf-spectacular`
* **CORS**: `django-cors-headers`

---

## 2. Multi-Tenant Workspace & Scoping Isolation

The system supports strict workspace segregation (multi-tenancy) so users only interact with data (contacts, leads, deals, activities) belonging to their active selected workspace.

### Workspace Resolution Flow
```
[Frontend Client] (active_org_id in localStorage)
      │
      ├─► Injects HTTP Header: `X-Workspace-Id`
      │
[Django Backend]
      │
      ├─► Permissions & Views (`common.utils.get_active_org`)
      │     ├─► Reads `HTTP_X_WORKSPACE_ID` from request.META
      │     ├─► Verifies user membership in `TeamMember`
      │     └─► Falls back to the user's first organization if header is missing
      │
      └─► Scopes Querysets (`organization=active_org`)
```

* **Backend Helper**: [utils.py](file:///c:/Users/USER/Desktop/abc/oppora_clone/oppora_clone/config/common/utils.py) (`get_active_org`) resolves the active workspace secure context.
* **CORS Allowed Headers**: Django is configured to permit the custom header via `CORS_ALLOW_HEADERS` in [settings.py](file:///c:/Users/USER/Desktop/abc/oppora_clone/oppora_clone/config/config/settings.py).

---

## 3. Database Schema & Models

### Accounts (`accounts`)
* **`User`**: Custom user model extending `AbstractUser`. Uses `email` as the unique username field. Adds a `phone` attribute.

### Organizations & Teams (`organizations`)
* **`Organization`**: Represents a workspace/tenant. Has a `name`, `owner` (ForeignKey to `User`), and `created_at`.
* **`TeamMember`**: Joins `User` to `Organization` with unique roles: `ADMIN`, `MANAGER`, or `MEMBER`.

### Contacts Directory (`contacts`)
* **`Contact`**: A person associated with an `Organization`. Holds `first_name`, `last_name`, `email`, `phone`, `company`, `job_title`, and timestamps.

### Leads Management (`leads`)
* **`Lead`**: An opportunity associated with a `Contact`. 
  * Fields: `contact`, `status` (`NEW`, `CONTACTED`, `QUALIFIED`, `PROPOSAL`, `WON`, `LOST`), `score` (AI score), `notes`.

### Sales Pipeline (`deals`)
* **`Deal`**: A commercial opportunity linked to a `Lead`.
  * Fields: `lead`, `title`, `value` (Decimal), `stage` (`DISCOVERY`, `DEMO`, `NEGOTIATION`, `CLOSED_WON`, `CLOSED_LOST`), `expected_close_date`.

### Task Tracking (`activities`)
* **`Activity`**: An action item or task related to a `Lead`.
  * Fields: `lead`, `activity_type` (`CALL`, `MEETING`, `TASK`, `NOTE`), `title`, `description`, `due_date`, `assigned_to`, `completed`.

### System Notifications (`notifications`)
* **`Notification`**: Real-time alerts for users.
  * Fields: `user`, `title`, `message`, `is_read`, `created_at`.

### File Attachments (`attachments`)
* **`Attachment`**: Uploaded files associated with a `Lead`.
  * Fields: `lead`, `file`, `uploaded_by`, `uploaded_at`.

---

## 4. Key Architectural Modules

### 4.1 Lead & Company Finder
A workflow that lets users discover target companies and look up professional emails at those companies without manual typing.

1. **Company Search**: The backend scrapes search engine criteria (or uses a dynamic template generator if search engine bot captchas block the request) to retrieve company profiles, industries, locations, and domain names.
2. **People Lookup**: Click **Find People** on a company card; the UI switches to the **People** tab, pre-fills the domain, and executes an API lookup (via Hunter.io if key is configured, falling back to a mock result generator) to retrieve contacts.
3. **Import to CRM**: Contacts can be imported directly, which creates a `Contact` and starts a `Lead` in the current active workspace.

### 4.2 Standardized JSON Envelope & Custom Key Preservation
All backend API responses are formatted uniformly using [renderers.py](file:///c:/Users/USER/Desktop/abc/oppora_clone/oppora_clone/config/common/renderers.py) (`GlobalJSONRenderer`):
```json
{
    "success": true,
    "status_code": 200,
    "message": "Request completed successfully",
    "data": {},
    "errors": null,
    "custom_key": "custom_value"
}
```
* **Renderer custom-key preservation**: If a view returns custom keys at the top level (e.g. `"response"` for AI Chat, `"notes"` for Meeting Notes, `"email"` for Sales Drafts), the renderer preserves them so the frontend client reads them correctly.

### 4.3 AI Sales Copilot
Integrates OpenAI's `gpt-4o-mini` to provide:
* **AI Lead Scoring**: Evaluates lead details, history, and notes to assign a score from 1-100.
* **Lead Summary**: Consolidates lead status and notes into a concise executive overview.
* **Sales Email Drafts**: Automatically drafts custom outreach emails based on your sales goals.
* **CRM Chat Copilot**: An interactive assistant that queries qualified leads and pipeline deals in your active workspace to answer questions in real-time.

---

## 5. Backend REST API Endpoints

### Auth & Profile
* `POST /api/accounts/register/` — Registers a new user.
* `POST /api/accounts/login/` — Standard JWT login. Returns access and refresh tokens.
* `GET /api/accounts/profile/` — Retrieves current user profile.
* `POST /api/token/refresh/` — Standard SimpleJWT token refresh.

### Organizations & Teams
* `GET /api/organizations/` — Lists organizations the user belongs to.
* `POST /api/organizations/create/` — Creates a new workspace.
* `GET /api/organizations/stats/` — Workspace contact statistics.
* `POST /api/organizations/members/add/` — Adds a user to a workspace.
* `GET /api/organizations/<org_id>/members/` — Lists team members.

### Contacts Directory
* `GET /api/contacts/` — List contacts in active workspace (supports pagination, search).
* `POST /api/contacts/create/` — Add a contact.
* `PUT /api/contacts/<id>/` — Update contact.
* `DELETE /api/contacts/<id>/delete/` — Delete contact.

### Leads & Sales Funnel
* `GET /api/leads/` — List leads in active workspace (filters by status).
* `POST /api/leads/create/` — Add a lead.
* `PATCH /api/leads/<id>/` — Update status, score, or notes.
* `DELETE /api/leads/<id>/delete/` — Delete lead.

### Deals Pipeline
* `GET /api/deals/` — Get active pipeline deals.
* `POST /api/deals/create/` — Add a new deal (tied to a lead).
* `PATCH /api/deals/<id>/update/` — Update stage, value, or details.
* `POST /api/deals/convert/` — Converts a lead to `WON` and spawns a commercial deal in the pipeline.

### Task Activities
* `GET /api/activities/` — Get list of tasks.
* `POST /api/activities/create/` — Create task/note.
* `PATCH /api/activities/<id>/` — Update task completion state or details.

### AI Sales Assistant
* `POST /api/ai/chat/` — Workspace-scoped database chat copilot.
* `POST /api/ai/email/` — Draft outreach emails for leads.
* `POST /api/ai/lead-summary/` — Get lead overview.
* `POST /api/ai/score/` — Predict lead conversion score.
* `POST /api/ai/meeting-notes/` — Converts unstructured text to clean markdown checklist.

### Lead & Company Finder
* `POST /api/finder/companies/` — Search companies by industry, location, or keywords.
* `POST /api/finder/search/` — Starts email/people lookup.
* `GET /api/finder/search/<id>/status/` — Search polling status.
* `GET /api/finder/history/` — Search query history logs.

---

## 6. Setup & Execution Instructions

### 1. Backend Server Setup
From the project root directory:
1. Activate the Python virtual environment:
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```
2. Navigate to backend directory and start Django development server:
   ```powershell
   cd config
   python manage.py runserver
   ```

### 2. Frontend Server Setup
From the project root directory:
1. Navigate to the `frontend/` directory:
   ```powershell
   cd frontend
   ```
2. Run Vite local development server:
   ```powershell
   npm run dev
   ```

### 3. Celery & Redis Background Workers
Redis must be running locally on port `6379`. To start the Celery worker and the Celery periodic beat scheduler together:
* Double-click [run_celery.bat](file:///c:/Users/USER/Desktop/abc/oppora_clone/oppora_clone/run_celery.bat) in the project root, or execute:
  ```powershell
  .\run_celery.bat
  ```

---
*Document Version: 1.1.0*
