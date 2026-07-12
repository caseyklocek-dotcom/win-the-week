import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { StoreProvider } from "@/lib/store";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <StoreProvider>
        <AppShell>{children}</AppShell>
      </StoreProvider>
    </RequireAuth>
  );
}
