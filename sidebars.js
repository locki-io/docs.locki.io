// @ts-check

/**
 * @type {import('@docusaurus/plugin-content-docs').SidebarsConfig}
 */
const sidebars = {
  methodsSidebar: [
    {
      type: 'category',
      label: 'Methodologies',
      items: [
        'methods/triz',
        'methods/separation-of-concerns',
        'methods/theory-of-constraints',
      ],
    },
  ],
  workflowsSidebar: [
    {
      type: 'category',
      label: 'Workflows',
      items: [
        'workflows/consolidation',
        'workflows/contribution-charter',
        'workflows/firecrawl',
      ],
    },
  ],
};

export default sidebars;
