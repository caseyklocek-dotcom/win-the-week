// Plain-English privacy policy for the beta phase. Casey: review before
// launch and replace with counsel-reviewed language before billing goes live.

export const metadata = { title: "Privacy Policy · Win the Week" };

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-6">
    <h2 className="text-base font-bold text-charcoal-900">{title}</h2>
    <div className="mt-2 space-y-2 text-sm leading-relaxed text-charcoal-600">{children}</div>
  </section>
);

export default function PrivacyPage() {
  return (
    <div>
      <h1 className="headline text-2xl text-charcoal-900">Privacy Policy</h1>
      <p className="mt-2 text-xs text-charcoal-400">Last updated July 1, 2026</p>

      <Section title="The short version">
        <p>
          We collect what the product needs to work and nothing more. We do not sell your data,
          and we do not use your content to train AI models.
        </p>
      </Section>

      <Section title="What we collect">
        <p>
          Your email address (to sign you in), your profile details (name, church, role, photo
          if you add one), and the planning content you create: services, sets, charts, rosters,
          goals, and notes. If you apply for the beta we also collect your application answers.
        </p>
      </Section>

      <Section title="Where it lives">
        <p>
          Account data and planning content are stored with Supabase, our database and
          authentication provider, on servers in the United States. The app also uses your
          browser&rsquo;s local storage for things like theme preference and sign-up choices.
        </p>
      </Section>

      <Section title="How we use it">
        <p>
          To run the product, to sign you in, to email you about your account and the beta, and
          to understand how the product is used so we can improve it. Beta application answers
          are used to decide fit and to prepare for your call.
        </p>
      </Section>

      <Section title="Who sees it">
        <p>
          Casey and the service providers that run the platform (hosting, database, email,
          scheduling). Nobody else, unless the law requires it.
        </p>
      </Section>

      <Section title="Your choices">
        <p>
          You can edit your profile anytime inside the app. To export or delete your data,
          email caseyklocek@gmail.com and we will take care of it.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          If this policy changes in a meaningful way, we will let you know by email or inside
          the app.
        </p>
      </Section>
    </div>
  );
}
