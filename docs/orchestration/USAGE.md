scripts/ngrok.sh - Bash script that:

1. Loads N8N_PORT from .env (defaults to 5678)
2. Starts docker compose in detached mode
3. Waits for n8n to be healthy (up to 60s)
4. Starts ngrok tunnel on the port
5. Copies the public URL to clipboard (via pbcopy)

tasks.json - Updated with 3 tasks:

- Docker + ngrok tunnel - runs the script
- Docker compose up - quick start containers
- Docker compose down - stop containers

launch.json - Added 2 compound configurations:

- Docker + ngrok (n8n tunnel) - just runs the script
- Streamlit + Docker + ngrok - runs Streamlit + docker + ngrok

To use:

1. From VS Code: Run > Start Debugging > select Docker + ngrok (n8n tunnel)
2. Or from terminal: ./scripts/ngrok.sh

The ngrok URL will auto-copy to your clipboard when the tunnel is established
