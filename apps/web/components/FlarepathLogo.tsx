"use client";

import Image from "next/image";

interface Props {
  size?: number;
  className?: string;
}

export default function FlarepathLogo({ size = 40, className = "" }: Props) {
  return (
    <Image
      src="/logo-sm.png"
      alt="Flarepath"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
