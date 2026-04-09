import React from "react";
import "./LandingPage.css";

interface Props {
  onEnter: () => void;
}

const LandingPage: React.FC<Props> = ({ onEnter }) => {
  return (
    <div className="lp-root">
      {/* scattered background daisies */}
      <div className="lp-bg-daisies" aria-hidden="true">
        {[
          { top: "6%", left: "3%", size: 70, rot: -15 },
          { top: "2%", left: "18%", size: 44, rot: 10 },
          { top: "1%", right: "4%", size: 80, rot: 20 },
          { top: "8%", right: "18%", size: 52, rot: -8 },
          { top: "50%", left: "1%", size: 60, rot: 5 },
          { bottom: "5%", left: "6%", size: 68, rot: -12 },
          { bottom: "2%", right: "5%", size: 74, rot: 18 },
          { bottom: "8%", right: "20%", size: 46, rot: -6 },
          { top: "30%", right: "2%", size: 38, rot: 14 },
          { top: "70%", left: "3%", size: 42, rot: -20 },
        ].map((d, i) => (
          <svg
            key={i}
            className="lp-daisy"
            style={{
              top: d.top,
              left: (d as any).left,
              right: (d as any).right,
              bottom: (d as any).bottom,
              width: d.size,
              height: d.size,
              transform: `rotate(${d.rot}deg)`,
            }}
            viewBox="0 0 60 60"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {Array.from({ length: 8 }).map((_, p) => {
              const a = (p / 8) * Math.PI * 2;
              const cx = 30 + Math.cos(a) * 14,
                cy = 30 + Math.sin(a) * 14;
              return (
                <ellipse
                  key={p}
                  cx={cx}
                  cy={cy}
                  rx="5.5"
                  ry="9"
                  fill="white"
                  fillOpacity="0.75"
                  transform={`rotate(${(p / 8) * 360 + 90} ${cx} ${cy})`}
                />
              );
            })}
            <circle cx="30" cy="30" r="8" fill="#fae05a" fillOpacity="0.9" />
            <circle cx="30" cy="30" r="4.5" fill="#f5a623" fillOpacity="0.9" />
          </svg>
        ))}
      </div>

      {/* center hero */}
      <div className="lp-hero">
        <img
          src="/src/assets/page_logo.svg"
          alt="loopsie daisy"
          className="lp-logo"
        />

        {/* tiny sparkle daisies around the logo */}
        <div className="lp-sparkles" aria-hidden="true">
          <span className="lp-spark lp-spark--1">✦</span>
          <span className="lp-spark lp-spark--2">✦</span>
          <span className="lp-spark lp-spark--3">✦</span>
        </div>

        <button className="lp-btn" onClick={onEnter}>
          Click to Start Stitching!&nbsp;
        </button>
      </div>
    </div>
  );
};

export default LandingPage;
