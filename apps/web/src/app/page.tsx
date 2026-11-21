import ExactMockup from '../components/ExactMockup';

/**
 * STATIC / SSG landing (Chibi Community).
 * No request-time session read: publicly cacheable and SEO friendly.
 * The dynamic dashboard lives at /home.
 */
export default function Home() {
  return <ExactMockup view="landing" authenticated={false} />;
}
