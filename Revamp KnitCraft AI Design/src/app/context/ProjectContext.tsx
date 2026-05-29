import { createContext, useContext, useState, ReactNode } from 'react';

export interface StitchProgress {
  row: number;
  stitch: number;
  completed: boolean;
}

export interface ChartPattern {
  id: string;
  name: string;
  type: 'knit' | 'crochet';
  garmentType: 'cardigan' | 'sweater' | 'blanket' | 'scarf' | 'hat' | 'custom';
  size?: string;
  width: number;
  height: number;
  colors: string[];
  grid: number[][];
  pattern?: string;
  sections?: PatternSection[];
  progress: StitchProgress[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PatternSection {
  id: string;
  name: string;
  width: number;
  height: number;
  grid: number[][];
  shaping?: ShapingInstruction[];
  completed: boolean;
  currentRow: number;
}

export interface ShapingInstruction {
  row: number;
  type: 'increase' | 'decrease';
  stitches: number;
  position: 'start' | 'end' | 'evenly';
}

interface ProjectContextType {
  projects: ChartPattern[];
  addProject: (project: ChartPattern) => void;
  updateProject: (id: string, updates: Partial<ChartPattern>) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => ChartPattern | undefined;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<ChartPattern[]>([]);

  const addProject = (project: ChartPattern) => {
    setProjects(prev => {
      const existing = prev.find(p => p.id === project.id);
      if (existing) {
        return prev.map(p => p.id === project.id ? { ...project, updatedAt: new Date() } : p);
      }
      return [...prev, project];
    });
  };

  const updateProject = (id: string, updates: Partial<ChartPattern>) => {
    setProjects(prev =>
      prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p)
    );
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const getProject = (id: string) => {
    return projects.find(p => p.id === id);
  };

  return (
    <ProjectContext.Provider value={{ projects, addProject, updateProject, deleteProject, getProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within ProjectProvider');
  }
  return context;
}
