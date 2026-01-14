// @ts-check

/**
 * @type {import('@docusaurus/plugin-content-docs').SidebarsConfig}
 */
const sidebars = {
  audierne2026Sidebar: [
    {
      type: "category",
      label: "Audierne2026",
      link: { type: "doc", id: "audierne2026/overview" },
      items: [
        "audierne2026/overview",
        "audierne2026/transparency-reports",
        "audierne2026/data-privacy",
      ],
    },
  ],
  usageSidebar: [
    {
      type: "category",
      label: "Usage Guides",
      link: { type: "doc", id: "usage/getting-started" },
      items: ["usage/getting-started", "usage/faq", "usage/troubleshooting"],
    },
  ],
  methodsSidebar: [
    {
      type: "category",
      label: "Methodologies",
      link: { type: "doc", id: "methods/triz" },
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
      ],
    },
  ],
};

export default sidebars;
