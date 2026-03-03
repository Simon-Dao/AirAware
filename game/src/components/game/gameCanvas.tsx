import { useEffect, useRef } from "react";

function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const camera = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const WORLD_WIDTH = 5000;
  const WORLD_HEIGHT = 5000;
  const GRID_SIZE = 100;

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

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(-camera.current.x, -camera.current.y);

      ctx.strokeStyle = "#ddd";

      const startX = Math.floor(camera.current.x / GRID_SIZE) * GRID_SIZE;
      const endX = camera.current.x + canvas.width;

      const startY = Math.floor(camera.current.y / GRID_SIZE) * GRID_SIZE;
      const endY = camera.current.y + canvas.height;

      for (let x = startX; x < endX; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, WORLD_HEIGHT);
        ctx.stroke();
      }

      for (let y = startY; y < endY; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WORLD_WIDTH, y);
        ctx.stroke();
      }

      ctx.strokeStyle = "black";
      ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

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
