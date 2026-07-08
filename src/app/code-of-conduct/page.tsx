export const dynamic = "force-static";

export const metadata = {
  title: "Code of Conduct",
  description:
    "Community Code of Conduct for opencode.guru — how we expect members to treat each other.",
};

export default function CodeOfConductPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold text-white">Code of Conduct</h1>
      <p className="text-zinc-300 mt-3">
        opencode.guru is a community of open-source developers, learners,
        and contributors. We are committed to a welcoming, harassment-free
        experience for everyone — regardless of experience level, gender,
        gender identity and expression, sexual orientation, disability,
        neurotype, physical appearance, body size, age, race, nationality,
        or chosen programming language.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8">Be nice to each other</h2>
      <p className="text-zinc-300 mt-3">
        Assume good faith. Disagreement is fine; disrespect is not. A few
        simple rules go a long way:
      </p>
      <ul className="text-zinc-300 mt-2 space-y-2 list-disc pl-6">
        <li>
          <strong className="text-white">Be welcoming.</strong> Newcomers
          often don&apos;t know what&apos;s obvious to you. Offer help, point
          them to docs, and remember your own first day.
        </li>
        <li>
          <strong className="text-white">Be patient.</strong> Some questions
          are easy for the asker and hard to explain. Code-of-conduct
          violations are not.
        </li>
        <li>
          <strong className="text-white">Be considerate.</strong> Your work
          will be read by people whose backgrounds, languages, and skill
          levels differ from yours. Plain language wins.
        </li>
        <li>
          <strong className="text-white">Be respectful.</strong> Disagree
          with ideas, never with people. No slurs, no personal attacks, no
          dismissive comments about anyone&apos;s question or contribution.
        </li>
        <li>
          <strong className="text-white">Be curious before correcting.</strong>
          Ask &ldquo;what did you mean?&rdquo; before assuming the worst.
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8">
        Content standards
      </h2>
      <ul className="text-zinc-300 mt-2 space-y-2 list-disc pl-6">
        <li>
          Submitted videos should be on-topic, accurate, and free of
          deceptive titles or misleading thumbnails.
        </li>
        <li>
          No spam, no SEO-only content, no scraping-and-reposting of
          someone else&apos;s work without credit.
        </li>
        <li>
          Disclose sponsorships clearly (we have a &ldquo;Sponsored&rdquo; badge
          for this — use it).
        </li>
        <li>
          Don&apos;t impersonate other contributors, brands, or opencode
          maintainers.
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8">
        What we don&apos;t allow
      </h2>
      <ul className="text-zinc-300 mt-2 space-y-2 list-disc pl-6">
        <li>Harassment, threats, or doxxing in any form.</li>
        <li>Hate speech, slurs, or discriminatory language.</li>
        <li>Sexual content involving real people without consent.</li>
        <li>Spam, phishing, or malware links.</li>
        <li>Sharing private information without permission.</li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8">
        Reporting &amp; enforcement
      </h2>
      <p className="text-zinc-300 mt-3">
        If you see something that violates this code, use the{" "}
        <strong className="text-white">Report</strong> button on any video or
        comment, or email{" "}
        <a
          href="mailto:moderators@opencode.guru"
          className="text-brand hover:text-brand-hover underline-offset-2 hover:underline"
        >
          moderators@opencode.guru
        </a>
        . Reports are confidential. Super admins may hide, reject, or
        suspend content or accounts as needed. Repeat violations lead to
        bans.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8">
        A note from the maintainers
      </h2>
      <p className="text-zinc-300 mt-3">
        This site is small and curated. The fastest way to keep it
        healthy is for everyone — including long-time contributors — to
        model the behaviour we want to see. Thank you for being part of
        it.
      </p>
    </div>
  );
}