import { useState, useRef, useEffect } from "react";
import "./App.css";
import { Pattern } from "./types";
import Chat from "./Chat";
import LoadingScreen from "./LoadingScreen";
import LandingPage from "./LandingPage";

function DaisySVG({
  size = 28,
  yellowCenter = true,
}: {
  size?: number;
  yellowCenter?: boolean;
}) {
  const s = size / 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const cx = 30 + Math.cos(a) * 14,
          cy = 30 + Math.sin(a) * 14;
        return (
          <ellipse
            key={i}
            cx={cx}
            cy={cy}
            rx="5.5"
            ry="9"
            fill="white"
            stroke="rgba(200,216,192,0.6)"
            strokeWidth="0.9"
            transform={`rotate(${(i / 8) * 360 + 90} ${cx} ${cy})`}
          />
        );
      })}
      <circle
        cx="30"
        cy="30"
        r="9"
        fill={yellowCenter ? "#fde06a" : "#fce4ec"}
        stroke={yellowCenter ? "#d4a800" : "#f4b8c4"}
        strokeWidth="1.2"
      />
      <circle
        cx="30"
        cy="30"
        r="5"
        fill={yellowCenter ? "#f5a623" : "#e8809c"}
      />
    </svg>
  );
}

function BtnDaisy() {
  return (
    <svg
      width="20"
      height="20"
      className="btn-daisy"
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const cx = 30 + Math.cos(a) * 14,
          cy = 30 + Math.sin(a) * 14;
        return (
          <ellipse
            key={i}
            cx={cx}
            cy={cy}
            rx="5.5"
            ry="9"
            fill="white"
            fillOpacity="0.9"
            transform={`rotate(${(i / 8) * 360 + 90} ${cx} ${cy})`}
          />
        );
      })}
      <circle cx="30" cy="30" r="9" fill="#c8a000" />
      <circle cx="30" cy="30" r="5" fill="#a07800" />
    </svg>
  );
}

// function HeartSVG() {
//   return (
//     <svg
//       className="card-heart"
//       viewBox="0 0 24 24"
//       fill="none"
//       xmlns="http://www.w3.org/2000/svg"
//     >
//       <path
//         d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 13 5.09C14.09 3.81 15.76 3 17.5 3C20.58 3 23 5.42 23 8.5C23 14.5 12 21 12 21Z"
//         fill="#f4b8c4"
//         stroke="#e07898"
//         strokeWidth="1.5"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       />
//     </svg>
//   );
// }

const SKILLS = ["", "Beginner", "Intermediate", "Advanced"];
const PAGE_SIZE = 6;

function App(): JSX.Element {
  const [showLanding, setShowLanding] = useState(true);
  const [useLlm, setUseLlm] = useState<boolean | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [skillFilter, setSkillFilter] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const resultsRef = useRef<HTMLDivElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setUseLlm(d.use_llm));
  }, []);

  const runProgressSteps = () => {
    setSearchProgress(0);
    let i = 0;
    const steps = [20, 40, 60, 80, 100];
    const iv = setInterval(() => {
      if (i < steps.length) {
        setSearchProgress(steps[i]);
        i++;
      } else clearInterval(iv);
    }, 450);
  };

  const fetchPatterns = async (text: string, skill: string) => {
    if (!text.trim() && !skill.trim()) {
      setPatterns([]);
      return;
    }
    setPatterns([]);
    setIsSearching(true);
    setCurrentPage(1);
    runProgressSteps();
    const params = new URLSearchParams();
    if (text.trim()) params.append("title", text);
    if (skill.trim()) params.append("skill", skill);
    try {
      const res = await fetch(`/api/patterns?${params.toString()}`);
      const data = await res.json();
      setPatterns(data);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => {
        setIsSearching(false);
        setSearchProgress(0);
      }, 2500);
    }
  };

  const handleSkillFilter = (skill: string) => {
    setSkillFilter(skill);
    setCurrentPage(1);
    // If no search has happened yet, nothing to do
    if (!hasSearched) return;
    // Re-fetch silently (no loading screen)
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.append("title", searchTerm);
    if (skill.trim()) params.append("skill", skill);
    fetch(`/api/patterns?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setPatterns(data))
      .catch((e) => console.error(e));
  };

  const triggerSearch = () => {
    const val = inputValue.trim();
    setSearchTerm(val);
    if (!val && !skillFilter) return;
    setHasSearched(true);
    fetchPatterns(val, skillFilter);
  };

  const fetchPatternsNoLoading = async (text: string, skill: string) => {
    const params = new URLSearchParams();
    if (text.trim()) params.append("title", text);
    if (skill.trim()) params.append("skill", skill);

    try {
      const res = await fetch(`/api/patterns?${params.toString()}`);
      const data = await res.json();
      setPatterns(data);
    } catch (e) {
      console.error(e);
    }
  };

  // const handleSkillChange = (skill: string) => {
  //   setSkillFilter(skill);
  //   if (hasSearched) fetchPatterns(searchTerm, skill);
  // };
  const handleSkillChange = (skill: string) => {
    setSkillFilter(skill);
    setCurrentPage(1);

    if (hasSearched) {
      fetchPatternsNoLoading(searchTerm, skill);
    }
  };

  const handleBack = () => {
    setHasSearched(false);
    setPatterns([]);
    setInputValue("");
    setSearchTerm("");
    setSkillFilter("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleChatSearch = (term: string) => {
    setInputValue(term);
    setSearchTerm(term);
    setHasSearched(true);
    fetchPatterns(term, skillFilter);
  };

  const totalPages = Math.ceil(patterns.length / PAGE_SIZE);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const visibleCards = patterns.slice(pageStart, pageEnd);

  const goToPage = (p: number) => {
    setCurrentPage(p);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (showLanding) return <LandingPage onEnter={() => setShowLanding(false)} />;
  if (useLlm === null) return <></>;

  return (
    <div className="full-body-container">
      {isSearching && <LoadingScreen progress={searchProgress} />}

      {/* main body */}
      <div className="app-main">
        <h1 className="app-headline">What do you want to stitch today?</h1>

        {/* search bar */}
        <div className="search-wrap">
          <div className="search-row">
            <div className="input-box">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#b8ccc0"
                strokeWidth="2.5"
                strokeLinecap="round"
                style={{ flexShrink: 0 }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                placeholder="Find your next project...   e.g., Easy Red Scarf"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && triggerSearch()}
              />
            </div>
            <button className="search-btn" onClick={triggerSearch}>
              <BtnDaisy />
              Search
            </button>
          </div>
        </div>

        {hasSearched && (
          <button className="back-btn" onClick={handleBack}>
            ← clear search
          </button>
        )}

        {/* filter sidebar */}
        <div className="app-body">
          <aside className="filter-sidebar">
            {/* yellow header */}
            <div className="filter-header">
              {/* <DaisySVG size={26} yellowCenter={true} /> */}
              Filter by:
            </div>

            <div className="filter-body">
              {/* skill level */}
              <div className="filter-section">
                <p className="filter-section-title"> Skill Level</p>
                {SKILLS.map((s) => (
                  <label
                    key={s}
                    className={`filter-option ${skillFilter === s ? "active" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={skillFilter === s}
                      onChange={() =>
                        handleSkillChange(skillFilter === s ? "" : s)
                      }
                    />
                    {s === "" ? "All Levels" : s}
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* cards */}
          <div className="card-grid-wrap">
            {hasSearched && (
              <div className="card-grid-label">Pattern Cards</div>
            )}

            <div className="card-grid">
              {/* {!hasSearched && (
                <div className="empty-hint">
                  <DaisySVG size={52} />
                  <p>type something and hit search!</p>
                </div>
              )} */}

              {hasSearched && patterns.length === 0 && !isSearching && (
                <div className="empty-hint">
                  <DaisySVG size={48} />
                  <p>no patterns found — try a different search 🌼</p>
                </div>
              )}

              {visibleCards.map((p, i) => (
                <div key={i} className="pattern-card">
                  {/* image */}
                  <div className="card-img-wrap">
                    <img
                      src={
                        new URL(
                          `./assets/images/${p.image_path}`,
                          import.meta.url,
                        ).href
                      }
                      alt={p.title}
                    />
                    {/* <div className="card-overlay">
                      <p className="overlay-desc">
                        {p.description || "Cute crochet pattern"}
                      </p>

                      <div className="overlay-info">
                        <span>{p.skill_level || "No Level"}</span>
                        <span>{(p.score * 100).toFixed(0)}% match</span>
                      </div>
                    </div> */}
                    <div className="card-overlay">
                      <p className="overlay-description">{p.description}</p>

                      <a
                        className="overlay-link"
                        href={p.pattern_link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Pattern
                      </a>
                    </div>
                  </div>

                  {/* body */}
                  <div className="card-body">
                    <h3 className="card-title">{p.title}</h3>
                    <div className="card-meta">
                      <span className="card-star"></span>
                      match: {(p.score * 100).toFixed(0)}%
                    </div>
                    {/* <span className="card-badge">{p.skill_level}</span> */}
                    <span className="card-badge">
                      {p.skill_level ? p.skill_level : "No Level"}
                    </span>
                  </div>

                  {/* view pattern */}
                  {/* <a
                    className="card-link"
                    href={p.pattern_link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View Pattern ✦
                  </a> */}
                </div>
              ))}
            </div>

            {/* ── pagination ── */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="page-btn page-btn--arrow"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ‹
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <button
                      key={p}
                      className={`page-btn ${p === currentPage ? "page-btn--active" : ""}`}
                      onClick={() => goToPage(p)}
                    >
                      {p}
                    </button>
                  ),
                )}

                <button
                  className="page-btn page-btn--arrow"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Skill filter */}
      <div>
        <label htmlFor="skill-select">Filter by skill level: </label>
        <select
          id="skill-select"
          value={skillFilter}
          onChange={(e) => {
            const newSkill = e.target.value;
            setSkillFilter(newSkill);
            fetchPatterns(searchTerm, newSkill); // re-run search with new skill filter
          }}
        >
          <option value="">All levels</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>
      </div>

      {/* Search results (always shown) */}
      <div id="answer-box">
        {patterns.map((pattern, index) => (
          <div key={index} className="episode-item">
            <img
              src={
                new URL(
                  `./assets/images/${pattern.image_path}`,
                  import.meta.url,
                ).href
              }
              alt={pattern.title}
              className="episode-image"
            />
            <div className="episode-content">
              <h3 className="episode-title">{pattern.title}</h3>
              <p className="episode-rating">
                Skill Level: {pattern.skill_level}
              </p>
              <div className="episode-desc"> {pattern.description} </div>
              <a
                className="pattern-link"
                href={pattern.pattern_link}
                target="_blank"
                rel="noopener noreferrer"
              >
                {" "}
                Pattern Link
              </a>
              <p className="score">Score: {pattern.score.toFixed(3)}</p>
            </div>
          </div>
          // <div key={index} className="episode-item">
          //   <h3 className="episode-title">{pattern.title}</h3>
          //   <p className="episode-rating">Skill Level: {pattern.skill_level}</p>
          //   <p className="episode-desc">{pattern.description}</p>
          //   <a className="pattern-link" href={pattern.pattern_link}>Pattern Link</a>
          //   <p className="score">Score: {pattern.score.toFixed(3)}</p>
          // </div>
        ))}
      </div>

      {/* Chat (only when USE_LLM = True in routes.py) */}
      {useLlm && <Chat onSearchTerm={handleSearch} />}
    </div>
  );
}

export default App;
