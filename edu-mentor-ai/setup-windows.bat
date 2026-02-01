@echo off
REM EDU MENTOR AI - Quick Setup Script for Windows
REM This script installs all dependencies and sets up the system

echo ================================================================
echo EDU MENTOR AI - Tamil Nadu Students Offline AI Tutor
echo ================================================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo WARNING: Running as Administrator
    echo This script should run as regular user
    echo Please close and run without admin privileges
    pause
    exit /b 1
)

echo Step 1/6: Checking system requirements...

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo Python not found!
    echo Please install Python 3.10+ from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)

echo [OK] Python installed
echo.

echo Step 2/6: Installing Ollama (AI Engine)...

REM Check if Ollama is installed
where ollama >nul 2>&1
if errorlevel 1 (
    echo Downloading Ollama...
    echo Please download and install Ollama from:
    echo https://ollama.com/download/windows
    echo.
    echo Press any key after installation...
    pause
    exit /b 1
) else (
    echo [OK] Ollama already installed
)

REM Start Ollama
echo Starting Ollama...
start /B ollama serve
timeout /t 5 /nobreak >nul

echo.
echo Step 3/6: Downloading AI Models (this may take 5-10 minutes)...

REM Download Phi-3 Mini
ollama list | findstr "phi3:mini" >nul 2>&1
if errorlevel 1 (
    echo Downloading Phi-3 Mini (2.5GB)...
    ollama pull phi3:mini
    echo [OK] Phi-3 Mini downloaded
) else (
    echo [OK] Phi-3 Mini already available
)

REM Optional: Gemma2
set /p DOWNLOAD_GEMMA="Download Gemma2:2b for younger students? (lighter model, 1.5GB) [y/N]: "
if /i "%DOWNLOAD_GEMMA%"=="y" (
    ollama list | findstr "gemma2:2b" >nul 2>&1
    if errorlevel 1 (
        ollama pull gemma2:2b
        echo [OK] Gemma2 downloaded
    )
)

echo.
echo Step 4/6: Setting up Python environment...

cd backend

REM Create virtual environment
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Upgrade pip
python -m pip install --upgrade pip

REM Install dependencies
echo Installing Python packages...
pip install -r requirements.txt

REM Install RAG dependencies
set /p INSTALL_RAG="Install RAG dependencies for better accuracy? (requires 500MB) [Y/n]: "
if /i not "%INSTALL_RAG%"=="n" (
    pip install -r requirements-rag.txt
    echo [OK] RAG dependencies installed
)

echo.
echo Step 5/6: Building knowledge base...

REM Create data directories
if not exist "data\lessons" mkdir data\lessons
if not exist "data" mkdir data

REM Index content
echo Indexing lesson content...
python -c "try:^
    from app.services.rag_engine import get_rag_engine;^
    rag = get_rag_engine();^
    rag.index_content(force_rebuild=True);^
    print('[OK] Knowledge base created')^
except Exception as e:^
    print('Warning:', e)"

echo.
echo Step 6/6: Verifying frontend...

cd ..\frontend
if not exist "index-child.html" (
    echo [ERROR] Frontend files missing
    pause
    exit /b 1
)
echo [OK] Frontend ready

cd ..

echo.
echo ================================================================
echo INSTALLATION COMPLETE!
echo ================================================================
echo.
echo To start EDU Mentor AI:
echo.
echo   1. Double-click: start.bat
echo.
echo   2. Or manually:
echo      - Open Command Prompt
echo      - cd backend
echo      - venv\Scripts\activate
echo      - python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
echo.
echo   3. Open browser: http://localhost:8000/index-child.html
echo.
echo For detailed documentation, see DEPLOYMENT.md
echo.
echo Happy Learning!
echo.

REM Create start script
(
echo @echo off
echo cd /d "%%~dp0"
echo.
echo echo Starting Ollama...
echo start /B ollama serve
echo timeout /t 3 /nobreak ^>nul
echo.
echo echo Starting backend...
echo cd backend
echo call venv\Scripts\activate.bat
echo start /B python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
echo.
echo timeout /t 3 /nobreak ^>nul
echo.
echo echo Opening browser...
echo start http://localhost:8000/index-child.html
echo.
echo echo EDU Mentor AI is running!
echo echo Press Ctrl+C to stop
echo.
echo pause
) > start.bat

echo Created start.bat for quick launch
echo.
pause
