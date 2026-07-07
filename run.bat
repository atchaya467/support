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

:: 3. Start Python AI Service
echo Starting Python AI Service on http://localhost:5000...
start "Python AI Service" cmd /k "cd backend-python && python app.py"

echo.
echo ===================================================
echo   All services have been started in new windows!
echo   Frontend: http://localhost:5173
echo   PHP Backend: http://localhost:8000
echo   Python AI Service: http://localhost:5000
echo ===================================================
echo.
pause
