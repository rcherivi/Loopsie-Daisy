import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import "./App.css";
import { Pattern } from "./types";
import Chat from "./Chat";
import LoadingScreen from "./LoadingScreen";

// daisy
// function Daisy({
//   petalColor,
//   size = 64,
// }: {
//   petalColor: string;
//   size?: number;
// }) {
//   const c = size / 2;
//   const pr = size * 0.28;
//   const pd = size * 0.22;
//   const cr = size * 0.14;

//   const petals = Array.from({ length: 5 }, (_, i) => {
//     const angle = (i * 72 - 90) * (Math.PI / 180);
//     return (
//       <circle
//         key={i}
//         cx={c + Math.cos(angle) * pd}
//         cy={c + Math.sin(angle) * pd}
//         r={pr}
//         fill={petalColor}
//       />
//     );
//   });

//   return (
//     <svg
//       width={size}
//       height={size}
//       viewBox={`0 0 ${size} ${size}`}
//       xmlns="http://www.w3.org/2000/svg"
//     >
//       {petals}
//       <circle cx={c} cy={c} r={cr} fill="#f9e07a" />
//     </svg>
//   );
// }

function BgDaisy({
  x,
  y,
  size,
  color,
}: {
  x: string;
  y: string;
  size: number;
  color: string;
}) {
  const c = size / 2;
  const pr = size * 0.28;
  const pd = size * 0.22;
  const cr = size * 0.14;

  const petals = Array.from({ length: 5 }, (_, i) => {
    const angle = (i * 72 - 90) * (Math.PI / 180);
    return (
      <circle
        key={i}
        cx={c + Math.cos(angle) * pd}
        cy={c + Math.sin(angle) * pd}
        r={pr}
        fill={color}
      />
    );
  });

  return (
    <svg
      className="bg-daisy"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ left: x, top: y }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {petals}
      <circle cx={c} cy={c} r={cr} fill="#f9e07a" />
    </svg>
  );
}

function BgDaisies() {
  const daisies = [
    { x: "-60px", y: "5%", size: 260, color: "#f7c9d4" },
    { x: "72%", y: "-40px", size: 220, color: "#c8de9d" },
    { x: "88%", y: "28%", size: 180, color: "#f7c9d4" },
    { x: "10%", y: "38%", size: 200, color: "#e0eea3" },
    { x: "55%", y: "52%", size: 240, color: "#f7c9d4" },
    { x: "-30px", y: "68%", size: 190, color: "#c8de9d" },
    { x: "80%", y: "72%", size: 210, color: "#e0eea3" },
    { x: "35%", y: "82%", size: 170, color: "#f7c9d4" },
    { x: "27%", y: "25%", size: 100, color: "#e0eea3" },
    { x: "40%", y: "25%", size: 200, color: "#f7c9d4" },
    { x: "30%", y: "50%", size: 150, color: "#f7c9d4" },
    { x: "70%", y: "40%", size: 150, color: "#e0eea3" },
  ];

  return (
    <div className="bg-daisies" aria-hidden="true">
      {daisies.map((d, i) => (
        <BgDaisy key={i} {...d} />
      ))}
    </div>
  );
}

/* top-k selector */

const TOPK_OPTIONS = [
  { label: "All", value: 100 },
  { label: "10", value: 10 },
  { label: "20", value: 20 },
  { label: "30", value: 30 },
];

function TopKSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="topk-row">
      <span className="topk-label">Top Patterns:</span>
      {TOPK_OPTIONS.map(({ label, value: n }) => (
        <button
          key={n}
          className={`topk-pill ${value === n ? "active" : ""}`}
          onClick={() => onChange(n)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

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

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++)
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function cardStyle(pattern: Pattern) {
  const h = hashStr(pattern.title + pattern.pattern_link);
  return { tilt: TILTS[h % TILTS.length], pin: PINS[(h >> 3) % PINS.length] };
}

/* skill */

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

function PolaroidCard({
  pattern,
  onVote,
}: {
  pattern: Pattern;
  index: number;
  onVote?: (id: number, vote: "up" | "down") => void;
}) {
  const userVote = pattern.user_vote ?? null;
  const { tilt, pin } = useMemo(() => cardStyle(pattern), [pattern]);
  return (
    <div className={`polaroid-wrapper ${tilt}`}>
      <Pin colorClass={pin} />
      <div className="polaroid-card">
        <div className="polaroid-img-wrap">
          <img
            loading="lazy"
            decoding="async"
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
            {pattern.score > 0 && pattern.score <= 1 && (
              <span className="match-score">
                {Math.round(pattern.score * 100)}% Match
              </span>
            )}
          </div>
          <p className="polaroid-card-desc">{pattern.description}</p>
        </div>
        {onVote && pattern.id && (
          <div className="vote-row">
            <button
              className={`vote-btn vote-up${userVote === "up" ? " vote-active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                onVote(pattern.id!, "up");
              }}
              aria-label="Upvote"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 4l8 14H4z" />
              </svg>
              <span>{pattern.upvotes ?? 0}</span>
            </button>
            <button
              className={`vote-btn vote-down${userVote === "down" ? " vote-active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                onVote(pattern.id!, "down");
              }}
              aria-label="Downvote"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 20l-8-14h16z" />
              </svg>
              <span>{pattern.downvotes ?? 0}</span>
            </button>
          </div>
        )}
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

/** Returns a persistent session token stored in localStorage. */
function generateUUID(): string {
  // crypto.randomUUID() requires a secure context (https). Fall back for http dev.
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getSessionToken(): string {
  const KEY = "ld_session_token";
  let token = localStorage.getItem(KEY);
  if (!token) {
    token = generateUUID();
    localStorage.setItem(KEY, token);
  }
  return token;
}

function App(): JSX.Element {
  const [useLlm, setUseLlm] = useState<boolean | null>(null);
  const [inputValue, setInputValue] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [featuredPatterns, setFeaturedPatterns] = useState<Pattern[]>([]);
  const [skillFilter, setSkillFilter] = useState<string>("");
  const [showLoading, setShowLoading] = useState(false);
  const [topK, setTopK] = useState<number>(100);
  const [resolved, setResolved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const searchSectionRef = useRef<HTMLElement>(null);
  const [numCols, setNumCols] = useState(4);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const measure = () => {
      const w = board.offsetWidth;
      // Mirror the CSS: columns: 4 210px — fit as many 210px cols as possible, max 4
      setNumCols(Math.min(4, Math.max(1, Math.floor(w / 210))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(board);
    return () => ro.disconnect();
  }, []);
  // const fetchedDataRef = useRef<Pattern[] | null>(null);
  // const loadingDoneRef = useRef(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => setUseLlm(data.use_llm));
    fetch("/api/patterns/trending?top_k=12", {
      headers: { "X-Session-Token": getSessionToken() },
    })
      .then((r) => r.json())
      .then((data: Pattern[]) => setFeaturedPatterns(data))
      .catch(() => {});
  }, []);

  // const applyResults = useCallback((data: Pattern[]) => {
  //   setPatterns(data);
  //   setResolved(true);
  //   setShowLoading(false);
  // }, []);

  // const runFetch = useCallback(
  //   async (text: string, skill: string, k: number) => {
  //     fetchedDataRef.current = null;
  //     loadingDoneRef.current = false;

  //     const params = new URLSearchParams();
  //     if (text.trim() !== "") params.append("title", text);
  //     if (skill.trim() !== "") params.append("skill", skill);
  //     params.append("top_k", String(k));

  //     const res = await fetch(`/api/patterns?${params.toString()}`);
  //     const data: Pattern[] = await res.json();

  //     if (loadingDoneRef.current) {
  //       applyResults(data);
  //     } else {
  //       fetchedDataRef.current = data;
  //     }
  //   },
  //   [applyResults],
  // );
  // const runFetch = useCallback(
  //   async (text: string, skill: string, k: number) => {
  //     // setShowLoading(true);
  //     const start = Date.now();

  //     const params = new URLSearchParams();
  //     if (text.trim() !== "") params.append("title", text);
  //     if (skill.trim() !== "") params.append("skill", skill);
  //     params.append("top_k", String(k));

  //     try {
  //       const res = await fetch(`/api/patterns?${params.toString()}`);
  //       const data: Pattern[] = await res.json();

  //       const elapsed = Date.now() - start;
  //       const delay = Math.max(0, 800 - elapsed);
  //       await new Promise((r) => setTimeout(r, delay));

  //       setPatterns(data);
  //       setResolved(true);
  //     } catch (err) {
  //       setPatterns([]);
  //       setResolved(true);
  //     } finally {
  //       // setShowLoading(false);
  //       setIsFadingOut(true);
  //       setTimeout(() => {
  //         setShowLoading(false);
  //         setIsFadingOut(false);
  //       }, 300);
  //     }
  //   },
  //   [],
  // );
  const runFetch = useCallback(
    async (text: string, skill: string, k: number) => {
      const start = Date.now();

      const params = new URLSearchParams();
      if (text.trim() !== "") params.append("title", text);
      if (skill.trim() !== "") params.append("skill", skill);
      params.append("top_k", String(k));

      try {
        const res = await fetch(`/api/patterns?${params.toString()}`, {
          headers: { "X-Session-Token": getSessionToken() },
        });
        const data: Pattern[] = await res.json();

        const elapsed = Date.now() - start;
        const minDisplay = 600;
        const delay = Math.max(0, minDisplay - elapsed);
        await new Promise((r) => setTimeout(r, delay));

        setPatterns(data);
        setResolved(true);
      } catch {
        setPatterns([]);
        setResolved(true);
      } finally {
        setIsFadingOut(true);

        setTimeout(() => {
          setShowLoading(false);
          setIsFadingOut(false);
        }, 300);
      }
    },
    [],
  );

  // const handleLoadingDone = useCallback(() => {
  //   loadingDoneRef.current = true;
  //   if (fetchedDataRef.current !== null) {
  //     applyResults(fetchedDataRef.current);
  //     fetchedDataRef.current = null;
  //   }
  // }, [applyResults]);

  // const submitSearch = useCallback(
  //   (text: string, skill: string, k = topK) => {
  //     if (text.trim() === "") return;
  //     setSearchTerm(text);
  //     setResolved(false);
  //     setPatterns([]);
  //     setShowLoading(true);
  //     runFetch(text, skill, k);
  //   },
  //   [runFetch, topK],
  // );
  const submitSearch = useCallback(
    (text: string, skill: string, k = topK) => {
      if (text.trim() === "") return;

      setSearchTerm(text);
      setResolved(false);
      setPatterns([]);

      setIsFadingOut(false);
      setShowLoading(true);

      runFetch(text, skill, k);
    },
    [runFetch, topK],
  );

  const handleSkillChange = useCallback(
    (level: string) => {
      setSkillFilter(level);
      if (searchTerm.trim() === "") return;
      submitSearch(searchTerm, level, topK);
    },
    [searchTerm, topK, submitSearch],
  );

  const handleTopKChange = useCallback(
    (k: number) => {
      setTopK(k);
      if (searchTerm.trim() !== "") {
        submitSearch(searchTerm, skillFilter, k);
      }
    },
    [searchTerm, skillFilter, submitSearch],
  );

  const handleSubmit = useCallback(() => {
    submitSearch(inputValue, skillFilter, topK);
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
    // fetchedDataRef.current = null;
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleChatSearch = useCallback(
    (value: string) => {
      setInputValue(value);
      submitSearch(value, skillFilter);
    },
    [skillFilter, submitSearch],
  );

  const handleVote = useCallback(async (id: number, vote: "up" | "down") => {
    const optimistic = (p: Pattern) => {
      if (p.id !== id) return p;
      const wasVote = p.user_vote;
      const newVote = wasVote === vote ? null : vote;
      const upDelta =
        vote === "up" ? (newVote === "up" ? 1 : -1) : wasVote === "up" ? -1 : 0;
      const downDelta =
        vote === "down"
          ? newVote === "down"
            ? 1
            : -1
          : wasVote === "down"
            ? -1
            : 0;
      return {
        ...p,
        user_vote: newVote as "up" | "down" | null,
        upvotes: Math.max(0, (p.upvotes ?? 0) + upDelta),
        downvotes: Math.max(0, (p.downvotes ?? 0) + downDelta),
      };
    };
    setPatterns((prev) => prev.map(optimistic));
    setFeaturedPatterns((prev) => prev.map(optimistic));

    try {
      const res = await fetch(`/api/patterns/${id}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Token": getSessionToken(),
        },
        body: JSON.stringify({ vote }),
      });
      const data = await res.json();
      const confirm = (p: Pattern) =>
        p.id === id
          ? {
              ...p,
              upvotes: data.upvotes,
              downvotes: data.downvotes,
              user_vote: data.user_vote,
            }
          : p;
      setPatterns((prev) => prev.map(confirm));
      setFeaturedPatterns((prev) => prev.map(confirm));
    } catch {
      const revert = (p: Pattern) => {
        if (p.id !== id) return p;
        const newVote = p.user_vote === vote ? null : vote;
        const upDelta =
          vote === "up"
            ? newVote === null
              ? 1
              : -1
            : p.user_vote === "up"
              ? 1
              : 0;
        const downDelta =
          vote === "down"
            ? newVote === null
              ? 1
              : -1
            : p.user_vote === "down"
              ? 1
              : 0;
        return {
          ...p,
          user_vote: p.user_vote,
          upvotes: Math.max(0, (p.upvotes ?? 0) + upDelta),
          downvotes: Math.max(0, (p.downvotes ?? 0) + downDelta),
        };
      };
      setPatterns((prev) => prev.map(revert));
      setFeaturedPatterns((prev) => prev.map(revert));
    }
  }, []);

  if (useLlm === null) return <></>;

  const hasSearch = searchTerm.trim() !== "";
  const showNoResults = hasSearch && resolved && patterns.length === 0;

  return (
    <>
      {/* {showLoading || isFadingOut) &&
        (isFadingOut &&
          createPortal(
            // <LoadingScreen onDone={handleLoadingDone} />,
            <LoadingScreen fading={isFadingOut} />,
            document.body,
          ))} */}
      {(showLoading || isFadingOut) &&
        createPortal(<LoadingScreen fading={isFadingOut} />, document.body)}

      <div className={`full-body-container ${useLlm ? "llm-mode" : ""}`}>
        <BgDaisies />

        {/* hero landing section */}
        <section className="hero-section">
          {/* watercolor daisies background */}
          <div className="hero-content">
            {/* stems */}
            <path
              d="M90 480 C88 420 78 360 72 290"
              stroke="#a8b870"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M130 500 C128 430 138 370 148 295"
              stroke="#a8b870"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M60 510 C58 460 45 400 30 330"
              stroke="#b8c880"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            {/* leaf on stem 1 */}
            <path
              d="M82 370 C65 355 50 350 45 360 C60 368 75 372 82 370Z"
              fill="#b8c870"
              opacity="0.6"
            />
            {/* leaf on stem 2 */}
            <path
              d="M140 390 C158 375 172 372 174 382 C160 388 146 392 140 390Z"
              fill="#a8b860"
              opacity="0.55"
            />
          </div>
          <div className="hero-content">
            <h1 className="hero-title">Loopsie Daisy</h1>
            <p className="hero-subtitle">Find your perfect crochet pattern</p>
            <button
              className="hero-scroll-btn"
              onClick={() => {
                const target = searchSectionRef.current;
                if (!target) return;
                const top = target.offsetTop;
                window.scrollTo({ top, behavior: "smooth" });
              }}
              aria-label="Scroll to search"
            >
              <span className="hero-scroll-label">Find Patterns</span>
              <span className="hero-scroll-arrow">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <polyline points="19 12 12 19 5 12" />
                </svg>
              </span>
            </button>
          </div>
        </section>

        <header className="app-header">
          <div className="logo-container">
            <span className="app-header-logo">Loopsie Daisy</span>
            {/* <Daisy petalColor="#fdffdc" size={32} />
            <Daisy petalColor="#f8f3f2" size={32} />
            <Daisy petalColor="#edf9b5" size={32} /> */}
          </div>
          <div className="header-flowers" />
          <div className="app-header-icons" />
        </header>

        {/* search */}
        <section className="search-section" ref={searchSectionRef}>
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
                placeholder="Search for patterns"
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

          {!hasSearch && (
            <p className="search-hint-text">
              Try <em>"wavy beachy blue tote bag"</em>,{" "}
              <em>"scary halloween doll"</em>, or{" "}
              <em>"beginner cozy cardigan"</em>
            </p>
          )}

          {hasSearch && (
            <p className="active-search-label">
              Showing results for{" "}
              <strong>
                "{searchTerm}" · {}
              </strong>
              <strong>
                {patterns.length}{" "}
                {patterns.length === 1 ? "pattern" : "patterns"}
              </strong>{" "}
              found
            </p>
          )}
        </section>
        {hasSearch && (
          <div className="topk-container">
            <TopKSelector value={topK} onChange={handleTopKChange} />
          </div>
        )}

        {/* trending strip — always visible when no active search */}
        {!hasSearch && (
          <div className="featured-section">
            <p className="featured-label">
              <span className="featured-label-icon">★</span> Trending patterns
            </p>
            {featuredPatterns.length > 0 ? (
              <div className="featured-scroll">
                {featuredPatterns.map((pattern, i) => (
                  <div className="featured-card-wrap" key={i}>
                    <PolaroidCard
                      pattern={pattern}
                      index={i}
                      onVote={handleVote}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="featured-loading">
                <span>Loading trending patterns…</span>
              </div>
            )}
          </div>
        )}

        {/* polaroid pinboard — only when searching */}
        <div
          className={`patterns-board${hasSearch ? "" : " patterns-board-hidden"}`}
          ref={boardRef}
        >
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

          {resolved &&
            (() => {
              const sorted = [...patterns].sort((a, b) => b.score - a.score);
              const cols: (typeof sorted)[] = Array.from(
                { length: numCols },
                () => [],
              );
              sorted.forEach((p, i) => cols[i % numCols].push(p));
              return cols.map((col, ci) => (
                <div
                  key={ci}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: "1 1 210px",
                    minWidth: 0,
                  }}
                >
                  {col.map((pattern, row) => (
                    <PolaroidCard
                      key={`${ci}-${row}`}
                      pattern={pattern}
                      index={ci + row * numCols}
                      onVote={handleVote}
                    />
                  ))}
                </div>
              ));
            })()}
        </div>

        {useLlm && <Chat onSearchTerm={handleChatSearch} />}

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
