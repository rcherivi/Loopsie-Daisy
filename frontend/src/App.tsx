import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import "./App.css";
import { Pattern } from "./types";
import Chat from "./Chat";
import LoadingScreen from "./LoadingScreen";

import BgDaisies from "./components/BgDaisies";
import TopKSelector from "./components/TopKSelector";
import PolaroidCard from "./components/PolaroidCard";
import DimensionsPanel from "./components/DimensionsPanel";

/* app */

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

  // add dimensions
  const [showDimensions, setShowDimensions] = useState(false);
  const [topDimensions, setTopDimensions] = useState<any[]>([]);


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
    fetch("/api/patterns/trending?top_k=12")
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
        const res = await fetch(`/api/patterns?${params.toString()}`);
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

  // fetch top latent dimensions - Fiona
  const fetchDimensions = useCallback(async (query: string) => {
    if (!query.trim()) return;

    try {
      const res = await fetch(
        `/api/query-dimensions?title=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      setTopDimensions(data || []);
    } catch (err) {
      setTopDimensions([]);
    }
  }, []);

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
      // add fetch dimensions - Fiona
      fetchDimensions(text); 
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
    try {
      const res = await fetch(`/api/patterns/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote }),
      });
      const data = await res.json();
      const update = (p: Pattern) =>
        p.id === id
          ? { ...p, upvotes: data.upvotes, downvotes: data.downvotes }
          : p;
      setPatterns((prev) => prev.map(update));
      setFeaturedPatterns((prev) => prev.map(update));
    } catch {
      // silently ignore vote errors
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

              <button 
                className="dimensions-toggle-btn"
                onClick={() => setShowDimensions((prev) => !prev)}
              >
                <span className={`dimensions-triangle ${showDimensions ? "open" : ""}`}>
                  ▶
                </span>
                {showDimensions ? "Hide Insights" : "Show Insights"}
              </button>
            </p>
            
            
          )}
        </section>
        
        {/* Top K Selector */}
        {hasSearch && (
          <div className="topk-container">
            <TopKSelector value={topK} onChange={handleTopKChange} />
          </div>
        )}

        {/* SVD latent dimensions */}
        {hasSearch && (
          <div className="dimension-container">
            {showDimensions && (
              <DimensionsPanel data={topDimensions} />
            )}
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
