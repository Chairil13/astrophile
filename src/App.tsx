import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ISSTracker3D from "./pages/ISSTracker3D";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/tracker" element={<ISSTracker3D />} />
    </Routes>
  );
}

export default App;
