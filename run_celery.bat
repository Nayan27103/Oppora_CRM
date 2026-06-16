@echo off
echo ===================================================
echo Starting Oppora CRM Celery Services
echo ===================================================

echo Starting Celery Worker...
start "Celery Worker" cmd /k "cd config && ..\venv\Scripts\activate && celery -A config worker --loglevel=info --pool=solo -Q celery,notifications,emails,ai"

echo Starting Celery Beat Scheduler...
start "Celery Beat" cmd /k "cd config && ..\venv\Scripts\activate && celery -A config beat --loglevel=info"

echo Celery Services started in separate windows!
pause
