# 🖥️ EDU MENTOR AI - DESKTOP BUILD GUIDE

This document explains how to create **one-click installers** for Linux and Windows that bundle everything needed for offline operation.

---

## 🎯 Overview

Desktop deployment packages include:
- ✅ Python FastAPI backend
- ✅ Ollama + AI models (auto-download or pre-bundled)
- ✅ Web frontend (served locally)
- ✅ SQLite databases
- ✅ Auto-start scripts
- ✅ System tray integration
- ✅ No internet required after install

---

## 📋 Build Tools

### For Linux `.deb` / `.AppImage`
- **PyInstaller** (bundle Python app)
- **fpm** (create .deb packages)
- **AppImageKit** (create AppImage)

### For Windows `.exe` installer
- **PyInstaller** (bundle Python app)
- **Inno Setup** (create installer)
- **NSIS** (alternative)

---

## 🛠️ Step 1: Prepare Backend for Bundling

### Create standalone executable

```bash
cd edu-mentor-ai/backend

# Install PyInstaller
pip install pyinstaller

# Create spec file
pyinstaller --onefile --name edumentor-backend \
  --hidden-import uvicorn \
  --hidden-import fastapi \
  --hidden-import sqlalchemy \
  --hidden-import pydantic \
  --add-data "app:app" \
  --add-data "data:data" \
  app/main.py
```

This creates `dist/edumentor-backend` (single executable).

---

## 🐧 Step 2: Linux Installer (Ubuntu/Debian)

### Structure
```
edu-mentor-linux/
├── edumentor-backend          # Bundled Python app
├── ollama                     # Ollama binary
├── models/                    # AI models
│   └── phi3-mini.gguf
├── frontend/                  # Web files
│   ├── index-child.html
│   ├── app-child.js
│   └── styles-child.css
├── start.sh                   # Launch script
├── install.sh                 # Installation script
└── edumentor.desktop          # Desktop shortcut
```

### Create `start.sh`
```bash
#!/bin/bash

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

# Start Ollama in background
./ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to start
sleep 3

# Load model
./ollama pull phi3:mini

# Start backend
./edumentor-backend &
BACKEND_PID=$!

# Wait for backend
sleep 2

# Open browser
xdg-open http://localhost:8000/index-child.html

# Wait for processes
wait $OLLAMA_PID $BACKEND_PID
```

### Create `install.sh`
```bash
#!/bin/bash

echo "📚 Installing EDU Mentor AI..."

# Install to /opt
sudo mkdir -p /opt/edu-mentor-ai
sudo cp -r * /opt/edu-mentor-ai/
sudo chmod +x /opt/edu-mentor-ai/start.sh
sudo chmod +x /opt/edu-mentor-ai/edumentor-backend
sudo chmod +x /opt/edu-mentor-ai/ollama

# Create desktop entry
cat > ~/.local/share/applications/edumentor.desktop <<EOF
[Desktop Entry]
Name=EDU Mentor AI
Comment=Offline AI Tutor for Tamil Nadu Students
Exec=/opt/edu-mentor-ai/start.sh
Icon=/opt/edu-mentor-ai/icon.png
Terminal=false
Type=Application
Categories=Education;
EOF

# Create start menu entry
sudo cp ~/.local/share/applications/edumentor.desktop /usr/share/applications/

echo "✅ Installation complete!"
echo "🚀 Launch from Applications menu or run: /opt/edu-mentor-ai/start.sh"
```

### Build `.deb` package

```bash
# Install fpm
sudo apt install ruby-dev build-essential
sudo gem install fpm

# Create package
fpm -s dir -t deb \
  -n edu-mentor-ai \
  -v 1.0.0 \
  --description "Offline AI Tutor for Tamil Nadu Students (LKG-6th)" \
  --url "https://github.com/yourusername/edu-mentor-ai" \
  --maintainer "Your Name <your@email.com>" \
  --license "MIT" \
  --after-install install.sh \
  edu-mentor-linux/=/opt/edu-mentor-ai

# Output: edu-mentor-ai_1.0.0_amd64.deb
```

### Install:
```bash
sudo dpkg -i edu-mentor-ai_1.0.0_amd64.deb
```

---

## 🪟 Step 3: Windows Installer

### Structure
```
edu-mentor-windows/
├── edumentor-backend.exe      # Bundled Python app
├── ollama.exe                 # Ollama Windows binary
├── models/                    # AI models
├── frontend/                  # Web files
├── start.bat                  # Launch script
└── setup.iss                  # Inno Setup script
```

### Create `start.bat`
```batch
@echo off
cd /d "%~dp0"

REM Start Ollama
start /B ollama.exe serve
timeout /t 3

REM Load model
ollama.exe pull phi3:mini

REM Start backend
start /B edumentor-backend.exe

REM Open browser
timeout /t 2
start http://localhost:8000/index-child.html

pause
```

### Create Inno Setup script `setup.iss`

```ini
[Setup]
AppName=EDU Mentor AI
AppVersion=1.0
DefaultDirName={pf}\EDU Mentor AI
DefaultGroupName=EDU Mentor AI
OutputBaseFilename=EDUMentorAI-Setup
Compression=lzma2
SolidCompression=yes

[Files]
Source: "edumentor-backend.exe"; DestDir: "{app}"
Source: "ollama.exe"; DestDir: "{app}"
Source: "frontend\*"; DestDir: "{app}\frontend"; Flags: recursesubdirs
Source: "models\*"; DestDir: "{app}\models"; Flags: recursesubdirs
Source: "start.bat"; DestDir: "{app}"

[Icons]
Name: "{group}\EDU Mentor AI"; Filename: "{app}\start.bat"; IconFilename: "{app}\icon.ico"
Name: "{commondesktop}\EDU Mentor AI"; Filename: "{app}\start.bat"; IconFilename: "{app}\icon.ico"

[Run]
Filename: "{app}\start.bat"; Description: "Launch EDU Mentor AI"; Flags: postinstall nowait
```

### Build installer

1. Install [Inno Setup](https://jrsoftware.org/isinfo.php)
2. Open `setup.iss` in Inno Setup Compiler
3. Build → Compile
4. Output: `EDUMentorAI-Setup.exe`

---

## 🚀 Step 4: Auto-Start on Boot (Optional)

### Linux (systemd)

Create `/etc/systemd/system/edumentor.service`:
```ini
[Unit]
Description=EDU Mentor AI Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/edu-mentor-ai
ExecStart=/opt/edu-mentor-ai/start.sh
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable edumentor
sudo systemctl start edumentor
```

### Windows (Task Scheduler)

```batch
schtasks /create /tn "EDU Mentor AI" /tr "C:\Program Files\EDU Mentor AI\start.bat" /sc onlogon /rl highest
```

---

## 📦 Step 5: Offline Model Bundling

### Download models:
```bash
ollama pull phi3:mini
ollama pull gemma2:2b
```

### Export models:
```bash
# Find model location
ollama show phi3:mini --modelfile

# Copy to bundle
cp ~/.ollama/models/blobs/sha256-* ./models/phi3-mini.gguf
```

### Auto-load in app:
Modify backend startup to check if model exists locally:
```python
import subprocess
import os

MODEL_DIR = Path(__file__).parent / "models"
if MODEL_DIR.exists():
    os.environ["OLLAMA_MODELS"] = str(MODEL_DIR)
```

---

## 🎓 Deployment Strategy for Rural Schools

### USB Drive Distribution
```
EDU_MENTOR_USB/
├── README_TAMIL.txt          # Tamil installation guide
├── README_ENGLISH.txt        # English installation guide
├── INSTALL_LINUX.deb         # Linux installer
├── INSTALL_WINDOWS.exe       # Windows installer
├── models/                   # Pre-downloaded models (2GB)
└── videos/                   # Video tutorials in Tamil
```

### Installation Steps (Simplified for Teachers)

**Linux:**
1. Insert USB drive
2. Double-click `INSTALL_LINUX.deb`
3. Click "Install"
4. Launch from Applications menu

**Windows:**
1. Insert USB drive
2. Double-click `INSTALL_WINDOWS.exe`
3. Click "Next" → "Install"
4. Double-click desktop icon

---

## 🔧 Advanced: System Tray App

### Python system tray (cross-platform)

```bash
pip install pystray pillow
```

```python
# tray.py
from pystray import Icon, MenuItem, Menu
from PIL import Image
import subprocess

def start_backend():
    subprocess.Popen(["./edumentor-backend"])

def stop_backend():
    # Kill backend process
    pass

def create_image():
    return Image.open("icon.png")

menu = Menu(
    MenuItem("Start Backend", start_backend),
    MenuItem("Stop Backend", stop_backend),
    MenuItem("Open App", lambda: subprocess.Popen(["xdg-open", "http://localhost:8000"])),
    MenuItem("Quit", lambda icon: icon.stop())
)

icon = Icon("EDU Mentor", create_image(), "EDU Mentor AI", menu)
icon.run()
```

---

## 📊 Installer Sizes

| Platform | Without Models | With Models | Download Time (2G) |
|----------|---------------|-------------|-------------------|
| Linux    | ~50MB         | ~2.5GB      | ~20 minutes       |
| Windows  | ~60MB         | ~2.6GB      | ~22 minutes       |

### Optimization:
- Compress models: `gzip phi3-mini.gguf`
- Split installer: base (50MB) + models (2.5GB)
- Torrent distribution for schools

---

## ✅ Testing Checklist

- [ ] Installer runs on clean system
- [ ] Backend starts automatically
- [ ] Ollama loads model
- [ ] Frontend accessible at localhost:8000
- [ ] All features work offline
- [ ] No internet errors
- [ ] Desktop shortcut works
- [ ] Uninstaller removes all files

---

## 🆘 Troubleshooting

### Backend won't start
```bash
# Check logs
tail -f /opt/edu-mentor-ai/backend.log
```

### Ollama not found
```bash
# Verify binary
ls -lh /opt/edu-mentor-ai/ollama
chmod +x /opt/edu-mentor-ai/ollama
```

### Port 8000 already in use
```bash
# Find and kill process
lsof -ti:8000 | xargs kill -9
```

---

## 📚 Resources

- [PyInstaller Docs](https://pyinstaller.org)
- [Inno Setup](https://jrsoftware.org/isinfo.php)
- [Electron (Alternative)](https://www.electronjs.org)

---

**Ready for deployment in Tamil Nadu schools! 🎓**
