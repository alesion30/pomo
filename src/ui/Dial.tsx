const WEDGE_RADIUS = 36;
const WEDGE_LENGTH = 2 * Math.PI * WEDGE_RADIUS;
const RING_RADIUS = 65;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

export function Dial({
  form,
  minutes,
}: {
  form: "pie" | "ring";
  minutes: number;
}) {
  const angle = (Math.min(Math.max(minutes, 0), 60) / 60) * 360;
  const dashLength =
    (angle / 360) * (form === "pie" ? WEDGE_LENGTH : RING_LENGTH);
  return (
    <div className="dial" aria-hidden="true">
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <g transform="rotate(-90 100 100)">
          <circle className="dial-ticks" cx="100" cy="100" r="93" />
          <circle className="dial-ticks-major" cx="100" cy="100" r="91" />
          {form === "pie" ? (
            <>
              <circle className="dial-face" cx="100" cy="100" r="72" />
              <circle
                className="dial-wedge"
                cx="100"
                cy="100"
                r={WEDGE_RADIUS}
                strokeDasharray={`${dashLength} ${WEDGE_LENGTH}`}
              />
            </>
          ) : (
            <>
              <circle
                className="dial-ring-track"
                cx="100"
                cy="100"
                r={RING_RADIUS}
              />
              <circle
                className="dial-ring"
                cx="100"
                cy="100"
                r={RING_RADIUS}
                strokeDasharray={`${dashLength} ${RING_LENGTH}`}
              />
            </>
          )}
        </g>
        {form === "pie" ? (
          <>
            <line
              className="dial-hand"
              x1="100"
              y1="100"
              x2="100"
              y2="16"
              style={{ transform: `rotate(${angle}deg)` }}
            />
            <circle className="dial-hub" cx="100" cy="100" r="10" />
          </>
        ) : (
          <g className="dial-cup" transform="translate(75 77) scale(2)">
            <path d="M4 10v5a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4v-5H4Z" />
            <path d="M16 11h2a3 3 0 0 1 0 6h-2M7 4v3M11 4v3M15 4v3" />
          </g>
        )}
      </svg>
    </div>
  );
}
