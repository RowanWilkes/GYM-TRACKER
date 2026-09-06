import { AuthGate } from "@/components/auth-gate";
import { LoginFlow } from "@/components/login-flow";

export default function HomePage() {
  return (
    <AuthGate guestOnly>
      <LoginFlow />
    </AuthGate>
  );
}
