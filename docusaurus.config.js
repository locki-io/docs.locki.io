// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import { themes as prismThemes } from "prism-react-renderer";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Ò Capistaine Docs",
  tagline: "AI-powered civic transparency for Audierne2026 and beyond",
  favicon: "img/favicon.ico",

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: "https://docs.locki.io",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  organizationName: "locki-io",
  projectName: "docs.locki.io",

  onBrokenLinks: "throw",

  // Internationalization - English primary, French secondary
  i18n: {
    defaultLocale: "en",
    locales: ["en", "fr"],
    localeConfigs: {
      en: {
        label: "English",
        direction: "ltr",
        htmlLang: "en-US",
        calendar: "gregory",
      },
      fr: {
        label: "Français",
        direction: "ltr",
        htmlLang: "fr-FR",
        calendar: "gregory",
        path: "fr",
      },
    },
  },

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: "./sidebars.js",
          editUrl: "https://github.com/locki-io/docs.locki.io/tree/main/",
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ["rss", "atom"],
            xslt: true,
          },
          editUrl: "https://github.com/locki-io/docs.locki.io/tree/main/",
          onInlineTags: "warn",
          onInlineAuthors: "warn",
          onUntruncatedBlogPosts: "warn",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: "img/ocapistaine-social-card.jpg",
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: "Ò Capistaine",
        logo: {
          alt: "OCapistaine Logo",
          src: "img/logo.svg",
        },
        items: [
          {
            type: "docSidebar",
            sidebarId: "audierne2026Sidebar",
            position: "left",
            label: "Audierne2026",
          },
          {
            type: "docSidebar",
            sidebarId: "usageSidebar",
            position: "left",
            label: "Usage",
          },
          {
            type: "docSidebar",
            sidebarId: "methodsSidebar",
            position: "left",
            label: "Methods",
          },
          {
            type: "docSidebar",
            sidebarId: "workflowsSidebar",
            position: "left",
            label: "Workflows",
          },
          { to: "/blog", label: "Blog", position: "left" },
          {
            type: "localeDropdown",
            position: "right",
          },
          {
            href: "https://github.com/locki-io/ocapistaine",
            label: "GitHub",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Documentation",
            items: [
              {
                label: "Audierne2026",
                to: "/docs/audierne2026/overview",
              },
            ],
          },
          {
            title: "Community",
            items: [
              // {
              //   label: "Discord",
              //   href: "https://discord.gg/hrm4cTkN",
              // },
              {
                label: "audierne2026.fr",
                href: "https://audierne2026.fr",
              },
            ],
          },
          {
            title: "Project",
            items: [
              {
                label: "Blog",
                to: "/blog",
              },
              {
                label: "GitHub",
                href: "https://github.com/locki-io/ocapistaine",
              },
              {
                label: "Project Board",
                href: "https://github.com/orgs/locki-io/projects/2",
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} OCapistaine - Open Source Civic Tech. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ["python", "bash", "json"],
      },
    }),
};

export default config;
