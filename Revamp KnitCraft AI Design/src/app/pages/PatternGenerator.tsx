import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useProjects } from '../context/ProjectContext';
import {
  CloudUpload,
  TextFields,
  AutoAwesome,
  NavigateNext,
  Photo,
  Description
} from '@mui/icons-material';

type InputMethod = 'image' | 'text' | null;
type CraftType = 'knit' | 'crochet' | null;
type GarmentType = 'cardigan' | 'sweater' | 'blanket' | 'scarf' | 'hat' | 'custom' | null;

export function PatternGenerator() {
  const navigate = useNavigate();
  const { addProject } = useProjects();
  const [step, setStep] = useState(1);
  const [inputMethod, setInputMethod] = useState<InputMethod>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [textDescription, setTextDescription] = useState('');
  const [craftType, setCraftType] = useState<CraftType>(null);
  const [garmentType, setGarmentType] = useState<GarmentType>(null);
  const [size, setSize] = useState('');
  const [generating, setGenerating] = useState(false);

  const generatePattern = async () => {
    setGenerating(true);

    await new Promise(resolve => setTimeout(resolve, 2000));

    const dimensions = getGarmentDimensions(garmentType, size);
    const project = {
      id: Date.now().toString(),
      name: `${garmentType || 'Custom'} Pattern`,
      type: craftType!,
      garmentType: garmentType!,
      size,
      width: dimensions.width,
      height: dimensions.height,
      colors: ['#c89b7e', '#f8f4f0', '#8b7968'],
      grid: createGarmentGrid(garmentType, dimensions),
      pattern: generateMockPattern(craftType!, garmentType!, size),
      sections: createGarmentSections(garmentType, dimensions),
      progress: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addProject(project);
    setGenerating(false);
    navigate(`/tracker/${project.id}`);
  };

  const getGarmentDimensions = (type: GarmentType, size: string) => {
    const sizeMultiplier = size === 'xs' ? 0.8 : size === 's' ? 0.9 : size === 'm' ? 1 : size === 'l' ? 1.1 : size === 'xl' ? 1.2 : 1;

    switch (type) {
      case 'cardigan':
      case 'sweater':
        return { width: Math.floor(60 * sizeMultiplier), height: Math.floor(80 * sizeMultiplier) };
      case 'blanket':
        return { width: 100, height: 120 };
      case 'scarf':
        return { width: 30, height: 150 };
      case 'hat':
        return { width: Math.floor(40 * sizeMultiplier), height: Math.floor(30 * sizeMultiplier) };
      default:
        return { width: 50, height: 50 };
    }
  };

  const createGarmentGrid = (type: GarmentType, dimensions: { width: number; height: number }) => {
    const grid: number[][] = [];
    for (let row = 0; row < dimensions.height; row++) {
      const rowArray: number[] = [];
      for (let col = 0; col < dimensions.width; col++) {
        rowArray.push(0);
      }
      grid.push(rowArray);
    }
    return grid;
  };

  const createGarmentSections = (type: GarmentType, dimensions: { width: number; height: number }) => {
    if (type === 'cardigan') {
      return [
        {
          id: 'back',
          name: 'Back Panel',
          width: dimensions.width,
          height: dimensions.height,
          grid: createGarmentGrid(type, dimensions),
          shaping: [
            { row: Math.floor(dimensions.height * 0.6), type: 'decrease' as const, stitches: 4, position: 'evenly' as const },
            { row: Math.floor(dimensions.height * 0.8), type: 'decrease' as const, stitches: 8, position: 'evenly' as const },
          ],
          completed: false,
          currentRow: 0,
        },
        {
          id: 'left-front',
          name: 'Left Front Panel',
          width: Math.floor(dimensions.width / 2),
          height: dimensions.height,
          grid: createGarmentGrid(type, { width: Math.floor(dimensions.width / 2), height: dimensions.height }),
          shaping: [
            { row: Math.floor(dimensions.height * 0.6), type: 'decrease' as const, stitches: 2, position: 'end' as const },
            { row: Math.floor(dimensions.height * 0.8), type: 'decrease' as const, stitches: 4, position: 'end' as const },
          ],
          completed: false,
          currentRow: 0,
        },
        {
          id: 'right-front',
          name: 'Right Front Panel',
          width: Math.floor(dimensions.width / 2),
          height: dimensions.height,
          grid: createGarmentGrid(type, { width: Math.floor(dimensions.width / 2), height: dimensions.height }),
          shaping: [
            { row: Math.floor(dimensions.height * 0.6), type: 'decrease' as const, stitches: 2, position: 'start' as const },
            { row: Math.floor(dimensions.height * 0.8), type: 'decrease' as const, stitches: 4, position: 'start' as const },
          ],
          completed: false,
          currentRow: 0,
        },
        {
          id: 'sleeves',
          name: 'Sleeves (make 2)',
          width: Math.floor(dimensions.width * 0.4),
          height: Math.floor(dimensions.height * 0.7),
          grid: createGarmentGrid(type, { width: Math.floor(dimensions.width * 0.4), height: Math.floor(dimensions.height * 0.7) }),
          shaping: [
            { row: 20, type: 'increase' as const, stitches: 1, position: 'evenly' as const },
            { row: 40, type: 'increase' as const, stitches: 1, position: 'evenly' as const },
          ],
          completed: false,
          currentRow: 0,
        },
      ];
    }
    return undefined;
  };

  const generateMockPattern = (craft: CraftType, garment: GarmentType, size: string) => {
    return `## ${garment?.toUpperCase()} PATTERN

**Craft Type:** ${craft}
**Size:** ${size?.toUpperCase()}
**Difficulty:** Intermediate

### Materials
- 4-6 skeins worsted weight yarn
- Size 7 (4.5mm) needles
- Stitch markers
- Tapestry needle

### Gauge
18 stitches × 24 rows = 4 inches in stockinette stitch

### Abbreviations
- K: Knit
- P: Purl
- K2tog: Knit 2 together
- SSK: Slip, slip, knit
- M1: Make 1 stitch

### Instructions
Work each section following the interactive chart. The pattern includes proper shaping for a professional fit.

**Back Panel:** Cast on and work in stockinette stitch, following decrease instructions at armhole shaping.

**Front Panels:** Work separately with neckline shaping as indicated in chart.

**Sleeves:** Work from cuff to shoulder with gradual increases for proper fit.

**Finishing:** Seam shoulders, set in sleeves, seam sides and sleeves. Add button band if desired.`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold text-[#4a3f35]">Generate Your Pattern</h1>
        <p className="text-[#6b5d52]">Follow the steps to create a custom pattern tailored to your vision</p>
      </div>

      <div className="flex items-center justify-center gap-3 mb-8">
        {[1, 2, 3].map(num => (
          <div key={num} className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
              step >= num
                ? 'bg-gradient-to-br from-[#c89b7e] to-[#a67c5c] text-white shadow-lg'
                : 'bg-[#e8ddd0] text-[#8b7968]'
            }`}>
              {num}
            </div>
            {num < 3 && (
              <div className={`w-16 h-1 rounded transition-all ${
                step > num ? 'bg-[#c89b7e]' : 'bg-[#e8ddd0]'
              }`} />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-[#4a3f35] text-center">
            How would you like to start?
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <button
              onClick={() => {
                setInputMethod('image');
                setStep(2);
              }}
              className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all border-2 border-transparent hover:border-[#c89b7e]"
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#daa88f] to-[#c89b7e] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Photo className="text-white" sx={{ fontSize: 32 }} />
              </div>
              <h3 className="text-xl font-semibold text-[#4a3f35] mb-2">Upload Image</h3>
              <p className="text-[#6b5d52]">
                Upload a photo of a garment, sketch, or inspiration image
              </p>
            </button>

            <button
              onClick={() => {
                setInputMethod('text');
                setStep(2);
              }}
              className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all border-2 border-transparent hover:border-[#c89b7e]"
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#a8956f] to-[#8b7d5e] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Description className="text-white" sx={{ fontSize: 32 }} />
              </div>
              <h3 className="text-xl font-semibold text-[#4a3f35] mb-2">Describe It</h3>
              <p className="text-[#6b5d52]">
                Tell us what you want to create in plain text
              </p>
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-[#4a3f35] text-center">
            Configure Your Project
          </h2>

          <div className="bg-white rounded-2xl p-8 shadow-lg space-y-6">
            {inputMethod === 'image' ? (
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-[#4a3f35]">
                  Upload Image
                </label>
                <div className="border-2 border-dashed border-[#c89b7e]/40 rounded-xl p-12 text-center hover:border-[#c89b7e] transition-colors cursor-pointer bg-[#f8f4f0]/30">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <CloudUpload className="text-[#c89b7e] mx-auto mb-3" sx={{ fontSize: 48 }} />
                    <p className="text-[#6b5d52]">
                      {imageFile ? imageFile.name : 'Click to upload or drag and drop'}
                    </p>
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-[#4a3f35]">
                  Describe Your Vision
                </label>
                <textarea
                  value={textDescription}
                  onChange={(e) => setTextDescription(e.target.value)}
                  placeholder="Example: A cozy oversized cardigan with cable knit details and wooden buttons..."
                  rows={5}
                  className="w-full px-4 py-3 border-2 border-[#e8ddd0] rounded-xl focus:border-[#c89b7e] focus:outline-none bg-white text-[#4a3f35]"
                />
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-[#4a3f35]">
                  Craft Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setCraftType('knit')}
                    className={`py-3 px-4 rounded-xl font-medium transition-all ${
                      craftType === 'knit'
                        ? 'bg-[#c89b7e] text-white shadow-lg'
                        : 'bg-[#f8f4f0] text-[#6b5d52] hover:bg-[#e8ddd0]'
                    }`}
                  >
                    Knit
                  </button>
                  <button
                    onClick={() => setCraftType('crochet')}
                    className={`py-3 px-4 rounded-xl font-medium transition-all ${
                      craftType === 'crochet'
                        ? 'bg-[#c89b7e] text-white shadow-lg'
                        : 'bg-[#f8f4f0] text-[#6b5d52] hover:bg-[#e8ddd0]'
                    }`}
                  >
                    Crochet
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-semibold text-[#4a3f35]">
                  Garment Type
                </label>
                <select
                  value={garmentType || ''}
                  onChange={(e) => setGarmentType(e.target.value as GarmentType)}
                  className="w-full px-4 py-3 border-2 border-[#e8ddd0] rounded-xl focus:border-[#c89b7e] focus:outline-none bg-white text-[#4a3f35]"
                >
                  <option value="">Select type</option>
                  <option value="cardigan">Cardigan</option>
                  <option value="sweater">Sweater</option>
                  <option value="blanket">Blanket</option>
                  <option value="scarf">Scarf</option>
                  <option value="hat">Hat</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            {(garmentType === 'cardigan' || garmentType === 'sweater' || garmentType === 'hat') && (
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-[#4a3f35]">
                  Size
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {['xs', 's', 'm', 'l', 'xl'].map(s => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`py-3 px-4 rounded-xl font-medium uppercase transition-all ${
                        size === s
                          ? 'bg-[#c89b7e] text-white shadow-lg'
                          : 'bg-[#f8f4f0] text-[#6b5d52] hover:bg-[#e8ddd0]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-4 bg-white border-2 border-[#e8ddd0] text-[#6b5d52] rounded-xl hover:bg-[#f8f4f0] transition-colors font-medium"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!craftType || !garmentType || ((garmentType === 'cardigan' || garmentType === 'sweater' || garmentType === 'hat') && !size)}
              className="flex-1 py-4 bg-gradient-to-r from-[#c89b7e] to-[#a67c5c] text-white rounded-xl hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Continue
              <NavigateNext />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-[#4a3f35] text-center">
            Review & Generate
          </h2>

          <div className="bg-white rounded-2xl p-8 shadow-lg space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-[#8b7968] mb-1">Input Method</p>
                <p className="font-semibold text-[#4a3f35] capitalize">{inputMethod}</p>
              </div>
              <div>
                <p className="text-sm text-[#8b7968] mb-1">Craft Type</p>
                <p className="font-semibold text-[#4a3f35] capitalize">{craftType}</p>
              </div>
              <div>
                <p className="text-sm text-[#8b7968] mb-1">Garment Type</p>
                <p className="font-semibold text-[#4a3f35] capitalize">{garmentType}</p>
              </div>
              {size && (
                <div>
                  <p className="text-sm text-[#8b7968] mb-1">Size</p>
                  <p className="font-semibold text-[#4a3f35] uppercase">{size}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-4 bg-white border-2 border-[#e8ddd0] text-[#6b5d52] rounded-xl hover:bg-[#f8f4f0] transition-colors font-medium"
            >
              Back
            </button>
            <button
              onClick={generatePattern}
              disabled={generating}
              className="flex-1 py-4 bg-gradient-to-r from-[#c89b7e] to-[#a67c5c] text-white rounded-xl hover:shadow-lg transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <AutoAwesome className={generating ? 'animate-spin' : ''} />
              {generating ? 'Generating...' : 'Generate Pattern'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
