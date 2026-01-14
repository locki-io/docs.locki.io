### Current Manual Process for Handling Contributions

The existing workflow is fully manual, relying on human oversight to ensure compliance and processing:

1. **Submission**: Citizens anonymously submit ideas, proposals, or contributions via email to `audierne2026@gmail.com`. No direct web form exists yet, so email acts as the entry point.

2. **Manual Review (Garde-Fou Step)**: You personally check each incoming email against the project's **charte** (guidelines for neutrality, constructiveness, no toxicity, relevance to local issues, etc.). This involves reading the content, verifying compliance, and filtering out non-conforming submissions.

3. **Documentation of Compliant Contributions**: For those that pass the charte check:

   - You copy-paste the content into a new GitHub issue in the repo `audierne2026/participons`.
   - You label or mark the issue as "conforme charte" to indicate it has been moderated.

4. **Creative Processing (Ocapistaine Step)**: Once marked compliant, you manually feed the contribution into the **ocapistaine** system (your emerging creative AI agent) for enrichment—e.g., generating suggestions, cross-referencing with local knowledge or external commune success stories, and producing an automated response or enhanced proposal.

This process ensures high-quality, guideline-aligned input but is time-intensive, scales poorly with volume, and depends entirely on your availability for review and processing.

### Evolved Automated Process (Using the Discussed Stack)

Leveraging the stack we've been building—**FastAPI** (backend/API), **n8n** (workflow orchestration and multi-agent logic), **Opik** (tracing, evaluations, and moderation metrics), **hybrid LLM setup** (local models for sensitive data + Mistral/cloud for advanced reasoning), and **ocapistaine** repo (crawling + creative agent)—we can automate most steps while preserving (and enhancing) privacy, moderation rigor, and creativity.

The goal: Shift to a **semi- or fully automated pipeline** with human-in-the-loop only for edge cases. Data privacy remains paramount—sensitive/personal contributions stay processed locally where possible, with triage before any cloud interaction.

#### Key Stack Components in the Evolution

- **FastAPI**: Exposes secure endpoints (e.g., for web form submissions or API triggers).
- **n8n**: Orchestrates the full workflow (email polling → moderation → creative enrichment → output). Uses built-in AI Agent nodes for multi-agent setup.
- **Opik**: Traces every step, runs automatic evaluations (e.g., moderation scores, bias detection), and logs for auditing.
- **Hybrid LLMs**: Local (e.g., via Ollama/Mistral-7B) for garde-fou and sensitive data; cloud (Mistral Studio) for creative search/enrichment.
- **Additional Tools**: Gmail integration in n8n for email ingestion; GitHub nodes for auto-creating issues; optional web form on audierne2026.fr pointing to FastAPI.

#### New Automated Workflow Steps

1. **Submission (Improved Intake)**:

   - **Short-term**: n8n polls the Gmail inbox (`audierne2026@gmail.com`) periodically (e.g., every 5-10 minutes) using native Gmail nodes—fetches new emails anonymously.
   - **Long-term**: Add a simple web form on audierne2026.fr (built with FastAPI + basic frontend) for direct submissions. Anonymous by default (no login required), with optional email for follow-ups. Form posts to a FastAPI endpoint, triggering the n8n workflow via webhook.

2. **Automated Moderation (Garde-Fou Agent – First Line)**:

   - n8n routes the raw contribution (email body or form text) to the **garde-fou agent** (a dedicated AI node).
     - Uses a local LLM for privacy (sensitive local issues stay on-server).
     - Strict system prompt: Enforce the full charte (neutrality, no partisanship/toxicity, relevance, constructiveness).
     - Opik integration: `@track` decorator traces the moderation step; auto-runs evaluations (e.g., built-in ModerationMetric, custom bias/hallucination checks).
   - Outcomes:
     - **Compliant**: Proceed automatically; log as "conforme charte" in Opik.
     - **Non-Compliant**: Auto-reject with a polite templated email response (via n8n Gmail node) explaining why (e.g., "Does not align with charte guidelines on neutrality"). Flag for your review if score is borderline.
     - Human fallback: n8n notifies you (email/Slack) for manual override on ambiguous cases.

3. **Creative Enrichment & Response Generation (Ocapistaine Agent)**:

   - Only for compliant contributions: Route to the **creative mind agent** in n8n.
     - Hybrid: Local LLM handles core enrichment with private knowledge base (e.g., crawled local docs from ocapistaine).
     - Cloud LLM (Mistral) for external searches (success stories from other communes, best practices)—with secure triage (redact personal/sensitive info first).
     - Generates: Enriched proposal, automated response, cross-references, proactive suggestions.
     - Opik traces the full chain, scoring for relevance/creativity.

4. **Output & Documentation**:
   - Auto-create a GitHub issue in `audierne2026/participons` (n8n GitHub node) with:
     - Original contribution.
     - Moderation status ("conforme charte").
     - AI-enriched version/response.
   - Optional: Post summary to the website (e.g., via FastAPI updating a database/feed) or send response email to submitter (if provided).
   - Proactive features (à la Jonas's inspiration): n8n scheduled jobs for daily briefs (emerging themes, win summaries).

#### Benefits of This Evolution

- **Scalability**: Handles higher volume without manual copy-paste.
- **Consistency**: AI garde-fou applies charte uniformly; Opik provides auditable metrics.
- **Privacy**: Hybrid routing ensures local-first processing.
- **Speed**: Near-real-time responses encourage engagement.
- **Transparency**: All traces in Opik dashboard for review; GitHub issues remain public record.

We're in early stages—start with n8n Gmail → moderation → GitHub proof-of-concept, then add web form and full hybrid. This aligns perfectly with civic tech goals for inclusive, safe dialogue ahead of 2026! If you'd like a sample n8n workflow export or FastAPI code snippet, just say the word.
