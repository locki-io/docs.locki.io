import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/methods/triz">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

function Feature({title, description, link}) {
  return (
    <div className={clsx('col col--4')}>
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
      description="AI-powered civic transparency documentation">
      <HomepageHeader />
      <main>
        <section className={styles.features}>
          <div className="container">
            <div className="row">
              <Feature
                title="Methodologies"
                description="TRIZ, Separation of Concerns, and Theory of Constraints applied to civic tech."
                link="/docs/methods/triz"
              />
              <Feature
                title="Workflows"
                description="Consolidation, contribution charter, and Firecrawl document acquisition."
                link="/docs/workflows/consolidation"
              />
              <Feature
                title="Project Board"
                description="Track progress on GitHub Projects."
                link="https://github.com/orgs/locki-io/projects/2"
              />
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
