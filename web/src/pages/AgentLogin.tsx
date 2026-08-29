import { useNavigate } from "react-router-dom";
import { LoginForm } from "../components/LoginForm";

export function AgentLogin() {
  const navigate = useNavigate();
  return (
    <LoginForm
      title="Agent Login"
      subtitle="Sign in to access the CX admin panel."
      demoEmail="agent@hydrabottle.com"
      onSuccess={() => navigate("/admin")}
    />
  );
}