import { Link } from 'react-router';
import {
  AutoAwesome,
  GridOn,
  CloudUpload,
  Lightbulb,
  Speed,
  Favorite
} from '@mui/icons-material';

export function Home() {
  return (
    <div className="space-y-12">
      <section className="text-center space-y-6 py-12">
        <div className="inline-block">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#c89b7e] to-[#a67c5c] flex items-center justify-center shadow-2xl mb-6">
            <Favorite className="text-white" sx={{ fontSize: 40 }} />
          </div>
        </div>
        <h1 className="text-5xl font-bold text-[#4a3f35] tracking-tight">
          Welcome to KnitCraft AI
        </h1>
        <p className="text-xl text-[#6b5d52] max-w-2xl mx-auto leading-relaxed">
          Your all-in-one companion for knitting and crochet. Generate patterns, track progress,
          and bring your creative visions to life.
        </p>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        <Link
          to="/generate"
          className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border border-[#e8ddd0] hover:border-[#c89b7e]/50 hover:-translate-y-1"
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#daa88f] to-[#c89b7e] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md">
            <AutoAwesome className="text-white" sx={{ fontSize: 28 }} />
          </div>
          <h3 className="text-xl font-semibold text-[#4a3f35] mb-2">Generate Patterns</h3>
          <p className="text-[#6b5d52] leading-relaxed">
            Upload an image or describe your vision, and get a complete, size-graded pattern
            with instructions, materials list, and gauge.
          </p>
        </Link>

        <Link
          to="/editor"
          className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border border-[#e8ddd0] hover:border-[#c89b7e]/50 hover:-translate-y-1"
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#a8956f] to-[#8b7d5e] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md">
            <GridOn className="text-white" sx={{ fontSize: 28 }} />
          </div>
          <h3 className="text-xl font-semibold text-[#4a3f35] mb-2">Chart Editor</h3>
          <p className="text-[#6b5d52] leading-relaxed">
            Design your own colorwork motifs with our interactive grid. Choose up to 10 colors
            and create beautiful charts for any project.
          </p>
        </Link>

        <Link
          to="/projects"
          className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border border-[#e8ddd0] hover:border-[#c89b7e]/50 hover:-translate-y-1"
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#b89176] to-[#9d7a5f] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md">
            <CloudUpload className="text-white" sx={{ fontSize: 28 }} />
          </div>
          <h3 className="text-xl font-semibold text-[#4a3f35] mb-2">Track Progress</h3>
          <p className="text-[#6b5d52] leading-relaxed">
            Save all your designs and patterns. Mark stitches and rows as you work,
            with step-by-step guidance for each garment section.
          </p>
        </Link>
      </section>

      <section className="bg-white rounded-2xl p-10 shadow-xl border border-[#e8ddd0]">
        <h2 className="text-3xl font-bold text-[#4a3f35] mb-8 text-center">
          Why Crafters Love KnitCraft
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#c89b7e]/20 flex items-center justify-center mx-auto">
              <Speed className="text-[#8b6f47]" sx={{ fontSize: 24 }} />
            </div>
            <h4 className="font-semibold text-[#4a3f35]">Fast & Free</h4>
            <p className="text-sm text-[#6b5d52]">
              Generate complete patterns instantly with our free AI-powered tool
            </p>
          </div>

          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#c89b7e]/20 flex items-center justify-center mx-auto">
              <Lightbulb className="text-[#8b6f47]" sx={{ fontSize: 24 }} />
            </div>
            <h4 className="font-semibold text-[#4a3f35]">Learn as You Go</h4>
            <p className="text-sm text-[#6b5d52]">
              Interactive tutorials, stitch guides, and video resources built right in
            </p>
          </div>

          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#c89b7e]/20 flex items-center justify-center mx-auto">
              <GridOn className="text-[#8b6f47]" sx={{ fontSize: 24 }} />
            </div>
            <h4 className="font-semibold text-[#4a3f35]">Perfect Fit Every Time</h4>
            <p className="text-sm text-[#6b5d52]">
              Size-graded patterns with proper shaping for cardigans, sweaters, and more
            </p>
          </div>
        </div>
      </section>

      <section className="text-center py-8">
        <Link
          to="/generate"
          className="inline-flex items-center gap-3 bg-gradient-to-r from-[#c89b7e] to-[#a67c5c] text-white px-8 py-4 rounded-xl shadow-xl hover:shadow-2xl transition-all hover:scale-105 font-semibold"
        >
          <AutoAwesome sx={{ fontSize: 24 }} />
          Start Your First Project
        </Link>
      </section>
    </div>
  );
}
