export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 text-sm leading-7 text-ink-muted">
      <p className="text-xs uppercase tracking-[0.2em] text-gold">Privacy outline</p>
      <h1 className="display text-4xl text-ink">ReelVault privacy policy outline</h1>
      <p>
        ReelVault is a personal library for links you choose to save. It is not affiliated with
        Meta or Instagram. This page is product copy for the MVP, not legal advice.
      </p>
      <h2 className="display text-2xl text-ink">What we collect</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>URLs you paste, share from the Android share sheet, or send from the extension.</li>
        <li>Notes, tags, collections, reminders, and pasted caption or transcript text.</li>
        <li>Optional public preview metadata if you click Fetch.</li>
        <li>A local display name and optional email you type.</li>
      </ul>
      <h2 className="display text-2xl text-ink">What we do not collect</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Instagram passwords or session cookies.</li>
        <li>Your Instagram Saved tab, DMs, or followers.</li>
        <li>Background browsing history, Instagram cookies, or anything you did not tap Share on.</li>
        <li>Analytics unless you opt in — and this starter does not transmit analytics.</li>
      </ul>
      <h2 className="display text-2xl text-ink">Share sheet capture</h2>
      <p>
        “Save to RecallVault” on Android receives only the text/link you chose in the system share
        sheet. The app never opens that URL automatically, never scrapes Instagram, and never
        downloads thumbnails or video. User-uploaded screenshots stay on the phone unless you later
        opt into cloud backup. Unauthenticated shares wait in an encrypted local queue.
      </p>
      <h2 className="display text-2xl text-ink">Where data lives</h2>
      <p>
        By default everything stays in IndexedDB on your device. The Android companion encrypts its
        pending queue with Android Keystore. Optional cloud sync requires pairing and is isolated
        per user.
      </p>
      <h2 className="display text-2xl text-ink">AI</h2>
      <p>
        Optional tag suggestions use SpaceXAI (xAI) on the server. Notes are sent only if you
        explicitly include them. Suggestions are never auto-applied.
      </p>
      <h2 className="display text-2xl text-ink">Your rights</h2>
      <p>
        Export JSON, CSV, or Markdown at any time. Delete the library and erase associated data
        with one confirmation. Audit events for import, export, and deletion are visible to you.
      </p>
    </article>
  );
}
