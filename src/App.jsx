import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pencil, Eraser, Plus, Trash2, ChevronLeft, ChevronRight, Palette } from "lucide-react";

export default function WhiteboardApp() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#ffffff");
  const [tool, setTool] = useState("pen");

  const themes = ["#ffffff", "#2f2f2f", "#000000", "#1e3d2f"];
  const [bgColor, setBgColor] = useState(themes[2]);
  const [showThemes, setShowThemes] = useState(false);

  const [slides, setSlides] = useState(() => {
    const saved = localStorage.getItem("whiteboard_slides");
    return saved ? JSON.parse(saved) : [null];
  });

  const [currentSlide, setCurrentSlide] = useState(() => {
    const saved = localStorage.getItem("whiteboard_currentSlide");
    return saved ? JSON.parse(saved) : 0;
  });

  const points = useRef([]);

  // FIX: stable canvas setup (NO auto zoom issue)
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctxRef.current = ctx;

    const width = 900;
    const height = 500;

    canvas.width = width;
    canvas.height = height;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  // Save
  useEffect(() => {
    localStorage.setItem("whiteboard_slides", JSON.stringify(slides));
  }, [slides]);

  useEffect(() => {
    localStorage.setItem("whiteboard_currentSlide", JSON.stringify(currentSlide));
  }, [currentSlide]);

  // Load slide (NO scaling redraw bug)
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (slides[currentSlide]) {
      const img = new Image();
      img.src = slides[currentSlide];
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
  }, [currentSlide, bgColor, slides]);

  // FIXED coordinates (1:1 mapping, no zoom shift)
  const getPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure || 0.5,
    };
  };

  const drawSmoothLine = (ctx, pts) => {
    if (pts.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);

    for (let i = 1; i < pts.length - 1; i++) {
      const midX = (pts[i].x + pts[i + 1].x) / 2;
      const midY = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
    }

    ctx.stroke();
  };

  const saveSlide = () => {
    const canvas = canvasRef.current;
    const data = canvas.toDataURL("image/png");
    const newSlides = [...slides];
    newSlides[currentSlide] = data;
    setSlides(newSlides);
  };

  const startDrawing = (e) => {
    e.preventDefault();

    const ctx = ctxRef.current;
    const p = getPoint(e);

    points.current = [p];

    ctx.strokeStyle = tool === "eraser" ? bgColor : color;
    ctx.lineWidth = tool === "eraser" ? 20 : 3;

    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();

    const ctx = ctxRef.current;
    const p = getPoint(e);

    points.current.push(p);

    ctx.lineWidth = tool === "eraser" ? 20 : 3 * p.pressure * 2;

    drawSmoothLine(ctx, points.current);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;

    points.current = [];
    saveSlide();
    setIsDrawing(false);
  };

  const addSlide = () => {
    saveSlide();
    setSlides([...slides, null]);
    setCurrentSlide(slides.length);
  };

  const deleteSlide = () => {
    if (slides.length === 1) return;
    const newSlides = slides.filter((_, i) => i !== currentSlide);
    setSlides(newSlides);
    setCurrentSlide(Math.max(0, currentSlide - 1));
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      saveSlide();
      setCurrentSlide(currentSlide - 1);
    }
  };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      saveSlide();
      setCurrentSlide(currentSlide + 1);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="flex-1 flex items-center justify-center">
        <Card className="p-4 shadow-xl rounded-2xl">
          <canvas
            ref={canvasRef}
            width={900}
            height={500}
            style={{ touchAction: "none" }}
            className="border rounded-xl cursor-crosshair"
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerLeave={stopDrawing}
          />
        </Card>
      </div>

      <div className="flex justify-center items-center gap-4 p-4 bg-white shadow-md flex-wrap relative">
        <Button onClick={() => setTool("pen")}><Pencil /></Button>
        <Button onClick={() => setTool("eraser")}><Eraser /></Button>

        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />

        <div className="relative">
          <Button onClick={() => setShowThemes(!showThemes)}>
            <Palette />
          </Button>

          {showThemes && (
            <div className="absolute bottom-12 flex gap-2 bg-white p-2 rounded-xl shadow-lg">
              {themes.map((t, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setBgColor(t);
                    setShowThemes(false);
                  }}
                  className="w-6 h-6 rounded-full cursor-pointer border"
                  style={{ backgroundColor: t }}
                />
              ))}
            </div>
          )}
        </div>

        <Button onClick={addSlide}><Plus /></Button>
        <Button onClick={deleteSlide}><Trash2 /></Button>

        <Button onClick={prevSlide}><ChevronLeft /></Button>
        <span className="text-sm font-medium">Slide {currentSlide + 1} / {slides.length}</span>
        <Button onClick={nextSlide}><ChevronRight /></Button>
      </div>
    </div>
  );
}
