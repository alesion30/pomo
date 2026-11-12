import type { ReactNode } from "react";

const RADIUS = 92;
const LENGTH = 2 * Math.PI * RADIUS;

export function Dial({
  remaining,
  children,
}: {
  /** 残りの割合。0 で消灯、1 で全周が点く。 */
  remaining: number;
  children: ReactNode;
}) {
  const lit = Math.min(1, Math.max(0, remaining));
  return (
    <div className="dial">
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle className="dial-track" cx="100" cy="100" r={RADIUS} />
        {lit > 0 && (
          <circle
            className="dial-lit"
            cx="100"
            cy="100"
            r={RADIUS}
            strokeDasharray={`${LENGTH * lit} ${LENGTH}`}
            // 消えた分だけ始点を進め、点いた弧の先頭が時計の針のように右回りで進むようにする。
            strokeDashoffset={-LENGTH * (1 - lit)}
          />
        )}
      </svg>
      <div className="dial-center">{children}</div>
    </div>
  );
}
