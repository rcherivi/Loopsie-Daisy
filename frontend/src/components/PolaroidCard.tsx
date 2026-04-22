import { useState, useMemo } from "react";
import { Pattern } from "../types";

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

type Props = {
  pattern: Pattern;
  index: number;
  onVote?: (id: number, vote: "up" | "down") => void;
  dimensions?: string[];
};

export default function PolaroidCard({ pattern, onVote, dimensions, }: Props) {
  const { tilt, pin } = useMemo(() => cardStyle(pattern), [pattern]);
  const [flipped, setFlipped] = useState(false);

  return (
    <div className={`polaroid-wrapper ${tilt}`}>
      <Pin colorClass={pin} />

      <div className={`polaroid-flip ${flipped ? "flipped" : ""}`}>

        {/* front side of polaroid card */}
        <div className="polaroid-card front">

          {/* button to flip to other side */}
          <button
            className="flip-btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setFlipped((prev) => !prev);
            }}
            aria-label="Show explanation"
          >
            ?
          </button>

          <div className="polaroid-img-wrap">
            <img
              loading="lazy"
              decoding="async"
              src={
                new URL(`../assets/images/${pattern.image_path}`, import.meta.url)
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
                className="vote-btn vote-up"
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
                className="vote-btn vote-down"
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

        {/* Backside of polaroid card */}
        <div className="polaroid-card back">
          <div className="polaroid-card-body">
            <h3 className="polaroid-card-title">Top Key Words:</h3>
            
            <div className="polaroid-dimension-back">
              {dimensions && dimensions.length > 0 ? (
                <div className="polaroid-dimension-words-container">
                  {dimensions.map((w, i) => (
                    <span key={i} className="polaroid-dimension-word">
                      {w}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="polaroid-dimension-empty">
                  No insights available.
                </p>
              )}

              <button
                className="flip-back-btn"
                onClick={() => setFlipped(false)}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}