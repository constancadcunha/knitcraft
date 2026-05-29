import { createBrowserRouter } from "react-router";
import { Home } from "./pages/Home";
import { PatternGenerator } from "./pages/PatternGenerator";
import { ChartEditor } from "./pages/ChartEditor";
import { PatternTracker } from "./pages/PatternTracker";
import { SavedProjects } from "./pages/SavedProjects";
import { Layout } from "./components/Layout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "generate", Component: PatternGenerator },
      { path: "editor", Component: ChartEditor },
      { path: "tracker/:id", Component: PatternTracker },
      { path: "projects", Component: SavedProjects },
    ],
  },
]);
