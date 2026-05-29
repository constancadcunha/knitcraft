import { Outlet, Link, useLocation } from 'react-router';
import {
  Home as HomeIcon,
  AutoAwesome,
  GridOn,
  FolderOpen,
  Celebration
} from '@mui/icons-material';

export function Layout() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f4f0] via-[#fdf9f5] to-[#f5ede6]">
      <nav className="border-b border-[#d4c4b0]/30 bg-white/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c89b7e] to-[#a67c5c] flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <Celebration className="text-white" sx={{ fontSize: 24 }} />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-[#4a3f35] tracking-tight">KnitCraft AI</h1>
                <p className="text-xs text-[#8b7968]">Your creative companion</p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                to="/"
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                  isActive('/')
                    ? 'bg-[#c89b7e]/20 text-[#8b6f47]'
                    : 'text-[#6b5d52] hover:bg-[#e8ddd0]/50'
                }`}
              >
                <HomeIcon sx={{ fontSize: 20 }} />
                <span className="text-sm font-medium">Home</span>
              </Link>

              <Link
                to="/generate"
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                  isActive('/generate')
                    ? 'bg-[#c89b7e]/20 text-[#8b6f47]'
                    : 'text-[#6b5d52] hover:bg-[#e8ddd0]/50'
                }`}
              >
                <AutoAwesome sx={{ fontSize: 20 }} />
                <span className="text-sm font-medium">Generate</span>
              </Link>

              <Link
                to="/editor"
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                  isActive('/editor')
                    ? 'bg-[#c89b7e]/20 text-[#8b6f47]'
                    : 'text-[#6b5d52] hover:bg-[#e8ddd0]/50'
                }`}
              >
                <GridOn sx={{ fontSize: 20 }} />
                <span className="text-sm font-medium">Chart Editor</span>
              </Link>

              <Link
                to="/projects"
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                  isActive('/projects')
                    ? 'bg-[#c89b7e]/20 text-[#8b6f47]'
                    : 'text-[#6b5d52] hover:bg-[#e8ddd0]/50'
                }`}
              >
                <FolderOpen sx={{ fontSize: 20 }} />
                <span className="text-sm font-medium">My Projects</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
