import Image from "next/image";
import { CSSProperties } from "react";

type Props = {
  size?: number; // height in px
  variant?: "light" | "dark";
  style?: CSSProperties;
  className?: string;
};

// SOC ▍ AFSEC combined wordmark.
// Two separate artworks composited side-by-side with a thin gold divider.
//
// variant="light" (default) → for dark backgrounds (website, CRM, login).
//                              Uses the white AFSEC variant.
// variant="dark"            → for light backgrounds (printed ID cards).
//                              Uses the black AFSEC variant.
//
// The SOC logo already has its own dark rectangle so it works on both.
const SOC_RATIO = 406 / 105;     // ~3.87
const AFSEC_RATIO = 1118 / 240;  // ~4.66

export function Logo({ size = 48, variant = "light", style, className }: Props) {
  const afsecSrc =
    variant === "light" ? "/afsec-logo-white.png" : "/afsec-logo-black.png";

  const dividerColor = variant === "light" ? "#c9a56a" : "#8b6b32";

  return (
    <div
      className={`flex items-center gap-3 ${className ?? ""}`}
      style={style}
      aria-label="SOC AFSEC Industries"
    >
      <Image
        src="/soc-logo.png"
        alt="SOC"
        width={Math.round(size * SOC_RATIO)}
        height={size}
        priority
      />
      <span
        aria-hidden
        className="inline-block rounded-full"
        style={{
          width: 2,
          height: Math.round(size * 0.7),
          backgroundColor: dividerColor,
          opacity: 0.85,
        }}
      />
      <Image
        src={afsecSrc}
        alt="AFSEC Industries"
        width={Math.round(size * AFSEC_RATIO * 0.78)}
        height={Math.round(size * 0.78)}
        priority
      />
    </div>
  );
}
