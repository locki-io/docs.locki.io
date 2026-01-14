# Building an AI Project to Defuse Conflict Around the Pierre-Le Lec School Renovation

The Pierre-Le Lec school renovation project in Audierne is a sensitive issue, crystallizing tensions between the municipal majority (defending it for its urban integration and funding via "Petites Villes de Demain") and the opposition (pointing to "financial waste" and unrealistic subsidy expectations). To defuse this, an **AI project focused on transparency and neutral data access** can transform debate into constructive dialogue: providing factual information, synthesizing pro/con arguments, and facilitating open consultations. Inspired by examples like the **IssyGPT** chatbot in Issy-les-Moulineaux (answering citizen questions 24/7 on local projects) or participatory dashboards in Toulouse (with AI to visualize budget progress), here is a concrete, achievable plan adapted for a small municipality like Audierne (low-cost, open source).

## 1. AI Project Objectives

- **Defuse conflicts**: Provide objective data to counter rumors (e.g., "cost overestimation") and encourage fact-based debate, not accusations.
- **Deliver key data**: Progress status, timeline, costs, funding, and consultations – all in real-time.
- **Engage citizens**: Enable AI Q&A and idea submissions for perceived co-construction.
- **Measurable impact**: Reduce heated exchanges in municipal council (like December 10, 2025) by channeling information through a neutral platform.

## 2. Project Data and Progress Status (factual summary, as of December 15, 2025)

Based on the official municipal website (audierne.bzh) and local press (Ouest-France, Le Télégramme), here is a transparent summary. This data could be integrated as a knowledge base for the AI (JSON or Markdown file).

- **Description**: Consolidation of two public schools (Pierre-Le Lec in Audierne and Esquibien) on the historic Pierre-Le Lec site (quai Anatole-France, harbor view). Includes complete rehabilitation (kindergarten, elementary, cafeteria, gymnasium), energy improvements, disability accessibility, and risk adaptations (flooding, landslides). Architect: Brûlé Architectes Associés (Quimper). Part of "Petites Villes de Demain" (PVD) program to revitalize the town center.

- **Timeline**:

  - Technical diagnosis and user consultation: Completed (2023-2024)
  - Project management: Consulted late 2024, studies launched early 2025, ongoing through fall 2025
  - Temporary relocation: Students transferred to Espace Émile-Combes (former Saint-Joseph college) for September 2025 school year
  - Main construction: Starting early 2026 (asbestos removal/demolition already contracted)
  - Delivery: September 2027 school year

- **Costs and Funding**:

  - Estimate: €5.4-7M including tax (major renovation + extension; €1,000-1,500/m², consistent with PVD benchmarks for rural schools)
  - Expected subsidies: 60% via PVD, State (DSIL), Department/Region (Green Fund, EduRénov). Temporary relocation: ~€190k
  - Cost controversies: Opposition (Didier Guillon) criticizes "overestimation" and unrealistic subsidies (municipal burden risk >40%). Two alternative scenarios rejected for higher costs

- **Recent Consultations and Controversies**:
  - Consultation: Verifica firm for needs assessment; playful workshops with students/teachers (courtyard greening). Pierre-Le Lec option chosen for urban integration and child well-being
  - Tensions: Heated exchanges at December 10, 2025 council meeting on financing plan. Some Esquibien parents regret traffic/parking issues. No legal action reported, but risk during 2026 campaign

This data is public (municipal deliberations); AI could update via API or light scraping.

## 3. Step-by-Step Plan to Build the AI Project

Adopt an agile, low-cost approach (~€500-2,000 with freelance, or free with open source tools). Integrate with your GitHub platform (audierne2026/participons) for maximum transparency.

- **Step 1: Data Collection and Structuring (1-2 weeks, free)**

  - Create a JSON/Markdown file on GitHub with sections (timeline, costs, FAQ). Include sources (deliberation links, Gwaien PDFs)
  - Add pro/con arguments: e.g., "Pro: Town center revitalization (PVD); Con: Budget risk (construction inflation +20%)"
  - Tools: Google Sheets or free Airtable, exported to JSON

- **Step 2: AI Design (2-4 weeks, €0-1,000)**

  - **Recommended AI type**: Conversational chatbot for Q&A ("What is the exact cost?"), or interactive dashboard (timeline/cost visualization with Streamlit)
  - Open source tech stack:
    - **Chatbot**: Use Hugging Face (free model like Mistral-7B). Host on GitHub Pages + Streamlit for demo
    - **Dashboard**: Python with Streamlit/Pandas for graphs (Gantt timeline, subsidy pie chart)
    - Integrate AI moderation for debates (detect conflicts, suggest neutral facts)

- **Step 3: Development and Testing (1-2 weeks, €500-1,000 with dev help)**

  - Prototype: Deploy on free Heroku/Render. Test with focus group (parents, opposition officials) for bias
  - Key features:
    - Automated Q&A: "Subsidy status?" → Factual response + sources
    - Conflict synthesis: "Pro/con arguments" in balanced table
    - Idea submissions: AI categorizes and publishes anonymously on GitHub Discussions
  - Security: GDPR-compliant (anonymous data, French hosting)

- **Step 4: Deployment and Communication (immediate launch, free)**

  - Integrate into GitHub site (chatbot iframe). Share via municipal Facebook, Gwaien bulletin, public meetings
  - Promotion: "Discover our AI to learn everything about the school – questions open 24/7!"
  - Success metrics: Track interactions (visits, questions asked); goal: 200-500 views/month

- **Step 5: Evolution and Sustainability (post-launch)**
  - If elected: Migrate to Decidim + AI (existing spam moderation module) for participatory school budget
  - Total budget: `<€2,000` (freelance via Malt.fr). Partners: ANCT (PVD supports participatory digital), or xAI for free API

This project positions your initiative as innovative and calming, making data accessible without political filter. It could even inspire list mergers by showing concrete results!
