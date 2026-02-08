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
            to="/docs/usage/getting-started">
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
                title="For Judges"
                description="Test and evaluate Forseti AI validation. Help improve civic participation quality."
                link="/docs/usage/judge-trial-guide"
              />
              <Feature
                title="For Developers"
                description="Application architecture, AI agents, and integration guides."
                link="/docs/app"
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
