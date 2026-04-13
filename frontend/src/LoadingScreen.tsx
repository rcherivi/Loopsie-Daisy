import { useState, useEffect, useRef } from "react";
import "./LoadingScreen.css";

interface Props {
  // onDone: () => void;
  fading?: boolean;
}

function Daisy({
  petalColor,
  size = 64,
}: {
  petalColor: string;
  size?: number;
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
        fill={petalColor}
      />
    );
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {petals}
      <circle cx={c} cy={c} r={cr} fill="#f9e07a" />
    </svg>
  );
}

const FLOWERS = [
  "#f7c9d4", // Azalea blush
  "#c8de9d", // Deco green
  "#f2a0b8", // rose pink
  "#fbffb8", // powder blue
  "#e0eea3", // Tidal lime
];

// export default function LoadingScreen({ onDone }: Props): JSX.Element {
export default function LoadingScreen({ fading }: Props): JSX.Element {
  console.log("LoadingScreen rendered", fading);
  const [dotCount, setDotCount] = useState(1);

  // const onDoneRef = useRef(onDone);
  // useEffect(() => {
  //   onDoneRef.current = onDone;
  // }, [onDone]);

  useEffect(() => {
    const id = setInterval(() => setDotCount((d) => (d % 3) + 1), 500);
    return () => clearInterval(id);
  }, []);

  // useEffect(() => {
  //   const dismiss = setTimeout(() => {
  //     setFading(true);
  //     setTimeout(() => onDoneRef.current(), 350);
  //   }, 1400);
  //   return () => clearTimeout(dismiss);
  // }, []);

  return (
    <div className={`loading-screen${fading ? " fade-out" : ""}`}>
      <header className="loading-header">
        <span className="loading-header-logo">Loopsie Daisy</span>
        <div className="loading-header-icons">
          <button className="loading-header-btn" aria-label="Favourites">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5a2a36"
              strokeWidth="2"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <button className="loading-header-btn" aria-label="Settings">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5a2a36"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      <main className="loading-body">
        <div className="loading-flowers" aria-hidden="true">
          {FLOWERS.map((color, i) => (
            <div className="loading-flower" key={i}>
              <Daisy petalColor={color} size={68} />
            </div>
          ))}
        </div>
        <h2 className="loading-title">Loading{" .".repeat(dotCount)}</h2>
        {/* <p className="loading-subtitle">
          Gently stitching your creative world...
        </p> */}
        {/* <p className="loading-tagline">Est. 2026 &bull; Petal &amp; Purl</p> */}
      </main>

      <footer className="loading-footer">
        <span className="loading-footer-logo">Loopsie Daisy</span>
        {/* <nav className="loading-footer-links">
          <a href="#">About</a>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </nav> */}
      </footer>
    </div>
  );
}
