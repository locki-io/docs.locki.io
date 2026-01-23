# Streamlit Quick Start - Fix 403 WebSocket Error

Quick fix for "You need to enable JavaScript" and 403 WebSocket errors.

## The Problem

Your Streamlit app loads but doesn't work because:
- WebSocket connections (`/_stcore/stream`) return 403 Forbidden
- Streamlit is blocking connections from `ocapistaine.vaettir.locki.io`

## Quick Fix (5 minutes)

### 1. Create Streamlit Config

In your ocapistaine directory:

```bash
cd ~/dev/ocapistaine
mkdir -p .streamlit
cat > .streamlit/config.toml << 'EOF'
[server]
enableCORS = true
enableXsrfProtection = false
port = 8050
address = "0.0.0.0"
headless = true
allowedOrigins = [
    "https://ocapistaine.vaettir.locki.io",
    "https://ocapistaine.ngrok-free.app",
    "http://localhost:8050"
]

[browser]
gatherUsageStats = false
serverAddress = "ocapistaine.vaettir.locki.io"
serverPort = 443
EOF
```

### 2. Restart Your App

```bash
# If running in Docker
docker compose restart

# If running directly
# Press Ctrl+C and restart:
streamlit run app.py
```

### 3. Reload Browser

Visit https://ocapistaine.vaettir.locki.io and it should now work!

## Verify It Works

Open browser DevTools (F12) → Network tab:
- Look for `/_stcore/stream` WebSocket
- Should show status `101 Switching Protocols` ✅
- NOT `403 Forbidden` ❌

## If Still Not Working

See full troubleshooting guide: [STREAMLIT_SETUP.md](./STREAMLIT_SETUP.md)

### Common Issues:

**Still 403?**
```bash
# Check config is loaded
cat .streamlit/config.toml

# Try wildcard (testing only)
echo "allowedOrigins = [\"*\"]" >> .streamlit/config.toml
```

**App crashed?**
```bash
# Check if running
curl http://localhost:8050/_stcore/health

# Restart
docker compose restart
```

**ngrok stopped?**
```bash
# Restart ngrok
ngrok http 8050 --domain=ocapistaine.ngrok-free.app
```
