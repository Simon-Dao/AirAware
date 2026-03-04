import { useEffect, useRef } from "react";
import { useGameStore } from "../../state/gameState";

type GameCanvasProps = {
  zoom: number;
};

function GameCanvas({ zoom }: GameCanvasProps) {
  const { map } = useGameStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const WORLD_WIDTH = 3000;
  const WORLD_HEIGHT = 2200;
  const SURFACE_HEIGHT = 300;
  const GRID_SIZE = 30;

  const NUM_GRID_X = Math.floor(WORLD_WIDTH / GRID_SIZE);

  const camera = useRef({ x: WORLD_WIDTH / 2, y: 0 });

  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const keys = useRef({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  });

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

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#87CEEB";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();

      ctx.scale(safeZoom, safeZoom);
      ctx.translate(-camera.current.x, -camera.current.y);

      ctx.fillStyle = "green";
      ctx.fillRect(0, SURFACE_HEIGHT - 5, WORLD_WIDTH, 10);

      ctx.fillStyle = "#8B5A2B";
      ctx.fillRect(
        0,
        SURFACE_HEIGHT,
        WORLD_WIDTH,
        WORLD_HEIGHT - SURFACE_HEIGHT
      );

      for (let i = 0; i < 66; i++) {
        for (let j = 0; j < NUM_GRID_X; j++) {
          if (map[i][j].type === "none") continue;

          const depth = i / 66;
          const shade = Math.floor(160 - depth * 100);

          ctx.fillStyle = `rgb(${shade}, ${shade * 0.7}, ${shade * 0.4})`;

          ctx.fillRect(
            j * GRID_SIZE,
            i * GRID_SIZE + SURFACE_HEIGHT,
            GRID_SIZE,
            GRID_SIZE
          );
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

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      clampCamera(canvas);
      draw();
    };

    resize();
    window.addEventListener("resize", resize);

    // Mouse dragging
    const handleMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = "grabbing";
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;

      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;

      camera.current.x -= dx / safeZoom;
      camera.current.y -= dy / safeZoom;

      clampCamera(canvas);

      lastMouse.current = { x: e.clientX, y: e.clientY };

      draw();
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      canvas.style.cursor = "grab";
    };

    canvas.style.cursor = "grab";

    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    // Keyboard controls
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

    // Camera update loop
    const speed = 10;

    let animationFrame: number;

    const update = () => {
      let moved = false;

      if (keys.current.ArrowUp) {
        camera.current.y -= speed / safeZoom;
        moved = true;
      }

      if (keys.current.ArrowDown) {
        camera.current.y += speed / safeZoom;
        moved = true;
      }

      if (keys.current.ArrowLeft) {
        camera.current.x -= speed / safeZoom;
        moved = true;
      }

      if (keys.current.ArrowRight) {
        camera.current.x += speed / safeZoom;
        moved = true;
      }

      if (moved) {
        clampCamera(canvas);
        draw();
      }

      animationFrame = requestAnimationFrame(update);
    };

    update();

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);

      cancelAnimationFrame(animationFrame);
    };
  }, [zoom, map]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      style={{ background: "white" }}
    />
  );
}

export default GameCanvas;