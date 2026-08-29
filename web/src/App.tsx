import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { RoleSelect } from "./pages/RoleSelect";
import { AgentLogin } from "./pages/AgentLogin";
import { ClientLogin } from "./pages/ClientLogin";
import { AdminApp } from "./pages/AdminApp";
import { ClientPortal } from "./pages/ClientPortal";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RoleSelect />} />
          <Route path="/admin/login" element={<AgentLogin />} />
          <Route path="/admin" element={<AdminApp />} />
          <Route path="/client/login" element={<ClientLogin />} />
          <Route path="/client" element={<ClientPortal />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;