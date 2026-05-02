import { SVGProps } from "react";

export function BadgeLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      {...props}
    >
      {/* Outer Shield — dark charcoal regardless of context */}
      <path
        d="M50 5 L90 20 V50 C90 75 50 95 50 95 C50 95 10 75 10 50 V20 L50 5 Z"
        fill="#1a2e1a"
      />
      {/* Inner Accent — accent green chevron */}
      <path
        d="M50 12 L82 25 V48 C82 68 50 86 50 86 C50 86 18 68 18 48 V25 L50 12 Z"
        fill="transparent"
        stroke="#4caf50"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* Bicycle graphic — white so it's visible on the dark badge */}
      <circle cx="35" cy="58" r="7" stroke="#ffffff" strokeWidth="3" fill="transparent" />
      <circle cx="65" cy="58" r="7" stroke="#ffffff" strokeWidth="3" fill="transparent" />
      <path
        d="M35 58 L45 43 L60 43 M45 43 L50 33"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
