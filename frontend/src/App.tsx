import { useState, useEffect } from "react";
import "./App.css";
import SearchIcon from "./assets/mag.png";
import PageLogo from "./assets/page_logo.svg";
import { Pattern } from "./types";
import Chat from "./Chat";

function App(): JSX.Element {
  const [useLlm, setUseLlm] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [skillFilter, setSkillFilter] = useState<string>("");

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => setUseLlm(data.use_llm));
  }, []);

  const fetchPatterns = async (text: string, skill: string) => {
    const params = new URLSearchParams();
    if (text.trim() !== "") {
      params.append("title", text);
    }
    if (skill.trim() !== "") {
      params.append("skill", skill);
    }
    const response = await fetch(`/api/patterns?${params.toString()}`);
    const data = await response.json();
    setPatterns(data);
  };

  const handleSearch = async (value: string): Promise<void> => {
    setSearchTerm(value);
    if (value.trim() === "") {
      setPatterns([]);
      return;
    }
    fetchPatterns(value, skillFilter);
  };

  if (useLlm === null) return <></>;

  return (
    <div className={`full-body-container ${useLlm ? "llm-mode" : ""}`}>
      {/* Search bar (always shown) */}
      <div className="top-text">
        <img src={PageLogo} alt="loopsie daisy" className="header-image" />
        <div
          className="input-box"
          onClick={() => document.getElementById("search-input")?.focus()}
        >
          <img src={SearchIcon} alt="search" />
          <input
            id="search-input"
            placeholder="Search for a crochet pattern..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
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
