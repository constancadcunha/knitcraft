import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useProjects } from '../context/ProjectContext';
import {
  ArrowBack,
  CheckCircle,
  RadioButtonUnchecked,
  PlayArrow,
  NavigateNext,
  Info,
  YouTube,
  Help,
  Description,
  ZoomIn,
  ZoomOut
} from '@mui/icons-material';

export function PatternTracker() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProject, updateProject } = useProjects();
  const project = getProject(id || '');

  const fullCanvasRef = useRef<HTMLCanvasElement>(null);
  const rowCanvasRef = useRef<HTMLCanvasElement>(null);

  const [currentSection, setCurrentSection] = useState(0);
  const [completedStitches, setCompletedStitches] = useState<Set<string>>(new Set());
  const [showInstructions, setShowInstructions] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [showAbbreviations, setShowAbbreviations] = useState(false);

  useEffect(() => {
    if (project && project.progress) {
      const completed = new Set(
        project.progress
          .filter(p => p.completed)
          .map(p => `${p.row}-${p.stitch}`)
      );
      setCompletedStitches(completed);
    }
  }, [project]);

  useEffect(() => {
    drawFullPattern();
    drawRowView();
  }, [project, completedStitches, currentSection, selectedRow, zoom]);

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-[#6b5d52] mb-6">Project not found</p>
        <Link to="/projects" className="text-[#c89b7e] hover:underline">
          Back to Projects
        </Link>
      </div>
    );
  }

  const sections = project.sections || [
    {
      id: 'main',
      name: project.name,
      width: project.width,
      height: project.height,
      grid: project.grid,
      completed: false,
      currentRow: 0,
    },
  ];

  const currentSectionData = sections[currentSection];
  const cellSize = 20 * zoom;

  const drawFullPattern = () => {
    const canvas = fullCanvasRef.current;
    if (!canvas || !currentSectionData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = currentSectionData.width;
    const height = currentSectionData.height;

    canvas.width = width * cellSize;
    canvas.height = height * cellSize;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const x = col * cellSize;
        const y = row * cellSize;

        const stitchKey = `${row}-${col}`;
        const isCompleted = completedStitches.has(stitchKey);

        const colorIndex = currentSectionData.grid[row]?.[col] ?? 0;
        const baseColor = project.colors[colorIndex] || '#c89b7e';

        ctx.fillStyle = isCompleted ? '#d4c4b0' : baseColor;
        ctx.fillRect(x, y, cellSize, cellSize);

        ctx.strokeStyle = isCompleted ? '#b0a090' : '#8b7968';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellSize, cellSize);

        if (isCompleted) {
          ctx.fillStyle = '#8b7968';
          ctx.font = `${cellSize * 0.6}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✓', x + cellSize / 2, y + cellSize / 2);
        }
      }
    }
  };

  const drawRowView = () => {
    const canvas = rowCanvasRef.current;
    if (!canvas || !currentSectionData || selectedRow === null) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = currentSectionData.width;
    const rowCellSize = 30;

    canvas.width = width * rowCellSize;
    canvas.height = rowCellSize;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let col = 0; col < width; col++) {
      const x = col * rowCellSize;
      const y = 0;

      const stitchKey = `${selectedRow}-${col}`;
      const isCompleted = completedStitches.has(stitchKey);

      const colorIndex = currentSectionData.grid[selectedRow]?.[col] ?? 0;
      const baseColor = project.colors[colorIndex] || '#c89b7e';

      ctx.fillStyle = isCompleted ? '#d4c4b0' : baseColor;
      ctx.fillRect(x, y, rowCellSize, rowCellSize);

      ctx.strokeStyle = isCompleted ? '#b0a090' : '#8b7968';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, rowCellSize, rowCellSize);

      if (isCompleted) {
        ctx.fillStyle = '#8b7968';
        ctx.font = `${rowCellSize * 0.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', x + rowCellSize / 2, y + rowCellSize / 2);
      }
    }
  };

  const handleFullCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = fullCanvasRef.current;
    if (!canvas || !currentSectionData) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    if (row >= 0 && row < currentSectionData.height && col >= 0 && col < currentSectionData.width) {
      const stitchKey = `${row}-${col}`;
      const newCompleted = new Set(completedStitches);

      if (newCompleted.has(stitchKey)) {
        newCompleted.delete(stitchKey);
      } else {
        newCompleted.add(stitchKey);
      }

      setCompletedStitches(newCompleted);
      updateProjectProgress(newCompleted);
    }
  };

  const handleRowCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = rowCanvasRef.current;
    if (!canvas || !currentSectionData || selectedRow === null) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const rowCellSize = 30;

    const col = Math.floor(x / rowCellSize);

    if (col >= 0 && col < currentSectionData.width) {
      const stitchKey = `${selectedRow}-${col}`;
      const newCompleted = new Set(completedStitches);

      if (newCompleted.has(stitchKey)) {
        newCompleted.delete(stitchKey);
      } else {
        newCompleted.add(stitchKey);
      }

      setCompletedStitches(newCompleted);
      updateProjectProgress(newCompleted);
    }
  };

  const toggleRow = (row: number) => {
    const newCompleted = new Set(completedStitches);
    let allCompleted = true;

    for (let col = 0; col < currentSectionData.width; col++) {
      const stitchKey = `${row}-${col}`;
      if (!newCompleted.has(stitchKey)) {
        allCompleted = false;
        break;
      }
    }

    for (let col = 0; col < currentSectionData.width; col++) {
      const stitchKey = `${row}-${col}`;
      if (allCompleted) {
        newCompleted.delete(stitchKey);
      } else {
        newCompleted.add(stitchKey);
      }
    }

    setCompletedStitches(newCompleted);
    updateProjectProgress(newCompleted);
  };

  const updateProjectProgress = (completed: Set<string>) => {
    const progress = Array.from(completed).map(key => {
      const [row, stitch] = key.split('-').map(Number);
      return { row, stitch, completed: true };
    });

    updateProject(project.id, { progress });
  };

  const getRowProgress = (row: number) => {
    let completed = 0;
    for (let col = 0; col < currentSectionData.width; col++) {
      if (completedStitches.has(`${row}-${col}`)) {
        completed++;
      }
    }
    return { completed, total: currentSectionData.width };
  };

  const abbreviations = [
    { abbr: 'K', full: 'Knit', hasVideo: true },
    { abbr: 'P', full: 'Purl', hasVideo: true },
    { abbr: 'K2tog', full: 'Knit 2 together', hasVideo: true },
    { abbr: 'SSK', full: 'Slip, slip, knit', hasVideo: true },
    { abbr: 'M1', full: 'Make 1 stitch', hasVideo: true },
    { abbr: 'YO', full: 'Yarn over', hasVideo: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/projects')}
            className="p-2 hover:bg-[#e8ddd0] rounded-lg transition-colors"
          >
            <ArrowBack className="text-[#6b5d52]" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-[#4a3f35]">{project.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-[#8b7968]">
              <span className="capitalize">{project.type}</span>
              <span>•</span>
              <span className="capitalize">{project.garmentType}</span>
              {project.size && (
                <>
                  <span>•</span>
                  <span className="uppercase">Size {project.size}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
            className="p-2 bg-white border-2 border-[#e8ddd0] rounded-lg hover:bg-[#f8f4f0] transition-colors"
          >
            <ZoomOut sx={{ fontSize: 20 }} />
          </button>
          <span className="text-sm text-[#6b5d52] font-medium w-16 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(2, zoom + 0.25))}
            className="p-2 bg-white border-2 border-[#e8ddd0] rounded-lg hover:bg-[#f8f4f0] transition-colors"
          >
            <ZoomIn sx={{ fontSize: 20 }} />
          </button>
        </div>
      </div>

      {sections.length > 1 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="font-semibold text-[#4a3f35] mb-4">Garment Sections</h3>
          <div className="flex gap-3 overflow-x-auto">
            {sections.map((section, index) => {
              const sectionProgress = Array.from(completedStitches).filter(key => {
                const [row] = key.split('-').map(Number);
                return row < section.height;
              }).length;
              const sectionTotal = section.width * section.height;
              const percentage = Math.round((sectionProgress / sectionTotal) * 100);

              return (
                <button
                  key={section.id}
                  onClick={() => setCurrentSection(index)}
                  className={`flex-1 min-w-[200px] p-4 rounded-xl border-2 transition-all ${
                    currentSection === index
                      ? 'border-[#c89b7e] bg-[#c89b7e]/10'
                      : 'border-[#e8ddd0] bg-white hover:bg-[#f8f4f0]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-[#4a3f35]">{section.name}</span>
                    {section.completed && <CheckCircle className="text-[#8b6f47]" sx={{ fontSize: 20 }} />}
                  </div>
                  <div className="h-2 bg-[#e8ddd0] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#c89b7e] to-[#a67c5c] transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#8b7968] mt-2">{percentage}% complete</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-[#4a3f35]">Full Pattern View</h3>
              <div className="text-sm text-[#8b7968]">
                {currentSectionData.width} × {currentSectionData.height} stitches
              </div>
            </div>

            <div className="overflow-auto bg-[#f8f4f0] rounded-xl p-6 max-h-[600px] border-2 border-[#e8ddd0]">
              <canvas
                ref={fullCanvasRef}
                onClick={handleFullCanvasClick}
                className="cursor-pointer shadow-lg"
              />
            </div>

            <p className="text-sm text-[#6b5d52] mt-4 flex items-center gap-2">
              <Info sx={{ fontSize: 16 }} />
              Click any stitch to mark it as complete
            </p>
          </div>

          {selectedRow !== null && (
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-[#4a3f35]">
                  Row {selectedRow + 1} Detail
                </h3>
                <button
                  onClick={() => toggleRow(selectedRow)}
                  className="px-4 py-2 bg-[#c89b7e] text-white rounded-lg hover:bg-[#b88a6f] transition-colors text-sm font-medium"
                >
                  Toggle Entire Row
                </button>
              </div>

              <div className="overflow-x-auto bg-[#f8f4f0] rounded-xl p-6 border-2 border-[#e8ddd0]">
                <canvas
                  ref={rowCanvasRef}
                  onClick={handleRowCanvasClick}
                  className="cursor-pointer"
                />
              </div>

              <p className="text-sm text-[#6b5d52] mt-4">
                Click individual stitches to mark them complete
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-[#4a3f35] mb-4">Row Progress</h3>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {Array.from({ length: currentSectionData.height }, (_, i) => {
                const rowNum = i;
                const progress = getRowProgress(rowNum);
                const percentage = Math.round((progress.completed / progress.total) * 100);
                const isComplete = percentage === 100;

                return (
                  <button
                    key={rowNum}
                    onClick={() => setSelectedRow(rowNum)}
                    className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                      selectedRow === rowNum
                        ? 'border-[#c89b7e] bg-[#c89b7e]/10'
                        : 'border-[#e8ddd0] bg-white hover:bg-[#f8f4f0]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-[#4a3f35]">Row {rowNum + 1}</span>
                      {isComplete ? (
                        <CheckCircle className="text-[#8b6f47]" sx={{ fontSize: 20 }} />
                      ) : (
                        <RadioButtonUnchecked className="text-[#d4c4b0]" sx={{ fontSize: 20 }} />
                      )}
                    </div>
                    <div className="h-1.5 bg-[#e8ddd0] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#c89b7e] to-[#a67c5c] transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-[#8b7968] mt-1">
                      {progress.completed} / {progress.total} stitches
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {project.pattern && (
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="w-full flex items-center justify-between mb-4"
              >
                <h3 className="text-lg font-semibold text-[#4a3f35] flex items-center gap-2">
                  <Description sx={{ fontSize: 22 }} />
                  Pattern Instructions
                </h3>
                <NavigateNext
                  className={`text-[#6b5d52] transition-transform ${
                    showInstructions ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {showInstructions && (
                <div className="prose prose-sm max-w-none text-[#4a3f35]">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {project.pattern}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <button
              onClick={() => setShowAbbreviations(!showAbbreviations)}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-lg font-semibold text-[#4a3f35] flex items-center gap-2">
                <Help sx={{ fontSize: 22 }} />
                Abbreviations
              </h3>
              <NavigateNext
                className={`text-[#6b5d52] transition-transform ${
                  showAbbreviations ? 'rotate-90' : ''
                }`}
              />
            </button>

            {showAbbreviations && (
              <div className="space-y-3">
                {abbreviations.map(({ abbr, full, hasVideo }) => (
                  <div
                    key={abbr}
                    className="flex items-center justify-between p-3 bg-[#f8f4f0] rounded-xl"
                  >
                    <div>
                      <p className="font-semibold text-[#4a3f35]">{abbr}</p>
                      <p className="text-sm text-[#6b5d52]">{full}</p>
                    </div>
                    {hasVideo && (
                      <a
                        href={`https://www.youtube.com/results?search_query=how+to+${full.replace(
                          / /g,
                          '+'
                        )}+knitting`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-white rounded-lg hover:bg-[#e8ddd0] transition-colors"
                      >
                        <YouTube className="text-[#c89b7e]" sx={{ fontSize: 20 }} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {currentSection < sections.length - 1 && (
        <div className="bg-gradient-to-r from-[#c89b7e]/20 to-[#a67c5c]/20 rounded-2xl p-6 border border-[#c89b7e]/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-[#4a3f35] mb-1">Ready for the next section?</h3>
              <p className="text-sm text-[#6b5d52]">
                Move to: {sections[currentSection + 1].name}
              </p>
            </div>
            <button
              onClick={() => setCurrentSection(currentSection + 1)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#c89b7e] to-[#a67c5c] text-white rounded-xl hover:shadow-lg transition-all font-medium"
            >
              Next Section
              <PlayArrow />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
