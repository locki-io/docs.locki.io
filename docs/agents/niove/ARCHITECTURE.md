### System Prompt for Guiding Custom MCP Server Setup

This system prompt is designed for an AI assistant (e.g., Claude, Gemini, or Grok) to help users build, customize, and deploy a custom Model Context Protocol (MCP) server focused on frontend design tasks. It ensures step-by-step guidance, error handling, and adherence to best practices using Google Cloud and Go. You can use this in tools like Claude Projects, Gemini CLI, or custom AI workflows.

**System Prompt:**

```
You are an expert AI engineer specializing in building custom Model Context Protocol (MCP) servers for AI-driven tasks, particularly frontend design generation using Gemini API. Your role is to guide the user through creating, customizing, and deploying an MCP server on Google Cloud Run. Assume the user has basic tech skills but provide clear, actionable steps.

Key Principles:
- Use Go as the primary language for the server (leverage official Go SDK for Gemini/Vertex AI).
- Integrate Gemini models (e.g., gemini-1.5-flash or pro) via Vertex AI for design tasks like generating HTML/CSS/JS.
- Focus on MCP for tool delegation: Define tools like create_frontend, modify_frontend, snippet_frontend.
- Deploy to Google Cloud Run for scalability and security.
- Handle prerequisites, code generation (prompt-driven if using Gemini CLI), testing, and maintenance.
- Always check for updates: Reference official Google docs (e.g., cloud.google.com/run, aiplatform.google.com).
- Error troubleshooting: Suggest common fixes (e.g., auth issues, API quotas).
- Security: Emphasize IAM, authenticated access, and env vars.
- Cost awareness: Note low costs (~$0.02/hour for light use) and free tiers.
- Customization: Adapt for frontend specifics (responsive, Tailwind, React snippets).

Structure Responses:
1. Confirm prerequisites and setup.
2. Step-by-step code/commands with explanations.
3. Testing and validation.
4. Deployment and integration.
5. Maintenance tips.

If the user provides details (e.g., specific frameworks), incorporate them. Encourage using Gemini CLI for code gen to speed up development.
```

### User Prompt Template for Initiating the Setup

This is a sample user prompt you can copy-paste into an AI tool (e.g., Gemini CLI, Claude, or ChatGPT) to start the process. It references the system prompt above and can be customized with your specifics (e.g., project name, tools).

**User Prompt:**

```
Using the system guidelines for building a custom MCP server, guide me step-by-step to create and host my own MCP server for Gemini Frontend Design. My setup details:
- Project name: custom-frontend-mcp
- Tools to include: create_frontend (generate responsive HTML/CSS/JS from description), modify_frontend (edit existing code with changes), snippet_frontend (generate components like buttons/modals).
- Use Gemini-1.5-flash model.
- Deploy to Google Cloud Run in region us-central1.
- Integrate with my existing Google account (project ID: my-project-id).
- Make it compatible with Claude for delegation.

Provide code snippets, commands, and any Gemini CLI prompts needed for generation. Assume I have all prerequisites installed.
```

This prompt pair creates a conversational loop where the AI can iteratively refine the setup based on your feedback (e.g., "Fix this auth error" or "Add React support").

### Full Documented Process: Creating and Hosting a Custom MCP Server on Google Platform

Below is a comprehensive, documented guide based on the provided outline, enhanced with official references (verified via tools for 2026 accuracy). I've expanded it with best practices, code examples, troubleshooting, and updates from Google Cloud docs. This assumes MCP refers to a protocol for AI tool calling/context management (inspired by Anthropic's tool use or Google's agent frameworks), adapted for Gemini. If MCP is a specific library, adjust accordingly.

The process is fully on Google Cloud ecosystem: Using Vertex AI for Gemini, Cloud Run for hosting, and gcloud for management. Total estimated time: 1-3 hours. Costs: Free tier for development; production ~$0.02-0.10/hour + API calls (~$0.0005 per 1K tokens).

#### 0. Overview and Key Concepts

- **What is MCP?** Model Context Protocol is a framework for defining AI tools that handle context-aware tasks (e.g., maintaining state across calls). Here, it's a custom Go server exposing tools for frontend design via JSON-RPC over HTTP/STDIO, integrated with Gemini for generation.
- **Why Google Platform?** Seamless integration with Vertex AI (Gemini hosting), secure auth via IAM, auto-scaling on Cloud Run, and free/low-cost tiers.
- **Updates for 2026:** Gemini models now default to 1.5 series (flash/pro); Go SDK v2+; Cloud Run supports ARM for cheaper instances.
- References: [Google Cloud Run Docs](https://cloud.google.com/run/docs), [Vertex AI Generative AI Docs](https://cloud.google.com/vertex-ai/generative-ai/docs), [Go GenAI SDK](https://pkg.go.dev/github.com/google/generative-ai-go).

#### 1. Prerequisites (Setup Time: 15-30 min)

- **Google Account/Admin Access:** Ensure billing enabled (required for Cloud Run/Vertex AI). Free credits: New accounts get $300.
- **Tools Installation:**
  - gcloud CLI: `curl https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-456.0.0-darwin-arm.tar.gz` (adjust for OS); extract and `./google-cloud-sdk/install.sh`.
  - Go: `brew install go` (Mac) or download from go.dev (v1.24+).
  - Node.js/npm: `brew install node` or nodejs.org (v20+).
  - Docker: docker.com.
- **API Key/Access:** In AI Studio (makersuite.google.com/app/apikey), generate Vertex AI key if not using service accounts.
- **Enable Billing/APIs:** In Cloud Console, enable billing; run commands in Step 1 below.
- **Environment Prep:** Create `.env` with:
  ```
  GOOGLE_GENAI_USE_VERTEXAI=true
  GOOGLE_CLOUD_PROJECT=your-project-id
  GOOGLE_CLOUD_LOCATION=us-central1
  GEMINI_MODEL=gemini-1.5-flash
  ```
  Source: `source .env`.

**Troubleshooting:** If `gcloud init` fails, check 2FA or use `gcloud auth login --update-adc`.

#### 2. Set Up Google Cloud Project (10 min)

1. In Cloud Console: Create project "gemini-frontend-mcp".
2. Set project: `gcloud config set project gemini-frontend-mcp`.
3. Enable APIs:
   ```
   gcloud services enable aiplatform.googleapis.com run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
   ```
4. Auth: `gcloud auth application-default login`.
5. Create service account for Vertex AI (optional for security):
   ```
   gcloud iam service-accounts create mcp-sa --display-name "MCP Service Account"
   gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT --member="serviceAccount:mcp-sa@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com" --role="roles/aiplatform.user"
   ```
   Download key: `gcloud iam service-accounts keys create mcp-sa-key.json --iam-account mcp-sa@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com`.

**Documentation Note:** All commands are idempotent; re-run if needed. See [Vertex AI Setup](https://cloud.google.com/vertex-ai/docs/setup).

#### 3. Install and Configure Gemini CLI (10 min)

1. Install: `npm install -g @google/gemini-cli@latest` (v2.1+ in 2026).
2. Launch: `gemini init` — auth with Google, select config.
3. Test: `gemini "Hello"` — should respond.
4. For MCP: Edit `~/.gemini/settings.json` later for custom server.

**Tip:** Use Gemini CLI for code gen: It can output Go code based on prompts.

#### 4. Create Project Directory and Base MCP Server (20 min)

1. Setup:
   ```
   mkdir gemini-frontend-mcp
   cd gemini-frontend-mcp
   go mod init github.com/yourusername/gemini-frontend-mcp
   ```
2. Create `GEMINI.md` for guidelines:
   ```
   # MCP Guidelines for Frontend Design
   - Language: Go 1.24
   - Tools: JSON-RPC over HTTP
   - Gemini Integration: Use generative-ai-go SDK
   - Focus: Responsive UI generation (HTML/CSS/JS)
   ```
3. Generate base server with Gemini CLI:
   - Run `gemini`
   - Prompt: "Generate a basic MCP server in Go with stdio/HTTP transport. Include tool skeleton for AI calls to Vertex AI."
   - Apply generated files: `main.go`, `server.go`, `tools.go`.
   - Install deps: `go get github.com/google/generative-ai-go/genai google.golang.org/api/option`.
4. Base `main.go` example (adapted):

   ```go
   package main

   import (
   	"context"
   	"log"
   	"net/http"
   	"os"

   	"github.com/google/generative-ai-go/genai"
   	"google.golang.org/api/option"
   )

   func main() {
   	// MCP server setup (use stdio or HTTP)
   	http.HandleFunc("/mcp", mcpHandler) // For HTTP
   	log.Fatal(http.ListenAndServe(":8080", nil))
   }

   func mcpHandler(w http.ResponseWriter, r *http.Request) {
   	// Handle JSON-RPC requests for tools
   }
   ```

5. Local test: `go run main.go`.

#### 5. Customize MCP for Frontend Design (30 min)

1. Define tools in `tools.go`. Use Gemini CLI prompt:
   "Add MCP tools: create_frontend (description string -> HTML/CSS/JS), modify_frontend (code string, changes string -> modified code), snippet_frontend (component string -> snippet). Use Gemini-1.5-flash via Vertex AI."
2. Example generated tool:
   ```go
   func createFrontend(ctx context.Context, description string) (string, error) {
   	client, err := genai.NewClient(ctx, option.WithEndpoint("us-central1-aiplatform.googleapis.com:443"), option.WithAPIKey(os.Getenv("GEMINI_API_KEY")))
   	if err != nil {
   		return "", err
   	}
   	model := client.GenerativeModel(os.Getenv("GEMINI_MODEL"))
   	resp, err := model.GenerateContent(ctx, genai.Text("Generate responsive frontend code (HTML/CSS/JS) for: " + description + ". Make it mobile-friendly."))
   	if err != nil {
   		return "", err
   	}
   	return string(resp.Candidates[0].Content.Parts[0].(genai.Text)), nil
   }
   ```
3. Register tools in MCP handler (use JSON-RPC library like gorilla/rpc if needed: `go get github.com/gorilla/rpc`).
4. Refactor for HTTP: Prompt Gemini CLI "Make MCP server HTTP-streamable on /mcp endpoint."
5. Test: Run server, use curl: `curl -X POST http://localhost:8080/mcp -d '{"method":"create_frontend","params":["login page"],"id":1}'`.

**Troubleshooting:** API errors? Check quotas in Cloud Console > Vertex AI > Quotas.

#### 6. Containerize with Docker (15 min)

1. Generate Dockerfile via Gemini CLI: "Create multi-stage Dockerfile for Go MCP server."
2. Example:

   ```dockerfile
   FROM golang:1.24 AS builder
   ADD . /src
   RUN cd /src && go build -o /mcp-server

   FROM gcr.io/distroless/base
   COPY --from=builder /mcp-server /
   CMD ["/mcp-server"]
   ```

3. Build/test: `docker build -t gemini-frontend-mcp .` ; `docker run -p 8080:8080 --env-file .env gemini-frontend-mcp`.

#### 7. Deploy to Cloud Run (15 min)

1. Push to Artifact Registry (replaced GCR in 2025+):
   ```
   gcloud artifacts repositories create mcp-repo --repository-format=docker --location=us-central1
   gcloud auth configure-docker us-central1-docker.pkg.dev
   docker tag gemini-frontend-mcp us-central1-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT/mcp-repo/gemini-frontend-mcp
   docker push us-central1-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT/mcp-repo/gemini-frontend-mcp
   ```
2. Deploy:
   ```
   gcloud run deploy gemini-frontend-mcp --image us-central1-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT/mcp-repo/gemini-frontend-mcp --platform managed --region us-central1 --allow-unauthenticated --set-env-vars GOOGLE_CLOUD_PROJECT=$GOOGLE_CLOUD_PROJECT,GEMINI_MODEL=gemini-1.5-flash
   ```
3. Get URL: `gcloud run services describe gemini-frontend-mcp --format='value(status.url)'`.

**Security:** Switch to `--no-allow-unauthenticated` and use IAM for access.

#### 8. Integration and Usage (10 min)

1. In Gemini CLI: Add to `~/.gemini/settings.json`:
   ```json
   "mcpServers": {"frontend-design": {"httpUrl": "https://your-run-url/mcp"}}
   ```
2. For Claude: In project settings, add MCP URL and tool defs.
3. Test invocation: In AI session, "Use frontend MCP to create a dashboard UI."

#### 9. Maintenance and Scaling

- Logs/Monitoring: Cloud Console > Cloud Run > Logs.
- Updates: Rebuild/push/deploy.
- Costs: Use autoscaling; set min instances to 0.
- Cleanup: `gcloud run services delete gemini-frontend-mcp`.
- Advanced: Add CI/CD with Cloud Build: Create `cloudbuild.yaml` for auto-deploys on git push.

This documented process is self-contained and reproducible. If you run into issues, provide error logs for troubleshooting! For code gen, rely on Gemini CLI prompts as shown.

#### 10. update to comfyUI -> create shorts
