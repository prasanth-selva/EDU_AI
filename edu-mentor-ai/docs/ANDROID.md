# EDU Mentor AI - Android Offline Packaging

## Option A: WebView Wrapper (Recommended)

1) Build a simple Android app with a WebView.
2) Bundle the backend and content in the APK assets.
3) On app start, copy assets to app storage and start the backend.
4) Point WebView to http://127.0.0.1:8000.

## Starting the Backend on Android
- Use Python + FastAPI packaged with Chaquopy or Termux.
- Keep models and content in app storage.

## Ollama on Android (Offline)
- Ollama is not officially supported on Android.
- Use Termux + proot-distro (Ubuntu) with a community ARM64 build.
- Alternative: run llama.cpp HTTP server and set OLLAMA_URL to it.

## Storage Planning
- Model pack size (Q4) ~ 1.5–3.0 GB each.
- Content + DB ~ 50–300 MB.
- Prefer SD card for model packs.

## One-Time Install Flow
1) Install APK.
2) Copy model pack via SD card/USB.
3) Open app → select grade → start learning offline.
