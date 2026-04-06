import { useEffect, useRef } from "react";
import { useGameStore } from "../../state/gameState";
import { useUIStore } from "../../state/uiState";
import { TILE_COMPLETION_MS } from "../../state/constants";

type GameCanvasProps = {
  zoom: number;
};

function GameCanvas({ zoom }: GameCanvasProps) {
  const { digTunnel, fillTunnel, completePendingTiles } = useGameStore();
  const { selectedAction } = useUIStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const WORLD_WIDTH = 3000;
  const WORLD_HEIGHT = 2200;
  const SURFACE_HEIGHT = 300;
  const GRID_SIZE = 30;

  const NUM_GRID_X = Math.floor(WORLD_WIDTH / GRID_SIZE);

  const camera = useRef({ x: WORLD_WIDTH / 2, y: 0 });
  const isDragging = useRef(false);
  const isPainting = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const keys = useRef({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  });

  // Update cursor when action changes
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

    const clampCamera = (canvas: HTMLCanvasElement) => {
      const viewWidth = canvas.width / safeZoom;
      const viewHeight = canvas.height / safeZoom;

      camera.current.x = Math.max(
        0,
        Math.min(camera.current.x, WORLD_WIDTH - viewWidth)
      );
      camera.current.y = Math.max(
        0,
        Math.min(camera.current.y, WORLD_HEIGHT - viewHeight)
      );
    };

    // Always reads fresh map from store — no stale closure issues
    const draw = () => {
      const map = useGameStore.getState().map;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#87CEEB";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.scale(safeZoom, safeZoom);
      ctx.translate(-camera.current.x, -camera.current.y);

      ctx.fillStyle = "green";
      ctx.fillRect(0, SURFACE_HEIGHT - 5, WORLD_WIDTH, 10);

      ctx.fillStyle = "#8B5A2B";
      ctx.fillRect(0, SURFACE_HEIGHT, WORLD_WIDTH, WORLD_HEIGHT - SURFACE_HEIGHT);

      const now = Date.now();
      for (let i = 0; i < 66; i++) {
        for (let j = 0; j < NUM_GRID_X; j++) {
          const x = j * GRID_SIZE;
          const y = i * GRID_SIZE + SURFACE_HEIGHT;
          const tile = map[i]?.[j];

          const isPending = tile?.completion !== null && tile?.completion !== undefined && tile.completion > now;

          if (isPending) {
            const isDig = tile.type === "tunnel";
            ctx.fillStyle = isDig ? "#3d0a0a" : "#1a3d0a";
            ctx.fillRect(x, y, GRID_SIZE, GRID_SIZE);

            // Progress bar
            const progress = 1 - (tile.completion! - now) / TILE_COMPLETION_MS;
            ctx.fillStyle = isDig ? "#f87171" : "#4ade80";
            ctx.fillRect(x + 1, y + GRID_SIZE - 5, (GRID_SIZE - 2) * progress, 4);
          } else if (tile?.type === "tunnel") {
            ctx.fillStyle = "#1a0a05";
            ctx.fillRect(x, y, GRID_SIZE, GRID_SIZE);
          } else {
            const depth = i / 66;
            const shade = Math.floor(160 - depth * 100);
            ctx.fillStyle = `rgb(${shade}, ${shade * 0.7}, ${shade * 0.4})`;
            ctx.fillRect(x, y, GRID_SIZE, GRID_SIZE);
          }
        }
      }

      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 10 / safeZoom;
      ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      ctx.restore();

      const gradient = ctx.createLinearGradient(
        0,
        canvas.height * 0.8,
        0,
        canvas.height
      );
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, "rgba(0,0,0,0.4)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const mouseToGrid = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const worldX = (e.clientX - rect.left) / safeZoom + camera.current.x;
      const worldY = (e.clientY - rect.top) / safeZoom + camera.current.y;
      return {
        col: Math.floor(worldX / GRID_SIZE),
        row: Math.floor((worldY - SURFACE_HEIGHT) / GRID_SIZE),
      };
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      clampCamera(canvas);
      draw();
    };

    resize();
    window.addEventListener("resize", resize);

    const handleMouseDown = (e: MouseEvent) => {
      const action = useUIStore.getState().selectedAction;
      lastMouse.current = { x: e.clientX, y: e.clientY };

      if (action === "dig" || action === "fill") {
        isPainting.current = true;
        const { row, col } = mouseToGrid(e);
        if (row >= 0) {
          action === "dig" ? digTunnel(row, col) : fillTunnel(row, col);
          draw();
        }
      } else {
        isDragging.current = true;
        canvas.style.cursor = "grabbing";
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPainting.current) {
        const { row, col } = mouseToGrid(e);
        if (row >= 0) {
          const action = useUIStore.getState().selectedAction;
          action === "dig" ? digTunnel(row, col) : fillTunnel(row, col);
          draw();
        }
      } else if (isDragging.current) {
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;

        camera.current.x -= dx / safeZoom;
        camera.current.y -= dy / safeZoom;

        clampCamera(canvas);
        lastMouse.current = { x: e.clientX, y: e.clientY };
        draw();
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      isPainting.current = false;
      const action = useUIStore.getState().selectedAction;
      canvas.style.cursor = action === "none" ? "grab" : "crosshair";
    };

    canvas.style.cursor = "grab";

    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key in keys.current) {
        keys.current[e.key as keyof typeof keys.current] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key in keys.current) {
        keys.current[e.key as keyof typeof keys.current] = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const speed = 10;
    let animationFrame: number;
    let lastCompletionCheck = 0;

    const hasPendingTiles = () => {
      const map = useGameStore.getState().map;
      const now = Date.now();
      for (const row of Object.values(map)) {
        for (const tile of Object.values(row)) {
          if (tile.completion !== null && tile.completion > now) return true;
        }
      }
      return false;
    };

    const update = () => {
      let moved = false;

      if (keys.current.ArrowUp) { camera.current.y -= speed / safeZoom; moved = true; }
      if (keys.current.ArrowDown) { camera.current.y += speed / safeZoom; moved = true; }
      if (keys.current.ArrowLeft) { camera.current.x -= speed / safeZoom; moved = true; }
      if (keys.current.ArrowRight) { camera.current.x += speed / safeZoom; moved = true; }

      const now = Date.now();
      if (now - lastCompletionCheck > 100) {
        lastCompletionCheck = now;
        completePendingTiles();
      }

      if (moved || hasPendingTiles()) {
        clampCamera(canvas);
        draw();
      }

      animationFrame = requestAnimationFrame(update);
    };

    update();

    // Subscribe to map changes so the canvas redraws when tiles are added
    const unsubscribe = useGameStore.subscribe(() => draw());

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      cancelAnimationFrame(animationFrame);
      unsubscribe();
    };
  }, [zoom, digTunnel, fillTunnel, completePendingTiles]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      style={{ background: "white" }}
    />
  );
}

export default GameCanvas;
