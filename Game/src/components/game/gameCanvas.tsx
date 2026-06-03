import { useEffect, useRef } from "react";
import { useGameStore } from "../../state/gameState";
import type { AntType } from "../../state/gameState";
import { useUIStore } from "../../state/uiState";
import { TILE_COMPLETION_MS } from "../../state/constants";

// ── World constants ──────────────────────────────────────────────────────────
const GS        = 30;           // grid size (px)
const SURFACE_H = 300;
const WORLD_W   = 3000;
const WORLD_H   = 2200;
const WALK_Y    = SURFACE_H - 8; // y-coord where surface ants walk

// ── Ant movement constants ───────────────────────────────────────────────────
const SPD_TUNNEL   = 42;        // max px/sec underground
const SPD_SURFACE  = 58;        // max px/sec on surface
const STEER        = 260;       // steering acceleration px/sec²
const ARRIVE_R2    = 12 * 12;   // squared arrival radius for tile center

// ── Bug constants ────────────────────────────────────────────────────────────
const MAX_BUGS      = 10;
const BUG_SPD       = 32;
const BUG_HP        = 2.5;
const BUG_W = 11, BUG_H = 7;

// ── Types ────────────────────────────────────────────────────────────────────
type TileMap = Record<number, Record<number, { type: string; completion: number | null; antTypeId?: number }>>;
type PopRec  = { antType: AntType; population: number };

type AntRole = "soldier" | "forager" | "worker" | "generic";

type VAnt = {
  x: number; y: number;
  vx: number; vy: number;
  row: number; col: number;
  tRow: number; tCol: number;
  state: "tunnel" | "surface" | "returning";
  surfaceTimer: number;
  wanderAngle: number;
  carrying: boolean;
  fightTimer: number;
  phase: number;
  spdScale: number;
  prevRow: number; prevCol: number;
  // Per-type visuals & behaviour
  role: AntRole;
  bodyColor: string;
  headColor: string;
  legColor: string;
  bodyW: number;
  bodyH: number;
  surfaceChance: number;  // probability to surface when at row 0
  chaseRadius: number;    // px radius to start chasing bugs
  tunnelSpdMult: number;  // multiplier on SPD_TUNNEL
};

type VBug = {
  x: number; y: number;
  vx: number;
  hp: number;
  dirTimer: number;
  deadTimer: number;
  hitTimer: number;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function isOpen(map: TileMap, r: number, c: number): boolean {
  const t = map[r]?.[c];
  return !!t && t.completion === null && (t.type === "tunnel" || t.type === "nesting_chamber");
}

function adjOpen(map: TileMap, r: number, c: number): [number, number][] {
  return ([ [-1,0],[1,0],[0,-1],[0,1] ] as [number,number][])
    .map(([dr, dc]) => [r + dr, c + dc] as [number, number])
    .filter(([nr, nc]) => isOpen(map, nr, nc));
}

function findEntrance(map: TileMap): [number, number] | null {
  const row0 = map[0];
  if (!row0) return null;
  for (const ck of Object.keys(row0).sort((a, b) => +a - +b)) {
    const t = row0[+ck];
    if (t?.completion === null && (t.type === "tunnel" || t.type === "nesting_chamber"))
      return [0, +ck];
  }
  return null;
}

// Clamp velocity magnitude to maxSpd
function clampSpd(ant: VAnt, maxSpd: number) {
  const spd = Math.sqrt(ant.vx * ant.vx + ant.vy * ant.vy);
  if (spd > maxSpd) { ant.vx = ant.vx / spd * maxSpd; ant.vy = ant.vy / spd * maxSpd; }
}

// Steer toward (dx, dy) with arrival slowdown when dist2 < slowR2
function steerToward(ant: VAnt, dx: number, dy: number, maxSpd: number, dt: number, dist2: number, slowR2: number) {
  const dist = Math.sqrt(dist2);
  const spd = dist2 < slowR2 ? maxSpd * (dist / Math.sqrt(slowR2)) : maxSpd;
  const inv = 1 / (dist || 1);
  const dvx = dx * inv * spd - ant.vx;
  const dvy = dy * inv * spd - ant.vy;
  const steerMag = Math.sqrt(dvx * dvx + dvy * dvy);
  const maxS = STEER * dt;
  if (steerMag > maxS) {
    ant.vx += dvx / steerMag * maxS;
    ant.vy += dvy / steerMag * maxS;
  } else {
    ant.vx += dvx;
    ant.vy += dvy;
  }
}

type AQPalette = {
  skyTop: string; skyBot: string;
  grassBase: string; grassBright: string;
  grassBlade1: string; grassBlade2: string;
  smog: string | null;
};

function aqPalette(pm: number): AQPalette {
  if (pm <= 20)    return { skyTop: "#3a82c4", skyBot: "#9fd8f0", grassBase: "#3a6b1e", grassBright: "#4d8c28", grassBlade1: "#5aa830", grassBlade2: "#3d7a1c", smog: null };
  if (pm <= 35.4)  return { skyTop: "#6a8a50", skyBot: "#b8cc80", grassBase: "#3a5e18", grassBright: "#4a7820", grassBlade1: "#5a9428", grassBlade2: "#3a6a18", smog: "rgba(160,150,60,0.07)" };
  if (pm <= 55.4)  return { skyTop: "#8a7a40", skyBot: "#c8b870", grassBase: "#4a5a14", grassBright: "#5a7018", grassBlade1: "#6a8020", grassBlade2: "#4a6010", smog: "rgba(180,140,40,0.13)" };
  if (pm <= 150.4) return { skyTop: "#7a5a28", skyBot: "#b89050", grassBase: "#504a10", grassBright: "#605814", grassBlade1: "#706018", grassBlade2: "#504810", smog: "rgba(160,100,20,0.20)" };
  return                  { skyTop: "#3a2a1a", skyBot: "#6a4a2a", grassBase: "#3a3010", grassBright: "#4a3c0c", grassBlade1: "#4a3c0c", grassBlade2: "#3a2c08", smog: "rgba(100,60,10,0.32)" };
}

function roleFromType(at: AntType | null): { role: AntRole; bodyColor: string; headColor: string; legColor: string; bodyW: number; bodyH: number; surfaceChance: number; chaseRadius: number; tunnelSpdMult: number } {
  if (!at) return { role: "generic", bodyColor: "#c87941", headColor: "#6a2a08", legColor: "#5a2808", bodyW: 6,   bodyH: 3,   surfaceChance: 0.08, chaseRadius:  80, tunnelSpdMult: 1.0  };
  const n = at.name.toLowerCase();
  // Name-based mapping — canonical roles matching the server seed data
  if (n.includes("soldier")) return { role: "soldier", bodyColor: "#8b1800", headColor: "#500800", legColor: "#6a1000", bodyW: 8,   bodyH: 4,   surfaceChance: 0.12, chaseRadius: 130, tunnelSpdMult: 0.85 };
  if (n.includes("miner"))   return { role: "worker",  bodyColor: "#4a2c0e", headColor: "#2a1206", legColor: "#3a1e08", bodyW: 7,   bodyH: 3.5, surfaceChance: 0.03, chaseRadius:  45, tunnelSpdMult: 1.40 };
  if (n.includes("scout"))   return { role: "forager", bodyColor: "#d4c060", headColor: "#8a7820", legColor: "#b0a030", bodyW: 5,   bodyH: 2.5, surfaceChance: 0.22, chaseRadius:  60, tunnelSpdMult: 1.10 };
  if (n.includes("worker"))  return { role: "generic", bodyColor: "#c87941", headColor: "#6a2a08", legColor: "#5a2808", bodyW: 6,   bodyH: 3,   surfaceChance: 0.08, chaseRadius:  80, tunnelSpdMult: 1.0  };
  // Stat-based fallback for unknown types
  const f = at.foraging, a = at.attack, m = at.mining;
  if (a > f && a > m)  return { role: "soldier", bodyColor: "#8b1800", headColor: "#500800", legColor: "#6a1000", bodyW: 8,   bodyH: 4,   surfaceChance: 0.12, chaseRadius: 130, tunnelSpdMult: 0.85 };
  if (m > f && m > a)  return { role: "worker",  bodyColor: "#4a2c0e", headColor: "#2a1206", legColor: "#3a1e08", bodyW: 7,   bodyH: 3.5, surfaceChance: 0.03, chaseRadius:  45, tunnelSpdMult: 1.40 };
  if (f > m && f > a)  return { role: "forager", bodyColor: "#d4c060", headColor: "#8a7820", legColor: "#b0a030", bodyW: 5,   bodyH: 2.5, surfaceChance: 0.22, chaseRadius:  60, tunnelSpdMult: 1.10 };
  return                       { role: "generic", bodyColor: "#c87941", headColor: "#6a2a08", legColor: "#5a2808", bodyW: 6,   bodyH: 3,   surfaceChance: 0.08, chaseRadius:  80, tunnelSpdMult: 1.0  };
}

function sampleAntType(pop: PopRec[]): AntType | null {
  const total = pop.reduce((s, r) => s + r.population, 0);
  if (total <= 0 || pop.length === 0) return null;
  let rand = Math.random() * total;
  for (const rec of pop) { rand -= rec.population; if (rand <= 0) return rec.antType; }
  return pop[pop.length - 1].antType;
}

function makeAnt(map: TileMap, pop: PopRec[]): VAnt | null {
  const ent = findEntrance(map);
  if (!ent) return null;
  const [er, ec] = ent;
  const adj = adjOpen(map, er, ec);
  const [tr, tc] = adj.length > 0 ? adj[Math.floor(Math.random() * adj.length)] : [er, ec];
  const at = sampleAntType(pop);
  const v  = roleFromType(at);
  return {
    x: ec * GS + GS / 2, y: er * GS + SURFACE_H + GS / 2,
    vx: 0, vy: 0,
    row: er, col: ec, tRow: tr, tCol: tc,
    state: "tunnel",
    surfaceTimer: 0,
    wanderAngle: (Math.random() - 0.5) * Math.PI,
    carrying: false,
    fightTimer: 0,
    phase: Math.random() * Math.PI * 2,
    spdScale: 0.85 + Math.random() * 0.3,
    prevRow: -1, prevCol: -1,
    ...v,
  };
}

function makeBug(): VBug {
  return {
    x: Math.random() * WORLD_W, y: WALK_Y,
    vx: (Math.random() - 0.5) * BUG_SPD * 2,
    hp: BUG_HP, dirTimer: 2 + Math.random() * 3, deadTimer: 0, hitTimer: 0,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
type GameCanvasProps = { zoom: number; onNestClick: (row: number, col: number) => void };

function GameCanvas({ zoom, onNestClick }: GameCanvasProps) {
  const { digTunnel, fillTunnel, cancelTile, completePendingTiles } = useGameStore();
  const { selectedAction } = useUIStore();

  const canvasRef  = useRef<HTMLCanvasElement | null>(null);
  const onNestRef  = useRef(onNestClick);
  onNestRef.current = onNestClick;

  // Visual simulation state — persists across zoom-triggered effect re-runs
  const antsRef    = useRef<VAnt[]>([]);
  const bugsRef    = useRef<VBug[]>([]);
  const entraceRef = useRef<[number, number] | null>(null); // cached entrance
  const entraceAge = useRef(0);

  const camera     = useRef({ x: WORLD_W / 2, y: 0 });
  const isDragging = useRef(false);
  const isPainting = useRef(false);
  const lastMouse  = useRef({ x: 0, y: 0 });
  const keys = useRef({ ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.cursor = selectedAction === "none" ? "grab" : "crosshair";
  }, [selectedAction]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const safeZoom = Math.max(0.5, zoom);
    const NUM_X = Math.floor(WORLD_W / GS);

    const clampCamera = () => {
      const vw = canvas.width / safeZoom, vh = canvas.height / safeZoom;
      camera.current.x = Math.max(0, Math.min(camera.current.x, WORLD_W - vw));
      camera.current.y = Math.max(0, Math.min(camera.current.y, WORLD_H - vh));
    };

    // ── Ant simulation ──────────────────────────────────────────────────────
    const updateAnts = (dt: number, map: TileMap, frame: number) => {
      const ants = antsRef.current;
      const bugs = bugsRef.current;

      // Refresh cached entrance every 90 frames (~1.5s)
      if (frame % 90 === 0) entraceRef.current = findEntrance(map);
      const entrance = entraceRef.current;

      // Scale visual count to population (1 visual ant per 2 real ants, max 50)
      const { getTotalPopulation, population: pop } = useGameStore.getState();
      const targetCount = Math.min(Math.floor(getTotalPopulation() / 2), 50);
      while (ants.length < targetCount) { const a = makeAnt(map, pop); if (!a) break; ants.push(a); }
      if (ants.length > targetCount) ants.length = targetCount;

      for (const ant of ants) {
        ant.fightTimer = Math.max(0, ant.fightTimer - dt);
        ant.phase += dt;

        // ── Tunnel mode ──
        if (ant.state === "tunnel") {
          // Detect tile crossing by grid position — no distance snap possible
          const curRow = Math.floor((ant.y - SURFACE_H) / GS);
          const curCol = Math.floor(ant.x / GS);

          if (curRow === ant.tRow && curCol === ant.tCol) {
            ant.prevRow = ant.row; ant.prevCol = ant.col;
            ant.row = ant.tRow; ant.col = ant.tCol;

            const adj = adjOpen(map, ant.row, ant.col);
            if (ant.row === 0 && Math.random() < ant.surfaceChance) {
              ant.state = "surface";
              ant.surfaceTimer = 9 + Math.random() * 12;
              ant.wanderAngle  = (ant.vx >= 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.4;
              ant.carrying = false;
            } else if (adj.length > 0) {
              const forward = adj.filter(([r, c]) => r !== ant.prevRow || c !== ant.prevCol);
              const candidates = forward.length > 0 ? forward : adj;
              const [nr, nc] = candidates[Math.floor(Math.random() * candidates.length)];
              ant.tRow = nr; ant.tCol = nc;
            }
          }

          // Movement always runs, continuously steers toward target tile center
          if (ant.state === "tunnel") {
            const stx = ant.tCol * GS + GS / 2;
            const sty = ant.tRow * GS + SURFACE_H + GS / 2;
            const sdx = stx - ant.x, sdy = sty - ant.y;
            const sdist2 = sdx * sdx + sdy * sdy;
            const spd = SPD_TUNNEL * ant.spdScale * ant.tunnelSpdMult;
            steerToward(ant, sdx, sdy, spd, dt, sdist2, 1);
            clampSpd(ant, spd);
            ant.x += ant.vx * dt;
            ant.y += ant.vy * dt;
          }

          // If target tile was removed, pick a new one
          if (!isOpen(map, ant.tRow, ant.tCol)) {
            const adj = adjOpen(map, ant.row, ant.col);
            if (adj.length > 0) { [ant.tRow, ant.tCol] = adj[Math.floor(Math.random() * adj.length)]; }
            else if (entrance) { ant.row = entrance[0]; ant.col = entrance[1]; ant.tRow = entrance[0]; ant.tCol = entrance[1]; }
          }

        // ── Surface mode ──
        } else if (ant.state === "surface") {
          // Vertical bob: sine wave offset around walk level
          const bobY = WALK_Y + Math.sin(ant.phase * 6.5) * 1.8;
          const toSurf = bobY - ant.y;
          if (Math.abs(toSurf) > 1) {
            ant.vy += toSurf * 14 * dt;
          } else {
            ant.y = bobY;
            ant.vy *= 0.85;
          }

          // Chase nearest bug within chaseRadius, otherwise wander
          let chaseBug: VBug | null = null;
          let chaseDist2 = ant.chaseRadius * ant.chaseRadius;
          for (const bug of bugs) {
            if (bug.deadTimer > 0) continue;
            const bx = bug.x - ant.x, by = bug.y - ant.y;
            const d2 = bx * bx + by * by;
            if (d2 < chaseDist2) { chaseDist2 = d2; chaseBug = bug; }
          }

          if (chaseBug) {
            // Steer toward bug
            const targetAngle = Math.atan2(chaseBug.y - ant.y, chaseBug.x - ant.x);
            ant.wanderAngle += (targetAngle - ant.wanderAngle) * Math.min(1, 6 * dt);
            if (chaseDist2 < 14 * 14) {
              chaseBug.hp -= dt * 2;
              chaseBug.hitTimer = 0.12;
              ant.fightTimer = 0.25;
              if (chaseBug.hp <= 0) chaseBug.deadTimer = 8;
            }
          } else {
            ant.wanderAngle += (Math.random() - 0.5) * 3.0 * dt;
          }

          // Clamp away from straight up/down, reverse at edges
          ant.wanderAngle = Math.max(-Math.PI * 0.85, Math.min(Math.PI * 0.85, ant.wanderAngle));
          if (ant.x < 30 || ant.x > WORLD_W - 30) {
            ant.wanderAngle = Math.PI - ant.wanderAngle;
            ant.x = Math.max(30, Math.min(WORLD_W - 30, ant.x));
          }

          const desiredVx = Math.cos(ant.wanderAngle) * SPD_SURFACE * ant.spdScale;
          const dvx = desiredVx - ant.vx;
          ant.vx += Math.sign(dvx) * Math.min(Math.abs(dvx), STEER * dt);

          ant.x += ant.vx * dt;
          ant.y += ant.vy * dt;
          ant.surfaceTimer -= dt;
          if (ant.surfaceTimer <= 0) { ant.state = "returning"; ant.carrying = false; }
          if (ant.surfaceTimer < 7) ant.carrying = true;

        // ── Returning mode ──
        } else {
          if (!entrance) { ant.state = "tunnel"; continue; }
          const [er, ec] = entrance;
          const tx = ec * GS + GS / 2;
          const dx = tx - ant.x;
          const dist2 = dx * dx + (WALK_Y - ant.y) * (WALK_Y - ant.y);

          // Steer toward entrance x on the surface
          const dvx = Math.sign(dx) * SPD_SURFACE - ant.vx;
          ant.vx += Math.sign(dvx) * Math.min(Math.abs(dvx), STEER * dt);
          ant.vy += (WALK_Y - ant.y) * 14 * dt;
          ant.vy *= 0.85;
          clampSpd(ant, SPD_SURFACE);
          ant.x += ant.vx * dt;
          ant.y += ant.vy * dt;
          ant.carrying = false;

          // Enter tunnel when close to entrance — no position snap
          if (dist2 < 16 * 16 && isOpen(map, er, ec)) {
            ant.state = "tunnel";
            ant.row = er; ant.col = ec;
            ant.tRow = er; ant.tCol = ec;
            const adj = adjOpen(map, er, ec);
            if (adj.length > 0) { [ant.tRow, ant.tCol] = adj[Math.floor(Math.random() * adj.length)]; }
          }
        }
      }
    };

    // ── Bug simulation ──────────────────────────────────────────────────────
    const updateBugs = (dt: number) => {
      const bugs = bugsRef.current;
      while (bugs.length < MAX_BUGS) bugs.push(makeBug());

      for (const bug of bugs) {
        if (bug.hitTimer > 0) bug.hitTimer -= dt;
        if (bug.deadTimer > 0) {
          bug.deadTimer -= dt;
          if (bug.deadTimer <= 0) {
            bug.x = Math.random() * WORLD_W; bug.y = WALK_Y;
            bug.hp = BUG_HP; bug.hitTimer = 0;
            bug.vx = (Math.random() - 0.5) * BUG_SPD * 2;
            bug.dirTimer = 2 + Math.random() * 3;
          }
          continue;
        }
        bug.x = Math.max(0, Math.min(WORLD_W, bug.x + bug.vx * dt));
        bug.dirTimer -= dt;
        if (bug.dirTimer <= 0 || bug.x <= 0 || bug.x >= WORLD_W) {
          bug.vx = (Math.random() - 0.5) * BUG_SPD * 2;
          bug.dirTimer = 2 + Math.random() * 4;
        }
      }
    };

    // ── Draw ────────────────────────────────────────────────────────────────
    const draw = () => {
      const map = useGameStore.getState().map as TileMap;
      const pal = aqPalette(useGameStore.getState().airQuality);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = pal.skyTop;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.scale(safeZoom, safeZoom);
      ctx.translate(-camera.current.x, -camera.current.y);

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, SURFACE_H);
      skyGrad.addColorStop(0, pal.skyTop);
      skyGrad.addColorStop(1, pal.skyBot);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(camera.current.x, camera.current.y, canvas.width / safeZoom, SURFACE_H);

      // Dirt
      ctx.fillStyle = "#8B5A2B";
      ctx.fillRect(0, SURFACE_H, WORLD_W, WORLD_H - SURFACE_H);

      // Grass base layers
      ctx.fillStyle = pal.grassBase;
      ctx.fillRect(0, SURFACE_H - 10, WORLD_W, 14);
      ctx.fillStyle = pal.grassBright;
      ctx.fillRect(0, SURFACE_H - 14, WORLD_W, 6);

      // Grass blades (only in visible range for performance)
      const camLeft = camera.current.x, camRight = camLeft + canvas.width / safeZoom;
      ctx.lineWidth = 1;
      for (let gx = Math.floor(camLeft / 3) * 3; gx < camRight; gx += 3) {
        const h = 5 + Math.sin(gx * 0.18) * 2 + Math.sin(gx * 0.41) * 1.5;
        const lean = Math.sin(gx * 0.09) * 2.5;
        ctx.strokeStyle = gx % 6 < 3 ? pal.grassBlade1 : pal.grassBlade2;
        ctx.beginPath(); ctx.moveTo(gx, SURFACE_H - 14); ctx.lineTo(gx + lean, SURFACE_H - 14 - h); ctx.stroke();
      }

      // Tiles
      const now = Date.now();
      for (let i = 0; i < 66; i++) {
        for (let j = 0; j < NUM_X; j++) {
          const x = j * GS, y = i * GS + SURFACE_H;
          const tile = map[i]?.[j];
          const pending = tile?.completion != null && tile.completion > now;

          if (pending) {
            const prog = 1 - (tile.completion! - now) / TILE_COMPLETION_MS;
            if (tile.type === "nesting_chamber") {
              ctx.fillStyle = "#2d1040"; ctx.fillRect(x, y, GS, GS);
              ctx.fillStyle = "#a855f7"; ctx.fillRect(x + 1, y + GS - 5, (GS - 2) * prog, 4);
            } else {
              const dig = tile.type === "tunnel";
              ctx.fillStyle = dig ? "#3d0a0a" : "#1a3d0a"; ctx.fillRect(x, y, GS, GS);
              ctx.fillStyle = dig ? "#f87171" : "#4ade80"; ctx.fillRect(x + 1, y + GS - 5, (GS - 2) * prog, 4);
            }
          } else if (tile?.type === "nesting_chamber") {
            ctx.fillStyle = "#2d1b4e"; ctx.fillRect(x, y, GS, GS);
            ctx.fillStyle = "#6b46c1";
            ctx.beginPath();
            ctx.ellipse(x + GS / 2, y + GS / 2, GS * 0.32, GS * 0.22, 0, 0, Math.PI * 2);
            ctx.fill();
            if (tile.antTypeId !== undefined) {
              const typeName = useGameStore.getState().antTypes.find(at => at.id === tile.antTypeId)?.name ?? "";
              if (typeName) {
                const abbr = typeName.slice(0, 3).toUpperCase();
                ctx.font = `bold ${GS * 0.28}px monospace`;
                ctx.textAlign = "left";
                ctx.textBaseline = "top";
                ctx.fillStyle = "#000";
                ctx.fillText(abbr, x + 2.5, y + 2.5);
                ctx.fillStyle = "#c4b5fd";
                ctx.fillText(abbr, x + 2, y + 2);
              }
            }
          } else if (tile?.type === "tunnel") {
            ctx.fillStyle = "#1a0a05"; ctx.fillRect(x, y, GS, GS);
          } else {
            const shade = Math.floor(160 - (i / 66) * 100);
            ctx.fillStyle = `rgb(${shade},${shade * 0.7 | 0},${shade * 0.4 | 0})`;
            ctx.fillRect(x, y, GS, GS);
          }
        }
      }

      // Bugs
      for (const bug of bugsRef.current) {
        if (bug.deadTimer > 5) {
          // Dead bug — squished briefly
          ctx.fillStyle = "#2a1200";
          ctx.fillRect(bug.x - BUG_W * 0.6, bug.y + 1, BUG_W * 1.2, 2);
          continue;
        }
        if (bug.deadTimer > 0) continue;
        const bugCol = bug.hitTimer > 0 ? "#ffffff" : (bug.hp < BUG_HP * 0.4 ? "#ffaa00" : "#22bb22");
        // Body
        ctx.fillStyle = bugCol;
        ctx.fillRect(bug.x - BUG_W / 2, bug.y - BUG_H / 2, BUG_W, BUG_H);
        // Stripe
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(bug.x - BUG_W / 2 + 3, bug.y - BUG_H / 2, BUG_W - 6, BUG_H);
        // Head
        const bFacing = bug.vx >= 0 ? 1 : -1;
        ctx.fillStyle = "#115511";
        ctx.fillRect(bug.x + bFacing * (BUG_W / 2 - 2), bug.y - 2, 3, 4);
        // Legs
        ctx.strokeStyle = "#116611";
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 3; i++) {
          const lx = bug.x + (i - 1) * 3.5;
          ctx.beginPath(); ctx.moveTo(lx, bug.y + 2); ctx.lineTo(lx - 2, bug.y + 5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(lx, bug.y + 2); ctx.lineTo(lx + 2, bug.y + 5); ctx.stroke();
        }
        // HP bar only when hurt
        if (bug.hp < BUG_HP) {
          ctx.fillStyle = "#cc0000";
          ctx.fillRect(bug.x - BUG_W / 2, bug.y - BUG_H / 2 - 4, BUG_W * (bug.hp / BUG_HP), 2);
          ctx.strokeStyle = "#440000";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(bug.x - BUG_W / 2, bug.y - BUG_H / 2 - 4, BUG_W, 2);
        }
      }

      // Ants
      for (const ant of antsRef.current) {
        const fighting = ant.fightTimer > 0;
        const bCol = fighting ? "#ff4400" : ant.bodyColor;
        const hCol = fighting ? "#ff4400" : ant.headColor;
        const lCol = fighting ? "#cc2200" : ant.legColor;
        const bw = ant.bodyW, bh = ant.bodyH;
        const facingRight = ant.vx >= 0;
        const hOff = facingRight ? bw * 0.5 : -bw * 0.5;
        const legPhase = ant.phase * 7;

        // Legs
        ctx.strokeStyle = lCol;
        ctx.lineWidth = ant.role === "soldier" ? 1.0 : 0.8;
        const legSpread = bw * 0.22;
        for (let i = 0; i < 3; i++) {
          const lx = ant.x + (i - 1) * legSpread;
          const swing = Math.sin(legPhase + i * 2.1) * 2.8;
          ctx.beginPath(); ctx.moveTo(lx, ant.y + bh * 0.3); ctx.lineTo(lx - 1.5, ant.y + bh * 0.3 + swing); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(lx, ant.y + bh * 0.3); ctx.lineTo(lx + 1.5, ant.y + bh * 0.3 - swing); ctx.stroke();
        }

        // Dark outline
        ctx.fillStyle = "#0f0400";
        ctx.fillRect(ant.x - bw * 0.5 - 0.5, ant.y - bh * 0.5 - 0.5, bw + 1, bh + 1);
        ctx.fillRect(ant.x + hOff - 1.5 - 0.5, ant.y - bh * 0.5 - 1, 3 + 1, bh + 1);

        // Body
        ctx.fillStyle = bCol;
        ctx.fillRect(ant.x - bw * 0.5, ant.y - bh * 0.5, bw, bh);

        // Head
        ctx.fillStyle = hCol;
        ctx.fillRect(ant.x + hOff - 1.5, ant.y - bh * 0.5 - 0.5, 3, bh + 0.5);

        // Soldier mandibles
        if (ant.role === "soldier") {
          ctx.fillStyle = fighting ? "#ff6600" : "#6a0800";
          const mx = ant.x + hOff + (facingRight ? 1.5 : -1.5);
          ctx.fillRect(mx, ant.y - bh * 0.5 - 1.5, 1.5, 1.5);
          ctx.fillRect(mx, ant.y + bh * 0.5,        1.5, 1.5);
        }

        if (ant.carrying) {
          ctx.fillStyle = "#f0c040";
          ctx.fillRect(ant.x - 2, ant.y - bh * 0.5 - 4, 4, 3);
        }
      }

      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 10 / safeZoom;
      ctx.strokeRect(0, 0, WORLD_W, WORLD_H);

      // Smog overlay — tints the whole scene at bad AQ
      if (pal.smog) {
        ctx.fillStyle = pal.smog;
        ctx.fillRect(camera.current.x, camera.current.y, canvas.width / safeZoom, canvas.height / safeZoom);
      }

      ctx.restore();

      // Vignette
      const grad = ctx.createLinearGradient(0, canvas.height * 0.8, 0, canvas.height);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.4)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    // ── Input ───────────────────────────────────────────────────────────────
    const toGrid = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      return {
        col: Math.floor(((e.clientX - r.left) / safeZoom + camera.current.x) / GS),
        row: Math.floor(((e.clientY - r.top)  / safeZoom + camera.current.y - SURFACE_H) / GS),
      };
    };

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; clampCamera(); draw(); };
    resize();
    window.addEventListener("resize", resize);

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const action = useUIStore.getState().selectedAction;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      if (action === "dig" || action === "fill") {
        isPainting.current = true;
        const { row, col } = toGrid(e);
        if (row >= 0) action === "dig" ? digTunnel(row, col) : fillTunnel(row, col);
      } else if (action === "nest") {
        const { row, col } = toGrid(e);
        if (row >= 0) {
          const tile = useGameStore.getState().map[row]?.[col];
          if (tile?.type === "tunnel" && tile.completion === null) onNestRef.current(row, col);
        }
      } else { isDragging.current = true; canvas.style.cursor = "grabbing"; }
    };

    const onMove = (e: MouseEvent) => {
      if (isPainting.current) {
        const { row, col } = toGrid(e);
        if (row >= 0) {
          const a = useUIStore.getState().selectedAction;
          a === "dig" ? digTunnel(row, col) : fillTunnel(row, col);
        }
      } else if (isDragging.current) {
        camera.current.x -= (e.clientX - lastMouse.current.x) / safeZoom;
        camera.current.y -= (e.clientY - lastMouse.current.y) / safeZoom;
        clampCamera();
        lastMouse.current = { x: e.clientX, y: e.clientY };
      }
    };

    const onUp = () => {
      isDragging.current = false; isPainting.current = false;
      canvas.style.cursor = useUIStore.getState().selectedAction === "none" ? "grab" : "crosshair";
    };

    const onCtx = (e: MouseEvent) => {
      e.preventDefault();
      const { row, col } = toGrid(e);
      if (row >= 0) {
        const tile = useGameStore.getState().map[row]?.[col];
        if (tile?.completion != null && tile.completion > Date.now()) cancelTile(row, col);
      }
    };

    const onKD = (e: KeyboardEvent) => { if (e.key in keys.current) keys.current[e.key as keyof typeof keys.current] = true; };
    const onKU = (e: KeyboardEvent) => { if (e.key in keys.current) keys.current[e.key as keyof typeof keys.current] = false; };

    canvas.addEventListener("mousedown",   onDown);
    canvas.addEventListener("contextmenu", onCtx);
    window.addEventListener("mousemove",   onMove);
    window.addEventListener("mouseup",     onUp);
    window.addEventListener("keydown",     onKD);
    window.addEventListener("keyup",       onKU);

    // ── Main loop ────────────────────────────────────────────────────────────
    const CAM_SPD = 10;
    let lastCheck = 0, lastT = performance.now(), frame = 0;
    let raf: number;

    const loop = (now: number) => {
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      frame++;

      if (keys.current.ArrowUp)    camera.current.y -= CAM_SPD / safeZoom;
      if (keys.current.ArrowDown)  camera.current.y += CAM_SPD / safeZoom;
      if (keys.current.ArrowLeft)  camera.current.x -= CAM_SPD / safeZoom;
      if (keys.current.ArrowRight) camera.current.x += CAM_SPD / safeZoom;
      clampCamera();

      const stamp = Date.now();
      if (stamp - lastCheck > 100) { lastCheck = stamp; completePendingTiles(); }

      const map = useGameStore.getState().map as TileMap;
      updateAnts(dt, map, frame);
      updateBugs(dt);
      draw();

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    const unsub = useGameStore.subscribe(() => draw());

    return () => {
      window.removeEventListener("resize",    resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("keydown",   onKD);
      window.removeEventListener("keyup",     onKU);
      canvas.removeEventListener("mousedown",   onDown);
      canvas.removeEventListener("contextmenu", onCtx);
      cancelAnimationFrame(raf);
      unsub();
    };
  }, [zoom, digTunnel, fillTunnel, cancelTile, completePendingTiles]);

  return <canvas ref={canvasRef} className="absolute inset-0" style={{ background: "white" }} />;
}

export default GameCanvas;
