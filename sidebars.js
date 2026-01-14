// @ts-check

/**
 * @type {import('@docusaurus/plugin-content-docs').SidebarsConfig}
 */
const sidebars = {
  audierne2026Sidebar: [
    {
      type: "category",
      label: "Audierne2026",
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
      items: ["usage/getting-started", "usage/faq", "usage/troubleshooting"],
    },
  ],
  methodsSidebar: [
    {
      type: "category",
      label: "Methodologies",
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
      items: [
        "workflows/consolidation",
        "workflows/contribution-charter",
        "workflows/firecrawl",
      ],
    },
  ],
};

export default sidebars;
