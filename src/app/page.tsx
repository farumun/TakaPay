import { Features, Integrations, Pricing } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { asRecord, asString, getEnabledSections } from "@/lib/cms";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sections = await getEnabledSections();
  const byKey = new Map(sections.map((section) => [section.key, section]));
  const hero = byKey.get("hero");
  const features = byKey.get("features");
  const integrations = byKey.get("integrations");
  const pricing = byKey.get("pricing");
  const footer = byKey.get("footer");

  return (
    <>
      <Header />
      <main>
        {hero && <Hero content={hero.content} />}
        {features && <Features content={features.content} />}
        {integrations && <Integrations content={integrations.content} />}
        {pricing && <Pricing content={pricing.content} />}
      </main>
      <Footer tagline={asString(asRecord(footer?.content).tagline)} />
    </>
  );
}
