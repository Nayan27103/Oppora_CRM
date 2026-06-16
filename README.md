# Oppora Clone

A Django + React CRM clone built with:
- Django REST Framework
- Django Simple JWT
- DRF Spectacular
- React + Vite frontend
- OpenAI email generation integration

## Repository Layout

- `config/` - Django backend project and apps
- `frontend/` - React frontend app
- `requirements.txt` - Python dependencies
- `.env` - environment variables (not checked in)

## Setup

1. Clone the repository:

   ```bash
   git clone <your-repo-url>
   cd oppora_clone
   ```

2. Create and activate a Python virtual environment:

   ```bash
   python -m venv venv
   .\venv\Scripts\Activate.ps1   # PowerShell
   # or
   .\venv\Scripts\activate.bat  # Command Prompt
   ```

3. Install backend dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Install frontend dependencies:

   ```bash
   cd frontend
   npm install
   cd ..
   ```

## Configuration

Create a `.env` file in the project root with at least the following:

```env
OPENAI_API_KEY=your_openai_api_key
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_HOST=localhost
EMAIL_PORT=1025
DEFAULT_FROM_EMAIL=noreply@oppora.local
```

## Database

Run migrations:

```bash
python config/manage.py migrate
```

Create a superuser if needed:

```bash
python config/manage.py createsuperuser
```

## Running the App

Start the backend:

```bash
python config/manage.py runserver
```

'''celery  run
celery -A config worker --loglevel=info --pool=solo
celery -A config worker --loglevel=info --pool=solo -Q celery,notifications,emails,ai
'''


Start the frontend:

```bash
cd frontend
npm run dev


cd frontend

npm install @mui/material @emotion/react @emotion/styled
```

## Auth and Email

- Login is email-based using the custom `accounts.User` model
- Backend auth endpoints are under `/api/accounts/`
- Email notifications are sent using Django email settings

## GitHub Push

1. Initialize Git if not already initialized:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Add remote and push:

   ```bash
   git remote add origin <your-github-url>
   git branch -M main
   git push -u origin main
   ```

## Notes

- `db.sqlite3` and `.env` are ignored by `.gitignore`
- The frontend has its own `README.md` and `.gitignore` under `frontend/`
