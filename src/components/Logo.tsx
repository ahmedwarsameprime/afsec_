import Image from "next/image";
import { CSSProperties } from "react";

type Props = {
  size?: number; // height in px
  variant?: "light" | "dark";
  style?: CSSProperties;
  className?: string;
};

// TEMP: SOC mark hidden. AFSEC-only wordmark for now.
// To restore the full SOC | AFSEC layout, see git history for this file
// (the previous version composited both with a gold divider).
//
// variant="light" (default) → for dark backgrounds (website, CRM, login).
//                              Uses the white AFSEC variant.
// variant="dark"            → for light backgrounds (printed ID cards).
//                              Uses the black AFSEC variant.
const AFSEC_RATIO = 1118 / 240; // ~4.66

export function Logo({ size = 48, variant = "light", style, className }: Props) {
  const afsecSrc =
    variant === "light" ? "/afsec-logo-white.png" : "/afsec-logo-black.png";

  // AFSEC scaled to match the previous combined-logo visual size.
  const h = Math.round(size * 0.78);
  const w = Math.round(size * AFSEC_RATIO * 0.78);

  return (
    <div
      className={`flex items-center ${className ?? ""}`}
      style={style}
      aria-label="AFSEC Industries"
    >
      <Image
        src={afsecSrc}
        alt="AFSEC Industries"
        width={w}
        height={h}
        priority
      />
    </div>
  );
}
