import { Plane } from 'lucide-react';

function RouteDrawing({ side }: { side: 'left' | 'right' }) {
  const patternId = `route-dots-${side}`;

  return (
    <svg
      viewBox="0 0 320 900"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full text-muted-foreground/25"
    >
      <defs>
        <pattern id={patternId} width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="currentColor" opacity="0.45" />
        </pattern>
      </defs>
      <rect width="320" height="900" fill={`url(#${patternId})`} />

      <g stroke="currentColor" strokeWidth="1">
        <circle cx={side === 'left' ? '-70' : '390'} cy="450" r="330" />
        <circle cx={side === 'left' ? '-70' : '390'} cy="450" r="240" />
        <circle cx={side === 'left' ? '-70' : '390'} cy="450" r="150" />
        <path d="M-40 360C80 290 240 290 360 360M-40 540C80 610 240 610 360 540" />
        <path d="M160-40C40 180 40 720 160 940" opacity="0.5" />
        <path d="M250-40C130 180 130 720 250 940" opacity="0.5" />
      </g>

      <g stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 8">
        {side === 'left' ? (
          <>
            <path d="M-30 100C220 110 260 220 180 310S-20 450 70 600S280 740 350 810" />
            <path d="M-60 770C180 720 320 520 350 260" opacity="0.6" />
          </>
        ) : (
          <>
            <path d="M350 80C110 180 60 260 160 410S330 580 230 700S50 810-30 850" />
            <path d="M-30 180C180 300 250 520 350 590" opacity="0.6" />
          </>
        )}
      </g>

      <g fill="var(--background)" stroke="currentColor" strokeWidth="1.5">
        <circle cx={side === 'left' ? '180' : '160'} cy={side === 'left' ? '310' : '410'} r="8" />
        <circle cx={side === 'left' ? '70' : '230'} cy={side === 'left' ? '600' : '700'} r="8" />
      </g>
      <g fill="currentColor">
        <circle cx={side === 'left' ? '180' : '160'} cy={side === 'left' ? '310' : '410'} r="2.5" />
        <circle cx={side === 'left' ? '70' : '230'} cy={side === 'left' ? '600' : '700'} r="2.5" />
      </g>
      <g fill="currentColor" className="font-mono text-[11px] tracking-[0.16em]">
        <text x={side === 'left' ? '198' : '178'} y={side === 'left' ? '314' : '414'}>
          {side === 'left' ? 'MOW' : 'TYO'}
        </text>
        <text x={side === 'left' ? '88' : '174'} y={side === 'left' ? '604' : '704'}>
          {side === 'left' ? 'IST' : 'SVX'}
        </text>
      </g>
    </svg>
  );
}

export function PageBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 hidden overflow-hidden xl:block"
    >
      <div className="absolute inset-y-0 left-0 w-[calc((100vw_-_64rem)/2)] overflow-hidden bg-linear-to-r from-muted/70 to-background">
        <RouteDrawing side="left" />
        <Plane className="absolute top-[19%] left-[28%] size-7 rotate-30 text-muted-foreground/30" />
        <Plane className="absolute top-[77%] left-[68%] size-5 -rotate-45 text-muted-foreground/20" />
      </div>
      <div className="absolute inset-y-0 right-0 w-[calc((100vw_-_64rem)/2)] overflow-hidden bg-linear-to-l from-muted/70 to-background">
        <RouteDrawing side="right" />
        <Plane className="absolute top-[25%] right-[32%] size-6 -rotate-30 text-muted-foreground/25" />
        <Plane className="absolute top-[70%] right-[60%] size-7 rotate-150 text-muted-foreground/30" />
      </div>
    </div>
  );
}
