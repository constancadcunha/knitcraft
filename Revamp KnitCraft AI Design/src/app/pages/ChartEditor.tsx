import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useProjects } from '../context/ProjectContext';
import {
  Palette,
  Save,
  Download,
  Clear,
  GridOn,
  Undo,
  Navigation
} from '@mui/icons-material';

const DEFAULT_COLORS = [
  '#c89b7e', '#8b7968', '#f8f4f0', '#a67c5c', '#4a3f35',
  '#d4c4b0', '#9d7a5f', '#6b5d52', '#e8ddd0', '#b89176'
];

export function ChartEditor() {
  const navigate = useNavigate();
  const { addProject } = useProjects();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gridWidth, setGridWidth] = useState(40);
  const [gridHeight, setGridHeight] = useState(40);
  const [cellSize] = useState(15);
  const [grid, setGrid] = useState<number[][]>([]);
  const [currentColor, setCurrentColor] = useState(0);
  const [colors, setColors] = useState<string[]>(DEFAULT_COLORS.slice(0, 5));
  const [isDrawing, setIsDrawing] = useState(false);
  const [chartName, setChartName] = useState('My Chart');
  const [history, setHistory] = useState<number[][][]>([]);

  useEffect(() => {
    const newGrid: number[][] = [];
    for (let row = 0; row < gridHeight; row++) {
      const rowArray: number[] = [];
      for (let col = 0; col < gridWidth; col++) {
        rowArray.push(-1);
      }
      newGrid.push(rowArray);
    }
    setGrid(newGrid);
    setHistory([newGrid]);
  }, [gridWidth, gridHeight]);

  useEffect(() => {
    drawGrid();
  }, [grid, colors, currentColor]);

  const drawGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < gridHeight; row++) {
      for (let col = 0; col < gridWidth; col++) {
        const x = col * cellSize;
        const y = row * cellSize;

        const colorIndex = grid[row]?.[col] ?? -1;
        if (colorIndex >= 0 && colorIndex < colors.length) {
          ctx.fillStyle = colors[colorIndex];
          ctx.fillRect(x, y, cellSize, cellSize);
        }

        ctx.strokeStyle = '#d4c4b0';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, cellSize, cellSize);
      }
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    if (row >= 0 && row < gridHeight && col >= 0 && col < gridWidth) {
      const newGrid = grid.map(r => [...r]);
      newGrid[row][col] = currentColor;
      setGrid(newGrid);
      setHistory([...history, newGrid]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    handleCanvasClick(e);
  };

  const undo = () => {
    if (history.length > 1) {
      const newHistory = history.slice(0, -1);
      setHistory(newHistory);
      setGrid(newHistory[newHistory.length - 1]);
    }
  };

  const clearGrid = () => {
    const newGrid: number[][] = [];
    for (let row = 0; row < gridHeight; row++) {
      const rowArray: number[] = [];
      for (let col = 0; col < gridWidth; col++) {
        rowArray.push(-1);
      }
      newGrid.push(rowArray);
    }
    setGrid(newGrid);
    setHistory([newGrid]);
  };

  const saveChart = () => {
    const project = {
      id: Date.now().toString(),
      name: chartName,
      type: 'knit' as const,
      garmentType: 'custom' as const,
      width: gridWidth,
      height: gridHeight,
      colors: colors,
      grid: grid,
      progress: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addProject(project);
    navigate(`/tracker/${project.id}`);
  };

  const downloadChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `${chartName}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const addColor = () => {
    if (colors.length < 10) {
      setColors([...colors, DEFAULT_COLORS[colors.length % DEFAULT_COLORS.length]]);
    }
  };

  const updateColor = (index: number, color: string) => {
    const newColors = [...colors];
    newColors[index] = color;
    setColors(newColors);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-[#4a3f35]">Chart Editor</h1>
          <p className="text-[#6b5d52] mt-2">Design your own colorwork patterns</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={downloadChart}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-[#e8ddd0] text-[#6b5d52] rounded-xl hover:bg-[#f8f4f0] transition-colors"
          >
            <Download sx={{ fontSize: 20 }} />
            Export PNG
          </button>
          <button
            onClick={saveChart}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#c89b7e] to-[#a67c5c] text-white rounded-xl hover:shadow-lg transition-all font-medium"
          >
            <Save sx={{ fontSize: 20 }} />
            Save & Track
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-8">
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <div className="mb-6 space-y-4">
            <input
              type="text"
              value={chartName}
              onChange={(e) => setChartName(e.target.value)}
              placeholder="Chart name"
              className="w-full px-4 py-3 border-2 border-[#e8ddd0] rounded-xl focus:border-[#c89b7e] focus:outline-none bg-white text-[#4a3f35] font-semibold"
            />

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-[#6b5d52] font-medium">Width:</label>
                <input
                  type="number"
                  value={gridWidth}
                  onChange={(e) => setGridWidth(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  className="w-20 px-3 py-2 border-2 border-[#e8ddd0] rounded-lg focus:border-[#c89b7e] focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-[#6b5d52] font-medium">Height:</label>
                <input
                  type="number"
                  value={gridHeight}
                  onChange={(e) => setGridHeight(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  className="w-20 px-3 py-2 border-2 border-[#e8ddd0] rounded-lg focus:border-[#c89b7e] focus:outline-none"
                />
              </div>
              <button
                onClick={undo}
                disabled={history.length <= 1}
                className="ml-auto p-2.5 bg-[#f8f4f0] text-[#6b5d52] rounded-lg hover:bg-[#e8ddd0] transition-colors disabled:opacity-50"
              >
                <Undo sx={{ fontSize: 20 }} />
              </button>
              <button
                onClick={clearGrid}
                className="p-2.5 bg-[#f8f4f0] text-[#6b5d52] rounded-lg hover:bg-[#e8ddd0] transition-colors"
              >
                <Clear sx={{ fontSize: 20 }} />
              </button>
            </div>
          </div>

          <div className="overflow-auto bg-[#f8f4f0] rounded-xl p-6 border-2 border-[#e8ddd0]">
            <canvas
              ref={canvasRef}
              width={gridWidth * cellSize}
              height={gridHeight * cellSize}
              onMouseDown={(e) => {
                setIsDrawing(true);
                handleCanvasClick(e);
              }}
              onMouseUp={() => setIsDrawing(false)}
              onMouseLeave={() => setIsDrawing(false)}
              onMouseMove={handleMouseMove}
              className="cursor-crosshair shadow-lg"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="text-[#c89b7e]" sx={{ fontSize: 24 }} />
              <h3 className="text-lg font-semibold text-[#4a3f35]">Color Palette</h3>
            </div>

            <div className="space-y-3">
              {colors.map((color, index) => (
                <div key={index} className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentColor(index)}
                    className={`w-12 h-12 rounded-xl shadow-md hover:shadow-lg transition-all border-4 ${
                      currentColor === index ? 'border-[#4a3f35] scale-105' : 'border-white'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => updateColor(index, e.target.value)}
                    className="flex-1 h-10 rounded-lg cursor-pointer"
                  />
                  <span className="text-xs text-[#8b7968] font-mono w-20">{color}</span>
                </div>
              ))}

              {colors.length < 10 && (
                <button
                  onClick={addColor}
                  className="w-full py-3 border-2 border-dashed border-[#c89b7e] text-[#6b5d52] rounded-xl hover:bg-[#f8f4f0] transition-colors font-medium"
                >
                  Add Color ({colors.length}/10)
                </button>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#c89b7e]/10 to-[#a67c5c]/10 rounded-2xl p-6 border border-[#c89b7e]/20">
            <h3 className="font-semibold text-[#4a3f35] mb-3 flex items-center gap-2">
              <GridOn sx={{ fontSize: 20 }} />
              Quick Tips
            </h3>
            <ul className="space-y-2 text-sm text-[#6b5d52]">
              <li>• Click to place a stitch</li>
              <li>• Click and drag to draw</li>
              <li>• Select colors from palette</li>
              <li>• Export as PNG or save to track</li>
              <li>• Use up to 10 colors</li>
            </ul>
          </div>

          <button
            onClick={() => navigate('/tracker/new')}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-[#e8ddd0] text-[#6b5d52] rounded-xl hover:bg-[#f8f4f0] transition-colors font-medium"
          >
            <Navigation sx={{ fontSize: 20 }} />
            Go to Tracker
          </button>
        </div>
      </div>
    </div>
  );
}
