import { useNavigate } from "react-router-dom";
import { LoginForm } from "../components/LoginForm";

export function ClientLogin() {
  const navigate = useNavigate();
  return (
    <LoginForm
      title="Customer Login"
      subtitle="Sign in to view or start a conversation."
      demoEmail="priya.sharma@example.com"
      onSuccess={() => navigate("/client")}
    />
  );
}