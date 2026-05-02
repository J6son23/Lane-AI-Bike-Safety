import { SVGProps } from "react";

export function BadgeLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      {...props}
    >
      {/* Outer Shield/Badge */}
      <path
        d="M50 5 L90 20 V50 C90 75 50 95 50 95 C50 95 10 75 10 50 V20 L50 5 Z"
        fill="currentColor"
        className="text-foreground dark:text-foreground"
      />
      {/* Inner Accent Line */}
      <path
        d="M50 12 L82 25 V48 C82 68 50 86 50 86 C50 86 18 68 18 48 V25 L50 12 Z"
        fill="transparent"
        stroke="hsl(var(--primary))"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* Bike Graphic / Chevron */}
      <circle cx="35" cy="55" r="7" stroke="hsl(var(--background))" strokeWidth="3" fill="transparent" />
      <circle cx="65" cy="55" r="7" stroke="hsl(var(--background))" strokeWidth="3" fill="transparent" />
      <path
        d="M35 55 L45 40 L60 40 M45 40 L50 30"
        stroke="hsl(var(--background))"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
