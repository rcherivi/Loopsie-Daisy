import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import "./App.css";
import { Pattern } from "./types";
import Chat from "./Chat";
import LoadingScreen from "./LoadingScreen";

/* ── Card style helpers ─────────────────────────────────── */

const TILTS = [
  "tilt-l3",
  "tilt-l2",
  "tilt-l1",
  "tilt-0",
  "tilt-r1",
  "tilt-r2",
  "tilt-r3",
] as const;
const PINS = [
  "pin-rose",
  "pin-green",
  "pin-blush",
  "pin-deco",
  "pin-tidal",
  "pin-deep",
] as const;

function cardStyle(index: number) {
  return { tilt: TILTS[index % TILTS.length], pin: PINS[index % PINS.length] };
}

/* ── Skill badge ────────────────────────────────────────── */

function SkillBadge({ level }: { level: string }) {
  const cls = level.toLowerCase() as "beginner" | "intermediate" | "advanced";
  const icons: Record<string, string> = {
    beginner: "★",
    intermediate: "✎",
    advanced: "◆",
  };
  return (
    <span className={`skill-badge ${cls}`}>
      {icons[cls] ?? "•"} {level}
    </span>
  );
}

/* ── Push pin ───────────────────────────────────────────── */

function Pin({ colorClass }: { colorClass: string }) {
  return (
    <div className={`pin ${colorClass}`}>
      <div className="pin-head" />
      <div className="pin-neck" />
    </div>
  );
}

/* ── Single polaroid card ───────────────────────────────── */

function PolaroidCard({ pattern, index }: { pattern: Pattern; index: number }) {
  const { tilt, pin } = useMemo(() => cardStyle(index), [index]);
  return (
    <div className={`polaroid-wrapper ${tilt}`}>
      <Pin colorClass={pin} />
      <div className="polaroid-card">
        <div className="polaroid-img-wrap">
          <img
            src={
              new URL(`./assets/images/${pattern.image_path}`, import.meta.url)
                .href
            }
            alt={pattern.title}
            className="polaroid-card-img"
          />
        </div>
        <div className="polaroid-card-body">
          <h3 className="polaroid-card-title">{pattern.title}</h3>
          <div className="polaroid-card-meta">
            <SkillBadge level={pattern.skill_level} />
            <span className="match-score">
              {Math.round(pattern.score * 100)}% Match
            </span>
          </div>
          <p className="polaroid-card-desc">{pattern.description}</p>
        </div>
        <a
          className="polaroid-card-link"
          href={pattern.pattern_link}
          target="_blank"
          rel="noopener noreferrer"
        >
          View Pattern
        </a>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   APP
   ══════════════════════════════════════════════════════════ */

function App(): JSX.Element {
  const [useLlm, setUseLlm] = useState<boolean | null>(null);
  const [inputValue, setInputValue] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [skillFilter, setSkillFilter] = useState<string>("");
  const [showLoading, setShowLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  // Holds the fetch to run AFTER the loading screen finishes
  const pendingFetch = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => setUseLlm(data.use_llm));
  }, []);

  /*
   * submitSearch queues the API call in a ref, then sets showLoading=true.
   * React re-renders → mounts <LoadingScreen> → its internal timer fires
   * after 1.4s → calls onDone → we run the queued fetch → results appear.
   *
   * Keeping the fetch OUT of the same synchronous call as setShowLoading
   * guarantees React has time to paint the overlay before any async work.
   */
  // const submitSearch = useCallback((text: string, skill: string) => {
  const submitSearch = useCallback(async (text: string, skill: string) => {
    if (text.trim() === "") return;

    setSearchTerm(text);
    setPatterns([]);
    setShowLoading(true);
    await new Promise(requestAnimationFrame);

    const params = new URLSearchParams();
    if (text.trim() != "") params.append("title", text);
    if (skill.trim() != "") params.append("skill", skill);

    const start = Date.now();

    const res = await fetch(`/api/patterns?${params.toString()}`);
    const data = await res.json();

    const elapsed = Date.now() - start;
    if (elapsed < 1700) {
      await new Promise((r) => setTimeout(r, 1700 - elapsed));
    }

    setPatterns(data);
    setShowLoading(false);

    // Store the fetch as a closure in a ref — runs after overlay finishes
    // pendingFetch.current = async () => {
    //   const params = new URLSearchParams();
    //   if (text.trim() !== "") params.append("title", text);
    //   if (skill.trim() !== "") params.append("skill", skill);
    //   const res = await fetch(`/api/patterns?${params.toString()}`);
    //   const data = await res.json();
    //   setPatterns(data);
    // };

    // Show overlay — triggers re-render that mounts LoadingScreen
    // setShowLoading(true);
    // requestAnimationFrame(() => {});
  }, []);

  // LoadingScreen calls this after its fade — we hide the overlay and run the fetch
  const handleLoadingDone = useCallback(() => {
    setShowLoading(false);
    const fn = pendingFetch.current;
    if (fn) {
      pendingFetch.current = null;
      fn(); // kick off the actual API call
    }
  }, []);

  const handleSubmit = useCallback(() => {
    submitSearch(inputValue, skillFilter);
  }, [inputValue, skillFilter, submitSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleSubmit();
    },
    [handleSubmit],
  );

  const handleClear = useCallback(() => {
    setInputValue("");
    setSearchTerm("");
    setPatterns([]);
    pendingFetch.current = null;
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleSkillChange = useCallback(
    (level: string) => {
      setSkillFilter(level);
      if (searchTerm.trim() !== "") submitSearch(searchTerm, level);
    },
    [searchTerm, submitSearch],
  );

  const handleChatSearch = useCallback(
    (value: string) => {
      setInputValue(value);
      submitSearch(value, skillFilter);
    },
    [skillFilter, submitSearch],
  );

  if (useLlm === null) return <></>;

  const hasResults = patterns.length > 0;
  const hasSearch = searchTerm.trim() !== "";

  return (
    <>
      {showLoading &&
        createPortal(
          <LoadingScreen onDone={handleLoadingDone} />,
          document.body,
        )}

      <div className={`full-body-container ${useLlm ? "llm-mode" : ""}`}>
        {/* ── Header ── */}
        <header className="app-header">
          <span className="app-header-logo">Loopsie Daisy</span>
          <div className="app-header-icons">
            <button className="app-header-btn" aria-label="Favourites">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#5a2a36"
                strokeWidth="2"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
            <button className="app-header-btn" aria-label="Settings">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#5a2a36"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </header>

        {/* ── Search ── */}
        <section className="search-section">
          <div className="search-row">
            <div
              className="search-box"
              onClick={() => inputRef.current?.focus()}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#a0606e"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                id="search-input"
                placeholder="Search for patterns, yarns, or creators..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              {inputValue !== "" && (
                <button
                  className="search-clear-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                  aria-label="Clear search"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#a0606e"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            <button
              className="search-submit-btn"
              onClick={handleSubmit}
              disabled={inputValue.trim() === ""}
            >
              Search
            </button>
          </div>

          {hasSearch && (
            <p className="active-search-label">
              Showing results for <strong>"{searchTerm}"</strong>
            </p>
          )}

          <div className="filter-row">
            <button
              className={`filter-pill ${skillFilter === "" ? "active" : ""}`}
              onClick={() => handleSkillChange("")}
            >
              All levels
            </button>
            {(["Beginner", "Intermediate", "Advanced"] as const).map(
              (level) => (
                <button
                  key={level}
                  className={`filter-pill ${skillFilter === level ? "active" : ""}`}
                  onClick={() => handleSkillChange(level)}
                >
                  {level}
                </button>
              ),
            )}
          </div>
        </section>

        {/* ── Polaroid pinboard ── */}
        <div className="patterns-board">
          {!hasSearch && (
            <div className="empty-state">
              <svg
                width="52"
                height="60"
                viewBox="0 0 60 68"
                fill="none"
                opacity="0.35"
              >
                <ellipse cx="30" cy="14" rx="10" ry="13" fill="#d4607a" />
                <ellipse
                  cx="30"
                  cy="14"
                  rx="10"
                  ry="13"
                  transform="rotate(60 30 32)"
                  fill="#c8de9d"
                />
                <ellipse
                  cx="30"
                  cy="14"
                  rx="10"
                  ry="13"
                  transform="rotate(120 30 32)"
                  fill="#d4607a"
                />
                <ellipse cx="30" cy="50" rx="10" ry="13" fill="#c8de9d" />
                <ellipse
                  cx="30"
                  cy="50"
                  rx="10"
                  ry="13"
                  transform="rotate(60 30 32)"
                  fill="#d4607a"
                />
                <ellipse
                  cx="30"
                  cy="50"
                  rx="10"
                  ry="13"
                  transform="rotate(120 30 32)"
                  fill="#c8de9d"
                />
                <circle cx="30" cy="32" r="10" fill="#f7c9d4" />
              </svg>
              <p>Search for a pattern to get started</p>
              <span className="empty-hint">
                Try "cozy sweater", "amigurumi", or "beginner scarf"
              </span>
            </div>
          )}

          {hasSearch && !hasResults && !showLoading && (
            <div className="empty-state">
              <p>No patterns found for "{searchTerm}"</p>
              <span className="empty-hint">
                Try a different search term or remove the skill filter
              </span>
            </div>
          )}

          {patterns.map((pattern, index) => (
            <PolaroidCard key={index} pattern={pattern} index={index} />
          ))}
        </div>

        {/* ── Chat (LLM mode only) ── */}
        {useLlm && <Chat onSearchTerm={handleChatSearch} />}

        {/* ── Footer ── */}
        <footer className="app-footer">
          <span className="app-footer-logo">Loopsie Daisy</span>
          <span className="app-footer-copy">
            © 2024 Loopsie Daisy. Stitched with love.
          </span>
          <nav className="app-footer-links">
            <a href="#">About</a>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Contact</a>
          </nav>
        </footer>
      </div>
    </>
  );
}

export default App;
