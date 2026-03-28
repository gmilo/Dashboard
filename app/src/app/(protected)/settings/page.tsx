import { PageShell } from "@/components/page-shell";
import { SettingsClient } from "./settings.client";

export default function SettingsPage() {
  return (
    <PageShell title="Settings">
      <SettingsClient />
    </PageShell>
  );
}

