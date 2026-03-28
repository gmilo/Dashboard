import { PageShell } from "@/components/page-shell";
import { todayInSydneyISO } from "@/lib/dates";
import { MemberDetail } from "@/components/member-detail.client";

export default function MemberPage({ params }: { params: { id: string } }) {
  const memberId = params.id;
  const todayISO = todayInSydneyISO();

  return (
    <PageShell title="Member">
      <MemberDetail memberId={memberId} todayISO={todayISO} />
    </PageShell>
  );
}

