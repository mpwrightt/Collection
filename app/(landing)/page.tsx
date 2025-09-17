import HeroSection from "./hero-section";
import FeaturesOne from "./features-one";
import Testimonials from "./testimonials";
import CallToAction from "./call-to-action";
import FAQs from "./faqs";
import Footer from "./footer";
import CustomClerkPricing from "@/components/custom-clerk-pricing";

export default function Home() {
  return (
    <div className="bg-background text-foreground">
      <HeroSection />
      <FeaturesOne />
      <section id="pricing" className="bg-muted/40 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 mx-auto max-w-2xl space-y-6 text-center">
              <h2 className="text-center text-4xl font-semibold lg:text-5xl">Pricing built for binders and game stores</h2>
              <p className="text-muted-foreground text-lg">Start with a free workspace for personal collections. Upgrade for multi-user access, AI coaching, and priority pricing refreshes when your inventory or playgroup scales.</p>
          </div>
          <CustomClerkPricing />
        </div>
      </section>
      <Testimonials />
      <CallToAction />
      <FAQs />
      <Footer />
    </div>
  );
}
