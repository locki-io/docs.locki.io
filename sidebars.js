// @ts-check

/**
 * @type {import('@docusaurus/plugin-content-docs').SidebarsConfig}
 */
const sidebars = {
  audierne2026Sidebar: [
    {
      type: "category",
      label: "Audierne2026",
      link: {
        type: "doc",
        id: "audierne2026/AI_Project_todefuseconflict",
      },
      items: [
        "audierne2026/AI_Project_todefuseconflict",
        "audierne2026/Mayor-2026-wishes",
        "audierne2026/municipal_meeting_transcript_lardic",
        "audierne2026/municipal-council-january2026",
        "audierne2026/municpal-council-january2026-transcript",
        "audierne2026/MVP_meeting",
        "audierne2026/MVP-meeting-satellite",
      ],
    },
  ],
  usageSidebar: [
    {
      type: "category",
      label: "Usage Guides",
      link: { type: "doc", id: "usage/getting-started" },
      items: [
        "usage/getting-started",
        "usage/judge-trial-guide",
        "usage/faq",
        "usage/troubleshooting",
      ],
    },
  ],
  methodsSidebar: [
    {
      type: "category",
      label: "Methodologies",
      link: { type: "doc", id: "methods/separation-of-concerns" },
      items: [
        "methods/triz",
        "methods/separation-of-concerns",
        "methods/theory-of-constraints",
      ],
    },
  ],
  workflowsSidebar: [
    {
      type: "category",
      label: "Workflows",
      link: { type: "doc", id: "workflows/consolidation" },
      items: [
        "workflows/consolidation",
        "workflows/contribution-charter",
        "workflows/firecrawl",
        "workflows/n8n-github-integration",
      ],
    },
  ],
  agentsSidebar: [
    {
      type: "category",
      label: "AI Agents",
      link: { type: "doc", id: "agents/index" },
      items: [
        "agents/index",
        {
          type: "category",
          label: "Forseti",
          link: { type: "doc", id: "agents/forseti/README" },
          items: [
            "agents/forseti/README",
            "agents/forseti/ARCHITECTURE",
            "agents/forseti/features_details",
          ],
        },
        {
          type: "category",
          label: "Niove",
          link: { type: "doc", id: "agents/niove/README" },
          items: ["agents/niove/README", "agents/niove/ARCHITECTURE"],
        },
        {
          type: "category",
          label: "OCapistaine",
          link: { type: "doc", id: "agents/ocapistaine/README" },
          items: ["agents/ocapistaine/README"],
        },
      ],
    },
  ],
  appSidebar: [
    {
      type: "category",
      label: "Application",
      link: { type: "doc", id: "app/README" },
      items: [
        "app/README",
        "app/AUTO_CONTRIBUTIONS",
        "app/MOCKUP",
        "app/ANONYMIZATION",
        "app/core/prompts",
        "app/I18N",
        "app/LOGGING",
        {
          type: "category",
          label: "Streamlit",
          items: [
            "app/INDEX",
            "app/STREAMLIT_SETUP",
            "app/STREAMLIT_QUICKSTART",
            "app/CORS_STRATEGY",
          ],
        },
        {
          type: "category",
          label: "Scheduler",
          link: { type: "doc", id: "app/scheduler/README" },
          items: [
            "app/scheduler/README",
            "app/scheduler/USAGE_EXAMPLES",
            "app/scheduler/TASK_BOILERPLATE",
            "app/scheduler/TASK_FLOW_DIAGRAM",
          ],
        },
      ],
    },
  ],
  hackathonSidebar: [
    {
      type: "category",
      label: "Hackathon",
      link: { type: "doc", id: "hackathon/encode-hackathon" },
      items: ["hackathon/encode-hackathon"],
    },
  ],
  orchestrationSidebar: [
    {
      type: "category",
      label: "Orchestration",
      link: { type: "doc", id: "orchestration/INDEX" },
      items: [
        "orchestration/INDEX",
        "orchestration/ARCHITECTURE",
        "orchestration/SETUP",
        "orchestration/DEVELOPMENT",
        "orchestration/USAGE",
        "orchestration/WORKFLOWS",
        "orchestration/PROXY_MANAGEMENT",
        "orchestration/PORTS",
        "orchestration/OBSERVABILITY",
        "orchestration/TROUBLESHOOTING",
        "orchestration/WEBSOCKET_FIX",
        "orchestration/NGROK_FAILS",
        "orchestration/REFERENCES",
      ],
    },
  ],
  sovereigntySidebar: [
    {
      type: "category",
      label: "Data Sovereignty",
      link: { type: "doc", id: "sovereignty/rag-document-storage" },
      items: ["sovereignty/rag-document-storage"],
    },
  ],
  testsSidebar: [
    {
      type: "category",
      label: "Testing",
      link: { type: "doc", id: "tests/testing-strategy" },
      items: ["tests/testing-strategy", "tests/coverage-report"],
    },
  ],
};

export default sidebars;
