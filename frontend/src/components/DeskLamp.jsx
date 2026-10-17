import { useId, useRef, useState } from "react";
import { ArrowDown, Lightbulb, Moon } from "lucide-react";
export default function DeskLamp({ on, onToggle }) {
  const id = useId().replaceAll(":", ""),
    start = useRef(null),
    dragged = useRef(false),
    [pull, setPull] = useState(0);
  function down(e) {
    if (e.button !== 0) return;
    start.current = e.clientY;
    dragged.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e) {
    if (start.current === null) return;
    const amount = Math.max(0, Math.min(70, e.clientY - start.current));
    setPull(amount);
    if (amount > 22) dragged.current = true;
  }
  function up(e) {
    if (start.current === null) return;
    const distance = e.clientY - start.current;
    start.current = null;
    setPull(0);
    if (distance > 22) onToggle();
  }
  return (
    <div
      className={`desk-lamp ${on ? "is-on" : "is-off"}`}
      data-lamp-state={on ? "on" : "off"}
    >
      <div className="lamp-caption">
        <span className="lamp-mini-dot" />
        {on ? "NIGHT SHIFT, GOOD LIGHT." : "A LITTLE LIGHT GOES A LONG WAY."}
      </div>
      <div className="lamp-illustration">
        <svg
          className="lamp-drawing"
          viewBox="0 0 620 550"
          role="img"
          aria-label="An articulated purple desk lamp lighting a parcel and paper trail"
        >
          <defs>
            <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#c0a6e7" />
              <stop offset=".5" stopColor="#9074bc" />
              <stop offset="1" stopColor="#4e3b6c" />
            </linearGradient>
            <linearGradient id={`${id}-arm`}>
              <stop stopColor="#c1a8e1" />
              <stop offset=".5" stopColor="#786092" />
              <stop offset="1" stopColor="#3f314d" />
            </linearGradient>
            <linearGradient id={`${id}-beam`} x1=".5" y1="0" x2=".5" y2="1">
              <stop stopColor="#ffe8a9" stopOpacity=".36" />
              <stop offset="1" stopColor="#ffe8a9" stopOpacity="0" />
            </linearGradient>
            <radialGradient id={`${id}-pool`}>
              <stop stopColor="#ffe4a0" stopOpacity=".7" />
              <stop offset="1" stopColor="#ffe4a0" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${id}-paper`} x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#fff0cc" />
              <stop offset="1" stopColor="#c8b79c" />
            </linearGradient>
          </defs>
          <ellipse
            className="lamp-light-pool"
            cx="366"
            cy="454"
            rx="239"
            ry="70"
            fill={`url(#${id}-pool)`}
          />
          <path
            className="lamp-light-beam"
            d="M287 192L441 216 600 470 161 470Z"
            fill={`url(#${id}-beam)`}
          />
          <path
            d="M37 467L550 467 609 507 68 507Z"
            fill="#3a303d"
            stroke="#6d5968"
            strokeWidth="2"
          />
          <path d="M68 507L609 507 609 521 68 521Z" fill="#241d29" />
          <ellipse cx="153" cy="459" rx="88" ry="20" fill="#18141e" />
          <path
            d="M88 442Q104 418 159 424Q211 426 224 448L220 461Q154 480 87 457Z"
            fill={`url(#${id}-arm)`}
            stroke="#352a41"
            strokeWidth="3"
          />
          <ellipse cx="154" cy="442" rx="63" ry="16" fill="#9e85be" />
          <path
            d="M154 428L115 284 213 152"
            fill="none"
            stroke="#2f243b"
            strokeWidth="26"
            strokeLinecap="round"
          />
          <path
            d="M154 428L115 284 213 152"
            fill="none"
            stroke={`url(#${id}-arm)`}
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path
            d="M168 423L139 290 232 159"
            fill="none"
            stroke="#79608e"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M124 293L147 295M127 305L149 308M131 318L152 321M135 332L155 335M139 345L158 348"
            stroke="#c5abd7"
            strokeWidth="2"
          />
          <circle
            cx="119"
            cy="285"
            r="22"
            fill="#9d80bc"
            stroke="#3b2b49"
            strokeWidth="4"
          />
          <circle cx="119" cy="285" r="9" fill="#4c385e" />
          <circle
            cx="218"
            cy="154"
            r="20"
            fill="#b19acb"
            stroke="#3b2b49"
            strokeWidth="4"
          />
          <path
            d="M218 154Q230 118 276 128L328 146 316 177 251 170Z"
            fill="#78608f"
            stroke="#382942"
            strokeWidth="3"
          />
          <g className="lamp-shade">
            <path
              d="M283 113Q302 94 324 101L359 113Q385 122 385 151L429 209Q363 240 280 193L299 143Z"
              fill={`url(#${id}-shade)`}
              stroke="#35253f"
              strokeWidth="3"
            />
            <path
              d="M299 124Q323 116 348 132"
              fill="none"
              stroke="#e2cef6"
              strokeOpacity=".65"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <ellipse
              cx="353"
              cy="201"
              rx="78"
              ry="19"
              transform="rotate(9 353 201)"
              fill="#3c2a43"
              stroke="#bc9dc9"
              strokeWidth="4"
            />
            <ellipse
              className="lamp-bulb"
              cx="353"
              cy="201"
              rx="65"
              ry="12"
              transform="rotate(9 353 201)"
              fill="#ffe3a0"
            />
          </g>
          <g className="lamp-receipts">
            <path
              d="M302 346L375 332 416 416 341 435Z"
              fill={`url(#${id}-paper)`}
              stroke="#5e4952"
              strokeWidth="2"
            />
            <path
              d="M319 356L363 346M326 370L376 359M333 384L384 373M340 399L374 391"
              stroke="#8f7890"
              strokeWidth="4"
            />
            <path
              d="M382 368L454 351 495 426 420 447Z"
              fill="#ccb9df"
              stroke="#5e4952"
              strokeWidth="2"
            />
            <path
              d="M400 378L444 367M408 392L455 380M416 406L462 394"
              stroke="#7c628e"
              strokeWidth="4"
            />
            <path
              d="M375 333Q399 305 426 347"
              fill="none"
              stroke="#d5f486"
              strokeDasharray="5 6"
              strokeWidth="3"
            />
            <circle cx="375" cy="333" r="5" fill="#d5f486" />
            <circle cx="426" cy="347" r="5" fill="#d5f486" />
          </g>
          <g className="lamp-parcel">
            <path
              d="M261 406L319 389 366 413 308 433Z"
              fill="#d9a17a"
              stroke="#49333d"
              strokeWidth="2"
            />
            <path
              d="M261 406L308 433 308 479 261 450Z"
              fill="#ae735a"
              stroke="#49333d"
              strokeWidth="2"
            />
            <path
              d="M308 433L366 413 366 458 308 479Z"
              fill="#c98a67"
              stroke="#49333d"
              strokeWidth="2"
            />
            <path
              d="M282 400L330 426 330 443 341 439 341 422 293 396Z"
              fill="#e4c4a0"
            />
            <path d="M319 450L350 439 350 453 319 464Z" fill="#f8e7bd" />
            <path
              d="M324 451L343 445M325 456L337 452"
              stroke="#886a65"
              strokeWidth="2"
            />
          </g>
          <path
            d="M486 314L492 328 507 334 492 340 486 355 480 340 465 334 480 328Z"
            fill="#d7ef98"
            className="lamp-spark"
          />
          <circle cx="432" cy="285" r="4" fill="#a68bbd" />
        </svg>
        <button
          className="lamp-pull"
          style={{ "--pull": `${pull}px` }}
          aria-label={on ? "Turn the desk light off" : "Turn the desk light on"}
          aria-pressed={on}
          onKeyDown={() => { dragged.current=false }}
        onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={() => {
            start.current = null;
            setPull(0);
          }}
          onClick={() => {
            if (!dragged.current) onToggle();
            dragged.current = false;
          }}
        >
          <span className="lamp-cord" />
          <span className="lamp-cord-handle" />
          <span className="sr-only">Pull the cord or press Enter</span>
        </button>
        <div className="lamp-pull-hint" aria-hidden="true">
          <ArrowDown size={16} />
          <span>give it a little pull.</span>
        </div>
      </div>
      <div className="lamp-bottom-note">
        <span>{on ? <Lightbulb size={16} /> : <Moon size={16} />}</span>
        <p>
          {on
            ? "Less return drama. More “oh, there it is.”"
            : "The receipts are here. Let’s shed some light."}
        </p>
        <span className="lamp-note-number">01 / CLARITY</span>
      </div>
    </div>
  );
}
