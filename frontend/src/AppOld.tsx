import { useState, useRef, useEffect } from "react";
import "./App.css";
import PageLogo from "./assets/page_logo.svg";
import { Pattern } from "./types";
import Chat from "./Chat";
import LoadingScreen from "./LoadingScreen";
import LandingPage from "./LandingPage";

/* ─────────────────────────────────────────
   SVG helpers
───────────────────────────────────────── */

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

function HeartSVG() {
  return (
    <svg
      className="card-heart"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 13 5.09C14.09 3.81 15.76 3 17.5 3C20.58 3 23 5.42 23 8.5C23 14.5 12 21 12 21Z"
        fill="#f4b8c4"
        stroke="#e07898"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─────────────────────────────────────────
   Main App
───────────────────────────────────────── */

const SKILLS = ["", "Beginner", "Intermediate", "Advanced"];

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

  const triggerSearch = () => {
    const val = inputValue.trim();
    setSearchTerm(val);
    if (!val && !skillFilter) return;
    setHasSearched(true);
    fetchPatterns(val, skillFilter);
  };

  const handleSkillChange = (skill: string) => {
    setSkillFilter(skill);
    if (hasSearched) fetchPatterns(searchTerm, skill);
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

  if (showLanding) return <LandingPage onEnter={() => setShowLanding(false)} />;
  if (useLlm === null) return <></>;

  return (
    <div className="full-body-container">
      {isSearching && <LoadingScreen progress={searchProgress} />}

      {/* ══ WHITE HEADER ══ */}
      <div className="app-header">
        <img src={PageLogo} alt="Loopsie Daisy" className="app-logo-img" />
      </div>

      {/* ══ MAIN ══ */}
      <div className="app-main">
        <h1 className="app-headline">What do you want to stitch today?</h1>

        {/* search */}
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
                placeholder="Find your next project... e.g., Beginner Chunky Blanket Free"
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

        {/* ══ SIDEBAR + GRID ══ */}
        <div className="app-body">
          {/* ── FILTER SIDEBAR ── */}
          <aside className="filter-sidebar">
            {/* yellow header */}
            <div className="filter-header">
              <DaisySVG size={26} yellowCenter={true} />
              Filter by:
            </div>

            <div className="filter-body">
              {/* skill level */}
              <div className="filter-section">
                <p className="filter-section-title">
                  <DaisySVG size={18} yellowCenter={true} />
                  Skill Level
                </p>
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

          {/* ── CARD GRID ── */}
          <div className="card-grid-wrap">
            {hasSearched && (
              <div className="card-grid-label">Pattern Cards</div>
            )}

            <div className="card-grid">
              {!hasSearched && (
                <div className="empty-hint">
                  <DaisySVG size={52} />
                  <p>type something and hit search!</p>
                </div>
              )}

              {hasSearched && patterns.length === 0 && !isSearching && (
                <div className="empty-hint">
                  <DaisySVG size={48} />
                  <p>no patterns found — try a different search 🌼</p>
                </div>
              )}

              {patterns.map((p, i) => (
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
                    <span className="card-badge card-badge--free">Free</span>
                  </div>

                  {/* body */}
                  <div className="card-body">
                    <h3 className="card-title">{p.title}</h3>
                    <div className="card-meta">
                      <span className="card-star">★</span>
                      5.0 &nbsp;·&nbsp; match: {(p.score * 100).toFixed(0)}%
                    </div>
                    <div className="card-footer">
                      <span className="card-skill">{p.skill_level}</span>
                      <HeartSVG />
                    </div>
                  </div>

                  {/* yellow "View Pattern" button at card bottom */}
                  <a
                    className="card-link"
                    href={p.pattern_link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View Pattern ✦
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {useLlm && <Chat onSearchTerm={handleChatSearch} />}
    </div>
  );
}

export default App;
