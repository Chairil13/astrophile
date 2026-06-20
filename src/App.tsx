import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ISSTracker3D from "./pages/ISSTracker3D";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import Blogs from "./pages/Blogs";
import BlogDetail from "./pages/BlogDetail";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/tracker" element={<ISSTracker3D />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/blogs" element={<Blogs />} />
      <Route path="/blogs/:id" element={<BlogDetail />} />
    </Routes>
  );
}

export default App;
