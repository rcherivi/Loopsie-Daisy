import { useRef } from "react";
const searchSectionRef = useRef<HTMLElement>(null);

type Props = {
  onScrollToSearch: () => void;
};

export default function HeroSection({ onScrollToSearch }: Props) {
    return(
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
    );
}