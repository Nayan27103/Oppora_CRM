# Oppora CRM Clone Documentation

## Project Overview

Oppora CRM Clone is a Django-based CRM backend paired with a React + Vite frontend. It provides core CRM features including organizations, contacts, leads, deals, activities, notifications, attachments, and an AI assistant powered by OpenAI.

## Repository Structure

- `config/`: Django project and backend apps.
  - `config/config/`: Django settings, URLs, ASGI, WSGI, and management command.
  - `accounts/`: Custom user model, authentication, registration, login, profile.
  - `organizations/`: Organizations, team members, organization stats.
  - `contacts/`: Contact management.
  - `leads/`: Lead management.
  - `activities/`: Activity/task tracking for leads.
  - `deals/`: Deal management and lead-to-deal conversion.
  - `attachments/`: File upload and attachment listing.
  - `notifications/`: Notification CRUD and read state.
  - `dashboard/`: CRM summary and metrics.
  - `ai_assistant/`: AI-powered email generation, lead summaries, meeting notes, lead scoring, chat assistant.
  - `common/`: Shared middleware, permissions, pagination, response handling.
- `frontend/`: React + Vite frontend application.
  - `src/`: React components and API client.
  - `public/`: Static assets.
  - `package.json`: Frontend dependencies and scripts.
- `requirements.txt`: Python dependencies for the Django backend.
- `db.sqlite3`: SQLite database file.
- `venv/`: Python virtual environment (local development environment files).

## Backend Architecture

### Django Configuration

- Django project root: `config/config/`
- Main settings file: `config/config/settings.py`
- Main routing: `config/config/urls.py`
- Custom user model: `accounts.models.User`
- Authentication: JWT via `rest_framework_simplejwt`
- API docs: `drf_spectacular`
- CORS: `django-cors-headers` with `CORS_ALLOW_ALL_ORIGINS = True`
- Database: SQLite at `db.sqlite3`
- Media files: served in debug mode from `MEDIA_URL = /media/`
- OpenAI key: loaded from environment variable `OPENAI_API_KEY`

### Installed Apps

- `accounts`
- `organizations`
- `contacts`
- `leads`
- `activities`
- `dashboard`
- `ai_assistant`
- `notifications`
- `deals`
- `attachments`
- `common`

### Authentication

- Registration: `POST /api/accounts/register/`
- Login: `POST /api/accounts/login/`
- Profile: `GET /api/accounts/profile/`
- Token refresh: `POST /api/token/refresh/`

### API Endpoints

#### Accounts

- `POST /api/accounts/register/`
- `POST /api/accounts/login/`
- `GET /api/accounts/profile/`

#### Organizations

- `POST /api/organizations/create/`
- `GET /api/organizations/`
- `POST /api/organizations/members/add/`
- `GET /api/organizations/<int:organization_id>/members/`
- `GET /api/organizations/stats/`

#### Contacts

- `POST /api/contacts/create/`
- `GET /api/contacts/`
- `PUT /api/contacts/<int:pk>/`
- `DELETE /api/contacts/<int:pk>/delete/`
- `POST /api/contacts/bulk-create/`

#### Leads

- `POST /api/leads/create/`
- `GET /api/leads/`
- `PATCH /api/leads/<int:pk>/`
- `DELETE /api/leads/<int:pk>/delete/`
- `PATCH /api/leads/bulk-update/`

#### Activities

- `POST /api/activities/create/`
- `GET /api/activities/`
- `PATCH /api/activities/<int:pk>/`
- `DELETE /api/activities/<int:pk>/delete/`

#### Dashboard

- `GET /api/dashboard/`

#### AI Assistant

- `POST /api/ai/email/`
- `POST /api/ai/lead-summary/`
- `POST /api/ai/meeting-notes/`
- `POST /api/ai/score/`
- `POST /api/ai/chat/`

#### Notifications

- `GET /api/notifications/`
- `PATCH /api/notifications/<int:pk>/read/`
- `PATCH /api/notifications/read-all/`
- `DELETE /api/notifications/<int:pk>/delete/`

#### Attachments

- `POST /api/attachments/upload/`
- `GET /api/attachments/lead/<int:lead_id>/`

#### Deals

- `GET /api/deals/`
- `POST /api/deals/create/`
- `PATCH /api/deals/<int:pk>/update/`
- `DELETE /api/deals/<int:pk>/delete/`
- `POST /api/deals/convert/`

### Backend Models Summary

- `accounts.User`
  - Extends `AbstractUser`
  - Uses `email` as unique login field
  - Adds `phone`
- `organizations.Organization`
  - `name`, `owner`, `created_at`
- `organizations.TeamMember`
  - `organization`, `user`, `role`, `created_at`
- `contacts.Contact`
  - `organization`, `first_name`, `last_name`, `email`, `phone`, `company`, `job_title`
- `leads.Lead`
  - `contact`, `status`, `score`, `notes`, `created_at`, `updated_at`
- `activities.Activity`
  - `lead`, `activity_type`, `title`, `description`, `due_date`, `assigned_to`, `completed`
- `deals.Deal`
  - `lead`, `title`, `value`, `stage`, `expected_close_date`
- `attachments.Attachment`
  - `lead`, `file`, `uploaded_by`, `uploaded_at`
- `notifications.Notification`
  - `user`, `title`, `message`, `is_read`, `created_at`

### AI Assistant

The AI assistant uses `openai.OpenAI` with `gpt-4o-mini`.

- `generate_ai_response(prompt)` sends prompts to OpenAI.
- AI endpoints convert CRM data into email drafts, lead summaries, scores, meeting notes, and chat responses.
- `AIChatView` creates prompts from qualified leads and deals, but currently uses all deals from the database.

## Frontend Architecture

### Frontend Stack

- React 19
- Vite 8
- ESLint
- `lucide-react` for icons

### Main frontend files

- `frontend/src/App.jsx` - application shell, auth handling, sidebar, view switching, notifications polling, user state.
- `frontend/src/api.js` - API client for backend integration, token persistence, refresh logic.
- `frontend/src/components/` - individual UI views for dashboard, organizations, contacts, leads, deals, activities, AI assistant, notifications.
- `frontend/package.json` - scripts to run and build the frontend.

### Frontend features

- Authentication with JWT access and refresh tokens.
- Profile fetching and organization selection.
- Sidebar navigation and responsive UI state.
- Notifications polling every 10 seconds.
- API client handles token refresh automatically on 401 responses.
- CRUD operations for contacts, leads, activities, deals, and attachments.
- AI Assistant interface for chat, email generation, lead summaries, score prediction, and meeting notes conversion.

### Frontend API mappings

The frontend `api.js` maps to backend endpoints using:
- `api.login`, `api.register`, `api.getProfile`
- `api.getOrganizations`, `api.createOrganization`, `api.getTeamMembers`, `api.addTeamMember`
- `api.getContacts`, `api.createContact`, `api.updateContact`, `api.deleteContact`, `api.bulkCreateContacts`
- `api.getLeads`, `api.createLead`, `api.updateLead`, `api.deleteLead`, `api.bulkUpdateLeads`
- `api.getDeals`, `api.createDeal`, `api.updateDeal`, `api.deleteDeal`, `api.convertLeadToDeal`
- `api.getActivities`, `api.createActivity`, `api.updateActivity`, `api.deleteActivity`
- `api.getNotifications`, `api.readNotification`, `api.readAllNotifications`, `api.deleteNotification`
- `api.getAttachments`, `api.uploadAttachment`
- `api.aiChat`, `api.generateEmail`, `api.getLeadSummary`, `api.getLeadScore`, `api.convertMeetingNotes`

## Dependencies

### Backend

Defined in `requirements.txt`:

- Django
- djangorestframework
- djangorestframework-simplejwt
- django-cors-headers
- drf-spectacular
- python-decouple

### Frontend

Defined in `frontend/package.json`:

- react
- react-dom
- lucide-react
- vite
- @vitejs/plugin-react
- eslint and related plugins

## Setup & Run Instructions

1. Backend
   - From `oppora_clone/oppora_clone`:
     - Create and activate a Python virtual environment.
     - Install dependencies: `pip install -r requirements.txt`
     - Set `OPENAI_API_KEY` in your environment.
     - Run database migrations: `python config/manage.py migrate`
     - Optionally create a superuser: `python config/manage.py createsuperuser`
     - Start backend server: `python config/manage.py runserver`

2. Frontend
   - From `oppora_clone/oppora_clone/frontend`:
     - Install packages: `npm install`
     - Start dev server: `npm run dev`
     - Build for production: `npm run build`

3. Access
   - Backend API: `http://localhost:8000/`
   - API docs: `http://localhost:8000/api/docs/`
   - Swagger: `http://localhost:8000/api/docs/`
   - Redoc: `http://localhost:8000/api/redoc/`
   - Frontend app: Vite dev server URL shown by `npm run dev`

## Notes and Observations

- `DEBUG` is enabled and `SECRET_KEY` is hard-coded in `config/config/settings.py`; this should be secured for production.
- Celery configuration in `settings.py` defines Redis URLs but then overwrites them to use in-memory transport.
- `AIChatView` currently constructs prompt data from all deals instead of only the user’s organization-specific deals.
- `notifications/views.py` contains debugging `print()` statements.
- The app relies on `CORS_ALLOW_ALL_ORIGINS = True`, which is convenient for development but should be restricted in production.

## Important Files

- `config/config/settings.py`
- `config/config/urls.py`
- `config/config/manage.py`
- `config/accounts/models.py`
- `config/accounts/views.py`
- `config/ai_assistant/views.py`
- `config/ai_assistant/services.py`
- `frontend/src/App.jsx`
- `frontend/src/api.js`

---

This document summarizes the current project structure, features, backend API surface, frontend architecture, and setup instructions for the Oppora CRM Clone.
