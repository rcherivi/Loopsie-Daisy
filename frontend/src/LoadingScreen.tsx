import React from "react";
import "./LoadingScreen.css";

interface Props {
  progress: number;
}

function DaisySVG() {
  return (
    <svg
      className="flower-svg"
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {Array.from({ length: 10 }).map((_, i) => {
        const angle = (i / 10) * 360;
        const rad = (angle * Math.PI) / 180;
        const cx = 30 + Math.cos(rad) * 14,
          cy = 30 + Math.sin(rad) * 14;
        return (
          <ellipse
            key={i}
            cx={cx}
            cy={cy}
            rx="5.5"
            ry="9"
            fill="white"
            stroke="rgba(196,212,192,0.55)"
            strokeWidth="0.9"
            transform={`rotate(${angle + 90} ${cx} ${cy})`}
          />
        );
      })}
      <circle
        cx="30"
        cy="30"
        r="9"
        fill="#fde06a"
        stroke="#d4a800"
        strokeWidth="1.2"
      />
      <circle cx="30" cy="30" r="5" fill="#f5a623" />
      <circle cx="27.5" cy="27.5" r="1.9" fill="rgba(255,255,255,0.45)" />
    </svg>
  );
}

const getLoadingText = (p: number) => {
  if (p < 20) return "gathering yarn...";
  if (p < 40) return "sizing hooks...";
  if (p < 60) return "checking gauges...";
  if (p < 80) return "counting loops...";
  return "ready to crochet!";
};

const LoadingScreen: React.FC<Props> = ({ progress }) => (
  <div className="loading-page">
    <div className="loading-content">
      <div className="loading-top-meta">
        <p className="loading-subtext-meta">LOOPSIE DAISY</p>
        <p className="loading-progress-percent">{progress}%</p>
      </div>
      <h2 className="loading-main-title">{getLoadingText(progress)}</h2>
      <div className="flower-visual-row">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`flower ${progress >= (i + 1) * 20 ? "f100" : ""}`}
          >
            <DaisySVG />
          </div>
        ))}
      </div>
      <div className="segmented-bar-row">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="bar-container">
            <div className={`bar-fill ${progress > i * 20 ? "filled" : ""}`} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default LoadingScreen;
