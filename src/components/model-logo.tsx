import { useEffect, useState } from "react";
import { getModelLogo } from "@/lib/model-logos";

export function ModelLogo({
  slug,
  provider,
  size = 40,
  rounded = "rounded-xl",
  className = "",
}: {
  slug: string;
  provider?: string;
  size?: number;
  rounded?: string;
  className?: string;
}) {
  const { src, fallbackSrc, bg, isOfficial } = getModelLogo(slug, provider);
  const [current, setCurrent] = useState(src);
  const [usingFallback, setUsingFallback] = useState(!isOfficial);

  useEffect(() => {
    setCurrent(src);
    setUsingFallback(!isOfficial);
  }, [src, isOfficial]);

  // padding plus généreux pour les icônes monochromes (Simple Icons),
  // moins serré pour les logos Brandfetch déjà cadrés.
  const padding = usingFallback ? Math.round(size * 0.2) : Math.round(size * 0.08);

  return (
    <div
      className={`${rounded} flex items-center justify-center shrink-0 overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        background: usingFallback ? bg : "#ffffff",
        padding,
      }}
    >
      <img
        src={current}
        alt={slug}
        loading="lazy"
        onError={() => {
          if (!usingFallback && current !== fallbackSrc) {
            setCurrent(fallbackSrc);
            setUsingFallback(true);
          }
        }}
        className="w-full h-full object-contain"
        style={{
          filter: usingFallback ? "drop-shadow(0 1px 1px rgba(0,0,0,0.15))" : "none",
        }}
      />
    </div>
  );
}
