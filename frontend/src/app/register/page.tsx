import { Suspense } from "react";
import { AuthScreen } from "@/components/auth-screen";
export default function Page() {
  return (
    <Suspense fallback={<div className="p-10">Loading…</div>}>
      <AuthScreen mode="register" />
    </Suspense>
  );
}
