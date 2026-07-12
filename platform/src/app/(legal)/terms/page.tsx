// Plain-English terms for the beta phase. Casey: review before launch and
// replace with counsel-reviewed terms before billing goes live.

export const metadata = { title: "Terms of Service · Win the Week" };

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-6">
    <h2 className="text-base font-bold text-charcoal-900">{title}</h2>
    <div className="mt-2 space-y-2 text-sm leading-relaxed text-charcoal-600">{children}</div>
  </section>
);

export default function TermsPage() {
  return (
    <div>
      <h1 className="headline text-2xl text-charcoal-900">Terms of Service</h1>
      <p className="mt-2 text-xs text-charcoal-400">Last updated July 1, 2026</p>

      <Section title="The short version">
        <p>
          Win the Week is a service planning platform for worship leaders, run by Casey Klocek.
          By creating an account you agree to these terms. We built them to be readable, and so
          if anything is unclear, just email us.
        </p>
      </Section>

      <Section title="Beta disclaimer">
        <p>
          Win the Week is currently in beta. Features may change, break, or be removed while we
          build. We work hard to keep your data safe, and you should still keep your own copies
          of anything you cannot afford to lose (printed packets, chord chart PDFs, and set
          lists). The service is provided as-is during the beta, without warranties of any kind.
        </p>
      </Section>

      <Section title="Your account">
        <p>
          You sign in with an email link, so keeping your email account secure keeps your Win
          the Week account secure. You are responsible for what happens under your account, and
          you agree to give us accurate information.
        </p>
      </Section>

      <Section title="Plans, trials, and billing">
        <p>
          Win the Week offers a Base plan and an Advanced plan, each starting with a free trial.
          Nothing is billed during the beta. Before any billing begins we will tell you clearly,
          ask for payment details, and honor the founder rate promised to early accounts. You
          can cancel anytime, and your access runs through the period you paid for.
        </p>
      </Section>

      <Section title="Song licensing (CCLI and copyright)">
        <p>
          You are responsible for your own song licensing. Win the Week stores charts and lyrics
          that you enter or upload, and it does not grant you any license to copyrighted songs.
          Make sure your church holds the appropriate CCLI or other licenses for the music you
          use and reproduce.
        </p>
      </Section>

      <Section title="Your content">
        <p>
          Your plans, charts, rosters, and notes belong to you. You give us permission to store
          and process them so the product can work. We do not sell your content or use it to
          train AI models.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>
          Use the platform for planning worship and leading your team. Do not use it to break
          the law, infringe copyrights, or harm the service or other users.
        </p>
      </Section>

      <Section title="Ending things">
        <p>
          You can stop using Win the Week and ask us to delete your data at any time by emailing
          caseyklocek@gmail.com. We may suspend accounts that violate these terms.
        </p>
      </Section>

      <Section title="Liability">
        <p>
          To the maximum extent the law allows, Win the Week and Casey Klocek are not liable for
          indirect or consequential damages arising from your use of the service. Our total
          liability is limited to the amount you paid us in the past twelve months.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update these terms as the product grows. When we make a meaningful change we
          will let you know by email or inside the app.
        </p>
      </Section>
    </div>
  );
}
