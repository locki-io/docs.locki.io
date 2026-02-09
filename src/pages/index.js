import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";

import Heading from "@theme/Heading";
import styles from "./index.module.css";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero hero--primary", styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/usage/getting-started"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

function Feature({ title, description, link }) {
  return (
    <div className={clsx("col col--4")}>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
        <Link to={link}>Learn more</Link>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Layout
      title="Documentation"
      description="AI-powered civic transparency documentation"
    >
      <HomepageHeader />
      <main>
        <section className={styles.features}>
          <div className="container">
            {/* Row 1: Getting Started */}
            <div className="row margin-bottom--lg">
              <Feature
                title="📖 Usage Guides"
                description="Getting started, judge trial guide, FAQ, and troubleshooting."
                link="/docs/usage/getting-started"
              />
              <Feature
                title="🤖 AI Agents"
                description="Forseti validation, Niove classification, and OCapistaine orchestration."
                link="/docs/agents"
              />
              <Feature
                title="📝 Blog"
                description="Hackathon journey, technical deep-dives, and project updates."
                link="/blog"
              />
            </div>
            {/* Row 2: Technical */}
            <div className="row margin-bottom--lg">
              <Feature
                title="🛠️ Application"
                description="Streamlit UI, scheduler tasks, prompt management, and logging."
                link="/docs/app"
              />
              <Feature
                title="🔧 Orchestration"
                description="Docker setup, N8N workflows, observability, and deployment."
                link="/docs/orchestration"
              />
              <Feature
                title="📚 Reference"
                description="TRIZ, Theory of Constraints, workflows, and methodologies."
                link="/docs/methods/triz"
              />
            </div>
            {/* Row 3: Community */}
            <div className="row">
              <Feature
                title="🏆 Hackathon"
                description="Encode AI Hackathon 2026 submission and project context."
                link="/docs/hackathon/encode-hackathon"
              />
              <Feature
                title="🌍 Audierne2026"
                description="The real participatory democracy initiative we support."
                link="htts://audierne2026.fr"
              />
              <Feature
                title="📊 Project Board"
                description="Track progress, issues, and roadmap on GitHub."
                link="https://github.com/orgs/locki-io/projects/2"
              />
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
