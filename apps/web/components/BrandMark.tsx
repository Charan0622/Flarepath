interface Props {
  size?: number;
  showWord?: boolean;
  wordSize?: number;
  subtitle?: string;
  animated?: boolean;
  hideMark?: boolean; // render just the wordmark (no tile glyph) — useful in page headers where the rail already shows the mark
}

// ─── Flarepath identity ──────────────────────────────────────────
// Layered composition inside a red radial tile:
//   • Top — lit siren dome with yellow radial glow + LED pip + 7 rays
//   • Middle — thin dashed horizon separating the two worlds
//   • Bottom — faceted navigation arrow with compass ticks + motion trail
// Together: "we route emergency response through the city."
export default function BrandMark({
  size = 28,
  showWord = false,
  wordSize = 14,
  subtitle,
  animated = false,
  hideMark = false,
}: Props) {
  // Stable but per-instance gradient IDs prevent SVG defs collisions when
  // multiple BrandMarks render on the same page.
  const uid = `bm-${size}`;

  return (
    <div className="flex items-center gap-2.5">
      {!hideMark && <div
        className="relative rounded-[9px] overflow-hidden shrink-0"
        style={{
          width: size,
          height: size,
          background:
            "radial-gradient(130% 120% at 18% 8%, #fb923c 0%, #ef4444 38%, #b91c1c 78%, #7f1d1d 100%)",
          boxShadow:
            "0 6px 20px rgba(239, 68, 68, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.24), inset 0 -10px 14px rgba(0, 0, 0, 0.3)",
          animation: animated ? "brand-pulse 2.4s ease-in-out infinite" : undefined,
        }}
      >
        {/* Bottom-right inner vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(80% 60% at 100% 100%, rgba(0,0,0,0.28) 0%, transparent 55%)",
          }}
        />
        {/* Top gloss */}
        <div
          className="absolute inset-x-0 top-0 pointer-events-none"
          style={{
            height: "40%",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.26), transparent)",
          }}
        />

        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          className="absolute inset-0"
          style={{ filter: "drop-shadow(0 1px 1.5px rgba(0,0,0,0.4))" }}
        >
          <defs>
            <radialGradient id={`${uid}-bulb`} cx="50%" cy="55%" r="60%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="45%" stopColor="#ffe066" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ffe066" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${uid}-dome`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f1f1f4" />
            </linearGradient>
            <linearGradient id={`${uid}-arrowR`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e4e4e7" />
            </linearGradient>
            <linearGradient id={`${uid}-arrowL`} x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4d4d8" />
              <stop offset="100%" stopColor="#a1a1aa" />
            </linearGradient>
          </defs>

          {/* ── SIREN: aura glow behind the dome ───────────── */}
          <ellipse cx="16" cy="9" rx="12" ry="8" fill={`url(#${uid}-bulb)`} opacity="0.75">
            {animated && (
              <animate
                attributeName="opacity"
                values="0.5;0.9;0.5"
                dur="2.2s"
                repeatCount="indefinite"
              />
            )}
          </ellipse>

          {/* ── SIREN: glow rays (7) ───────────────────────── */}
          <g stroke="#ffffff" strokeLinecap="round">
            <line x1="16" y1="0.8" x2="16" y2="3.2" strokeWidth="1.7" opacity="1">
              {animated && <animate attributeName="opacity" values="0.7;1;0.7" dur="2.2s" repeatCount="indefinite" />}
            </line>
            <line x1="8.2" y1="2.6" x2="9.8" y2="4.4" strokeWidth="1.5" opacity="0.9">
              {animated && <animate attributeName="opacity" values="0.55;0.95;0.55" dur="2.2s" repeatCount="indefinite" />}
            </line>
            <line x1="23.8" y1="2.6" x2="22.2" y2="4.4" strokeWidth="1.5" opacity="0.9">
              {animated && <animate attributeName="opacity" values="0.55;0.95;0.55" dur="2.2s" repeatCount="indefinite" />}
            </line>
            <line x1="3" y1="7.8" x2="5.6" y2="8.4" strokeWidth="1.3" opacity="0.75">
              {animated && <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2.2s" repeatCount="indefinite" />}
            </line>
            <line x1="29" y1="7.8" x2="26.4" y2="8.4" strokeWidth="1.3" opacity="0.75">
              {animated && <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2.2s" repeatCount="indefinite" />}
            </line>
            {/* accent micro-rays */}
            <line x1="5.4" y1="4.4" x2="6.8" y2="5.8" strokeWidth="1" opacity="0.55" />
            <line x1="26.6" y1="4.4" x2="25.2" y2="5.8" strokeWidth="1" opacity="0.55" />
          </g>

          {/* ── SIREN: dome (two-layer for depth) ──────────── */}
          <path
            d="M 9 13 Q 9 4.4 16 4.4 Q 23 4.4 23 13 Z"
            fill={`url(#${uid}-dome)`}
          />
          {/* Dome specular — top-left highlight */}
          <path
            d="M 10.6 11 Q 10.6 6.2 14 5.4"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.65"
          />

          {/* Bulb lens (warm center) + pinpoint highlight */}
          <ellipse cx="16" cy="9.2" rx="3.8" ry="2.5" fill="#fff2b0" />
          <ellipse cx="14.8" cy="8.2" rx="1.3" ry="0.85" fill="#ffffff" />

          {/* LED pip at the crown of the dome */}
          <circle cx="16" cy="4.9" r="1" fill="#ffe066">
            {animated && <animate attributeName="r" values="0.8;1.2;0.8" dur="1.6s" repeatCount="indefinite" />}
          </circle>

          {/* ── SIREN: base plate + bevel ──────────────────── */}
          <rect x="7.4" y="13" width="17.2" height="2.4" rx="0.7" fill="#ffffff" />
          <rect x="7.4" y="13" width="17.2" height="0.6" rx="0.3" fill="#ffffff" opacity="0.4" />

          {/* ── HORIZON: thin dashed seam ──────────────────── */}
          <line
            x1="4" y1="17.3" x2="28" y2="17.3"
            stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round"
            strokeDasharray="1.6 1.8" opacity="0.32"
          />

          {/* ── NAV: compass tick marks (very subtle) ──────── */}
          <g stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" opacity="0.3">
            <line x1="3.2" y1="23.6" x2="5" y2="23.6" />
            <line x1="27" y1="23.6" x2="28.8" y2="23.6" />
            <line x1="16" y1="30.6" x2="16" y2="31.4" />
          </g>

          {/* ── NAVIGATION ARROW: faceted (two-tone) ───────── */}
          {/* Darker (left) half — sits behind for subtle 3D */}
          <path
            d="M 16 18.6 L 9 30.4 L 16 26.2 Z"
            fill={`url(#${uid}-arrowL)`}
          />
          {/* Bright (right) half — in front */}
          <path
            d="M 16 18.6 L 23 30.4 L 16 26.2 Z"
            fill={`url(#${uid}-arrowR)`}
          />
          {/* Central seam — slightly darker edge */}
          <path
            d="M 16 18.8 L 16 26.2"
            stroke="#a1a1aa"
            strokeWidth="0.4"
            opacity="0.7"
          />
          {/* Motion micro-dashes behind the arrow base */}
          <g stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" opacity="0.35">
            <line x1="13" y1="29" x2="14" y2="29" />
            <line x1="18" y1="29" x2="19" y2="29" />
          </g>
        </svg>
      </div>}

      {showWord && (
        <div className="flex flex-col leading-none">
          <span
            className="font-semibold tracking-tight text-white"
            style={{ fontSize: wordSize, letterSpacing: "-0.01em" }}
          >
            Flarepath
          </span>
          {subtitle && (
            <span
              className="font-medium uppercase mt-[3px]"
              style={{
                fontSize: Math.max(9, wordSize - 4),
                letterSpacing: "0.18em",
                color: "#6a6a72",
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
