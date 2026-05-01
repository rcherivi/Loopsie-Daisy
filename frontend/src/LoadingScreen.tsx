import { useState, useEffect } from "react";
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
        <div className="loading-header-icons"></div>
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
