import { CSSProperties } from "react";

type Props = {
  size?: number;
  variant?: "light" | "dark";
  style?: CSSProperties;
  showWordmark?: boolean;
};

// SOC-AFSEC inline SVG logo (rebuilt from the supplied letterhead).
// `size` controls the height in pixels. The logo scales width-wise.
export function Logo({ size = 48, variant = "light", showWordmark = true, style }: Props) {
  const stroke = variant === "light" ? "#fff" : "#0a0a0a";
  const subText = variant === "light" ? "#f5f5f5" : "#0a0a0a";
  return (
    <div className="flex items-center gap-3" style={style}>
      <svg
        width={size * 2.4}
        height={size}
        viewBox="0 0 240 100"
        aria-label="SOC AFSEC logo"
      >
        {/* Gold slash */}
        <path
          d="M5 75 L30 15 L48 15 L23 75 Z"
          fill="#c9a56a"
        />
        <path
          d="M10 80 L18 60 L34 60 L26 80 Z"
          fill="#8b7355"
        />
        {/* SOC wordmark in a black rounded block */}
        <rect x="55" y="10" width="180" height="55" rx="8" fill={variant === "light" ? "#0a0a0a" : "#0a0a0a"} />
        <text
          x="145"
          y="50"
          textAnchor="middle"
          fontFamily="'Geist', 'Segoe UI', sans-serif"
          fontWeight="900"
          fontSize="36"
          letterSpacing="2"
          fill="#fff"
        >
          SOC
        </text>
        {/* AFSEC */}
        {showWordmark && (
          <>
            <text
              x="135"
              y="92"
              textAnchor="middle"
              fontFamily="'Geist', 'Segoe UI', sans-serif"
              fontWeight="800"
              fontSize="22"
              letterSpacing="3"
              fill={stroke}
            >
              AFSEC
            </text>
            <text
              x="135"
              y="100"
              textAnchor="middle"
              fontFamily="'Geist', 'Segoe UI', sans-serif"
              fontWeight="600"
              fontSize="6"
              letterSpacing="2"
              fill={subText}
            >
              INDUSTRIES
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
