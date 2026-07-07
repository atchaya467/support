@echo off
echo ===================================================
echo   STARTING SUPPORT TICKET PORTAL SYSTEM
echo ===================================================
echo.

:: 1. Start React Frontend (Vite)
echo Starting React Frontend on http://localhost:5173...
start "React Frontend" cmd /k "cd frontend && npm run dev"

:: 2. Start PHP Backend
echo Starting PHP Backend on http://localhost:8000...
start "PHP Backend" cmd /k "cd backend-php && php -S localhost:8000"

echo.
echo ===================================================
echo   All services have been started in new windows!
echo   Frontend: http://localhost:5173
echo   PHP Backend: http://localhost:8000
echo ===================================================
echo.
pause
