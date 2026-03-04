import { useEffect, useRef } from "react";
import { useGameStore } from "../../state/gameState";

function GameCanvas() {

  const {map} = useGameStore(); 

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const WORLD_WIDTH = 2000;
  const WORLD_HEIGHT = 2200;
  const SURFACE_HEIGHT = 300;
  const GRID_SIZE = 30;
  const NUM_GRID_X = Math.floor(WORLD_WIDTH / GRID_SIZE); 
  const NUM_GRID_Y = Math.floor(WORLD_HEIGHT / GRID_SIZE);

  const camera = useRef({ x: WORLD_WIDTH / 2, y: 0 });
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const clampCamera = (canvas: HTMLCanvasElement) => {
      camera.current.x = Math.max(
        0,
        Math.min(camera.current.x, WORLD_WIDTH - canvas.width),
      );

      camera.current.y = Math.max(
        0,
        Math.min(camera.current.y, WORLD_HEIGHT - canvas.height),
      );
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#87CEEB";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(-camera.current.x, -camera.current.y);

      ctx.fillStyle = "#964B00";
      ctx.fillRect(
        0,
        SURFACE_HEIGHT,
        WORLD_WIDTH,
        WORLD_HEIGHT - SURFACE_HEIGHT,
      );

      ctx.strokeStyle = "#ddd";

      const startX = Math.floor(camera.current.x / GRID_SIZE) * GRID_SIZE;
      const endX = camera.current.x + canvas.width;

      const startY = Math.floor(camera.current.y / GRID_SIZE) * GRID_SIZE;
      const endY = camera.current.y + canvas.height;

      // Vertical grid lines (only below surface)
      // for (let x = startX; x < endX; x += GRID_SIZE) {
      //   ctx.beginPath();
      //   ctx.moveTo(x, SURFACE_HEIGHT);
      //   ctx.lineTo(x, WORLD_HEIGHT);
      //   ctx.stroke();
      // }

      // // Horizontal grid lines (only below surface)
      // for (let y = startY; y < endY; y += GRID_SIZE) {
      //   if (y < SURFACE_HEIGHT) continue;

      //   ctx.beginPath();
      //   ctx.moveTo(0, y);
      //   ctx.lineTo(WORLD_WIDTH, y);
      //   ctx.stroke();
      // }

      //draw entire canvas
      for (let i = 0; i < 66; i++) {
        for (let j = 0; j < NUM_GRID_X; j++) {
          if(map[i][j].type == "none")
            continue 

          ctx.fillStyle = "#000000"
          ctx.fillRect(j*GRID_SIZE, i*GRID_SIZE+SURFACE_HEIGHT, GRID_SIZE, GRID_SIZE)
        }
      }

      ctx.restore();
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
      isDragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = "grabbing";
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;

      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;

      camera.current.x -= dx;
      camera.current.y -= dy;

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

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      style={{ background: "white" }}
    />
  );
}

export default GameCanvas;
