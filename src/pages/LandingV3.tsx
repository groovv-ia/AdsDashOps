import '../components/landingv3/landingv3.css';
import { NavbarV3 } from '../components/landingv3/NavbarV3';
import { HeroV3 } from '../components/landingv3/HeroV3';
import { MarqueeV3 } from '../components/landingv3/MarqueeV3';
import { ManifestoV3 } from '../components/landingv3/ManifestoV3';
import { AudienceV3 } from '../components/landingv3/AudienceV3';
import { FeaturesV3 } from '../components/landingv3/FeaturesV3';
import { HowItWorksV3 } from '../components/landingv3/HowItWorksV3';
import { PullQuoteV3 } from '../components/landingv3/PullQuoteV3';
import { PricingV3 } from '../components/landingv3/PricingV3';
import { FaqV3 } from '../components/landingv3/FaqV3';
import { CtaFinalV3 } from '../components/landingv3/CtaFinalV3';
import { FooterV3 } from '../components/landingv3/FooterV3';

export default function LandingV3() {
  return (
    <div className="min-h-screen bg-background-soft font-sans overflow-x-hidden">
      <NavbarV3 />
      <HeroV3 />
      <MarqueeV3 />
      <ManifestoV3 />
      <AudienceV3 />
      <FeaturesV3 />
      <HowItWorksV3 />
      <PullQuoteV3 />
      <PricingV3 />
      <FaqV3 />
      <CtaFinalV3 />
      <FooterV3 />
    </div>
  );
}
