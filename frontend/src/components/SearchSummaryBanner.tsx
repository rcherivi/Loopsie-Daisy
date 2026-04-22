export default function SearchSummaryBanner({
  summary,
  best_match,
}: {
  summary: string;
  best_match: { name: string; link: string } | null;
}) {
  // Strip the "Best Match: ..." line from summary text since we display it separately
  const summaryText = summary
    .split("\n")
    .filter((l) => !l.startsWith("Best Match:"))
    .join(" ")
    .trim();

  return (
    <div className="summary-banner">
      <p className="summary-text">{summaryText}</p>
      {best_match?.link && (
        <a
          className="best-match-link"
          href={best_match.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          ⭐ Best Match: {best_match.name}
        </a>
      )}
    </div>
  );
}