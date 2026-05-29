import { Link } from 'react-router';
import { useProjects } from '../context/ProjectContext';
import {
  GridOn,
  Delete,
  CalendarToday,
  CheckCircle,
  RadioButtonUnchecked
} from '@mui/icons-material';

export function SavedProjects() {
  const { projects, deleteProject } = useProjects();

  const getProgressPercentage = (project: any) => {
    if (!project.progress || project.progress.length === 0) return 0;
    const completed = project.progress.filter((p: any) => p.completed).length;
    const total = project.width * project.height;
    return Math.round((completed / total) * 100);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-[#4a3f35]">My Projects</h1>
          <p className="text-[#6b5d52] mt-2">All your saved patterns and designs</p>
        </div>
        <Link
          to="/generate"
          className="px-6 py-3 bg-gradient-to-r from-[#c89b7e] to-[#a67c5c] text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-medium"
        >
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center shadow-lg border border-[#e8ddd0]">
          <GridOn className="text-[#c89b7e]/40 mx-auto mb-4" sx={{ fontSize: 80 }} />
          <h3 className="text-2xl font-semibold text-[#4a3f35] mb-2">No projects yet</h3>
          <p className="text-[#6b5d52] mb-6">
            Start by generating a pattern or creating a chart
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/generate"
              className="px-6 py-3 bg-[#c89b7e] text-white rounded-xl hover:bg-[#b88a6f] transition-colors"
            >
              Generate Pattern
            </Link>
            <Link
              to="/editor"
              className="px-6 py-3 bg-white text-[#6b5d52] border-2 border-[#c89b7e] rounded-xl hover:bg-[#f8f4f0] transition-colors"
            >
              Chart Editor
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => {
            const progress = getProgressPercentage(project);
            const hasProgress = progress > 0;

            return (
              <div
                key={project.id}
                className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all border border-[#e8ddd0] group"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-[#4a3f35] mb-1">
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-[#8b7968]">
                        <span className="capitalize">{project.type}</span>
                        <span>•</span>
                        <span className="capitalize">{project.garmentType}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        if (confirm('Delete this project?')) {
                          deleteProject(project.id);
                        }
                      }}
                      className="p-2 text-[#8b7968] hover:text-[#d4183d] hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Delete sx={{ fontSize: 20 }} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#6b5d52]">Progress</span>
                      <span className="font-semibold text-[#4a3f35]">{progress}%</span>
                    </div>
                    <div className="h-2 bg-[#e8ddd0] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#c89b7e] to-[#a67c5c] transition-all rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[#8b7968]">
                    <div className="flex items-center gap-1">
                      <GridOn sx={{ fontSize: 16 }} />
                      <span>{project.width} × {project.height}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarToday sx={{ fontSize: 14 }} />
                      <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <Link
                    to={`/tracker/${project.id}`}
                    className="block w-full py-3 bg-gradient-to-r from-[#c89b7e] to-[#a67c5c] text-white text-center rounded-xl hover:shadow-lg transition-all font-medium"
                  >
                    {hasProgress ? 'Continue Working' : 'Start Tracking'}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
