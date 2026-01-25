No, **you cannot customize the ERR_NGROK_3200 page** itself to show a Discord invitation (or any custom content).

This error page is generated directly by ngrok's edge servers when:

- No ngrok agent is currently online/connected for that endpoint, **or**
- The tunnel was never started for that particular reserved domain/subdomain.

It's an "endpoint not found" / "tunnel not found" type error, controlled entirely by ngrok — not by any traffic policy or upstream response.

### What you _can_ customize (but only in other situations)

ngrok added support for **custom error pages** (around 2024–2025) via **Traffic Policies** on **Cloud Edge** / **Cloud Endpoints** (the newer dashboard-driven system).

You can create nice branded 502/503/504-style pages when:

- The agent _is_ connected,
- But the upstream service (your local app) is down, times out, refuses connection, etc.

Example setup that works today:

1. Reserve your domain in the ngrok dashboard (Cloud Edge → Domains)
2. Create a **Cloud Endpoint** attached to that domain
3. Attach a Traffic Policy with something like:

   ```
   on_http_request:
     - actions:
         - type: forward-internal
           config:
             url: https://service.internal   # or http://localhost:yourport if using agent
           on_error: continue
         - type: custom-response
           config:
             status_code: 503
             headers:
               content-type: text/html
             body: |
               <!DOCTYPE html>
               <html>
               <head><title>Service Offline</title></head>
               <body>
                 <h1>Temporarily unavailable</h1>
                 <p>Please join our Discord to get access / be notified when it's back:</p>
                 <a href="https://discord.gg/your-invite">Join Discord →</a>
               </body>
               </html>
   ```

This gives you a custom page on 503 instead of the default ngrok 502 branded page — but **only when the agent is running**.

### For your specific ERR_NGROK_3200 case

You have two realistic options:

| Option                                 | How                                                                                                                                                                     | Pros                                                       | Cons                                           |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------- |
| 1. Keep agent always running           | Use `ngrok start --all` + authtoken, or Docker + restart policy, systemd service, etc.                                                                                  | No 3200 ever (as long as machine is up)                    | Machine must stay on 24/7, uses resources      |
| 2. Use a tiny always-on proxy in front | Cloudflare Tunnel, Bore, Tailscale Funnel, Pinggy, or even a €3/mo cheap VPS running Caddy/NGINX that reverse-proxies to ngrok and shows custom page when ngrok is down | Full control over "ngrok is offline" page + Discord invite | Extra layer, slightly more latency, setup work |
| 3. Accept the default page             | —                                                                                                                                                                       | Zero work                                                  | Looks unprofessional, no Discord link          |

Most people doing public-facing demos or semi-permanent tunnels eventually move to option 2 (Cloudflare Tunnel is especially popular because it's free for most use-cases and gives you total control over error pages).

If your use-case is very temporary/dev-only → just live with the 3200 page and make sure people know to ping you on Discord when they see it.

If this is something you want running more reliably → Cloudflare Tunnel or similar is usually the cleaner long-term answer in 2026.
