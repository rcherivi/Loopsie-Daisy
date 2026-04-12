import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import "./App.css";
import { Pattern } from "./types";
import Chat from "./Chat";
import LoadingScreen from "./LoadingScreen";

/* card tilt */

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

/* skill*/

function SkillBadge({ level }: { level: string }) {
  if (!level) return <span className="skill-badge none">no level</span>;
  const normalized = level.toLowerCase();
  return <span className={`skill-badge ${normalized}`}>{normalized}</span>;
}

/* push pin */

function Pin({ colorClass }: { colorClass: string }) {
  return (
    <div className={`pin ${colorClass}`}>
      <div className="pin-head" />
      <div className="pin-neck" />
    </div>
  );
}

/* polaroid card */

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

/* app */

function App(): JSX.Element {
  const [useLlm, setUseLlm] = useState<boolean | null>(null);
  const [inputValue, setInputValue] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [skillFilter, setSkillFilter] = useState<string>("");
  const [showLoading, setShowLoading] = useState(false);

  const [resolved, setResolved] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const fetchedDataRef = useRef<Pattern[] | null>(null);
  const loadingDoneRef = useRef(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => setUseLlm(data.use_llm));
  }, []);

  const applyResults = useCallback((data: Pattern[]) => {
    setPatterns(data);
    setResolved(true);
    setShowLoading(false);
  }, []);

  const runFetch = useCallback(
    async (text: string, skill: string) => {
      fetchedDataRef.current = null;
      loadingDoneRef.current = false;

      const params = new URLSearchParams();
      if (text.trim() !== "") params.append("title", text);
      if (skill.trim() !== "") params.append("skill", skill);

      const res = await fetch(`/api/patterns?${params.toString()}`);
      const data: Pattern[] = await res.json();

      if (loadingDoneRef.current) {
        applyResults(data);
      } else {
        fetchedDataRef.current = data;
      }
    },
    [applyResults],
  );

  const handleLoadingDone = useCallback(() => {
    loadingDoneRef.current = true;
    if (fetchedDataRef.current !== null) {
      applyResults(fetchedDataRef.current);
      fetchedDataRef.current = null;
    }
  }, [applyResults]);

  const submitSearch = useCallback(
    (text: string, skill: string) => {
      if (text.trim() === "") return;
      setSearchTerm(text);
      setResolved(false);
      setPatterns([]);
      setShowLoading(true);
      runFetch(text, skill);
    },
    [runFetch],
  );

  const handleSkillChange = useCallback(
    (level: string) => {
      setSkillFilter(level);
      if (searchTerm.trim() === "") return;

      setResolved(false);
      setPatterns([]);

      const doFetch = async () => {
        const params = new URLSearchParams();
        if (searchTerm.trim() !== "") params.append("title", searchTerm);
        if (level.trim() !== "") params.append("skill", level);
        const res = await fetch(`/api/patterns?${params.toString()}`);
        const data: Pattern[] = await res.json();
        setPatterns(data);
        setResolved(true);
      };
      doFetch();
    },
    [searchTerm],
  );

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
    setResolved(false);
    fetchedDataRef.current = null;
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleChatSearch = useCallback(
    (value: string) => {
      setInputValue(value);
      submitSearch(value, skillFilter);
    },
    [skillFilter, submitSearch],
  );

  if (useLlm === null) return <></>;

  const hasSearch = searchTerm.trim() !== "";
  const showNoResults = hasSearch && resolved && patterns.length === 0;

  console.log("DEBUG:", {
    hasSearch,
    resolved,
    patterns,
    length: patterns.length,
  });

  return (
    <>
      {showLoading &&
        createPortal(
          <LoadingScreen onDone={handleLoadingDone} />,
          document.body,
        )}

      <div className={`full-body-container ${useLlm ? "llm-mode" : ""}`}>
        {/* header */}
        <header className="app-header">
          <span className="app-header-logo">Loopsie Daisy</span>
          <div className="app-header-icons" />
        </header>

        {/* search */}
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
                placeholder="Search for patterns, yarns, or crochet hooks"
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

        {/* polaroid pinboard */}
        <div className="patterns-board">
          {/* default */}
          {!hasSearch && (
            <div className="empty-state">
              <p>Search for a pattern to get started!</p>
              <span className="empty-hint">
                Try "cozy sweater", "cute flower", or "beginner scarf"
              </span>
            </div>
          )}

          {/* no results */}
          {showNoResults && (
            <div className="empty-state">
              <p>
                No patterns found for "{searchTerm}"
                {skillFilter ? ` in ${skillFilter}` : ""}
              </p>
              <span className="empty-hint">
                Try a different search term or remove the skill filter
              </span>
            </div>
          )}

          {/* results */}
          {resolved &&
            patterns.map((pattern, index) => (
              <PolaroidCard key={index} pattern={pattern} index={index} />
            ))}
        </div>

        {/* chat */}
        {useLlm && <Chat onSearchTerm={handleChatSearch} />}

        {/* footer */}
        <footer className="app-footer">
          <span className="app-footer-logo">Loopsie Daisy</span>
          <span className="app-footer-copy">
            © 2026 Loopsie Daisy. Stitched with love.
          </span>
        </footer>
      </div>
    </>
  );
}

export default App;
