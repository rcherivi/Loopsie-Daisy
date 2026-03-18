import { useState, useEffect } from "react";
import "./App.css";
import SearchIcon from "./assets/mag.png";
import { Pattern } from "./types";
// import { Episode } from './types'
import Chat from "./Chat";

function App(): JSX.Element {
  const [useLlm, setUseLlm] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [patterns, setPattern] = useState<Pattern[]>([]);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => setUseLlm(data.use_llm));
  }, []);

  const handleSearch = async (value: string): Promise<void> => {
    setSearchTerm(value);
    if (value.trim() === "") {
      setPattern([]);
      return;
    }
    const response = await fetch(
      `/api/episodes?title=${encodeURIComponent(value)}`,
    );
    const data: Pattern[] = await response.json();
    setPattern(data);
  };

  if (useLlm === null) return <></>;

  return (
    <div className={`full-body-container ${useLlm ? "llm-mode" : ""}`}>
      {/* Search bar (always shown) */}
      <div className="top-text">
        <div className="google-colors">
          <h1 id="google-4">4</h1>
          <h1 id="google-3">3</h1>
          <h1 id="google-0-1">0</h1>
          <h1 id="google-0-2">0</h1>
        </div>
        <div
          className="input-box"
          onClick={() => document.getElementById("search-input")?.focus()}
        >
          <img src={SearchIcon} alt="search" />
          <input
            id="search-input"
            placeholder="Search for a easy crochet pattern for a cozy gift"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Search results (always shown) */}
      <div id="answer-box">
        {patterns.map((pattern, index) => (
          <div key={index} className="pattern-item">
            <h3 className="pattern-title">{pattern.title}</h3>
            <p className="pattern-desc">{pattern.descr}</p>
            <p className="pattern-skill-level">
              Skill Level: {pattern.skill_level}
            </p>
            <a className="pattern-link">Pattern Link: {pattern.pattern_link}</a>
            <img
              className="pattern-image"
              src={pattern.image_path}
              alt={pattern.title}
            />
          </div>
        ))}
      </div>

      {/* Chat (only when USE_LLM = True in routes.py) */}
      {useLlm && <Chat onSearchTerm={handleSearch} />}
    </div>
  );
}

export default App;
