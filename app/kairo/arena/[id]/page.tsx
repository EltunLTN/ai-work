import { ArenaWorkspace } from "@/components/kairo/arena-workspace";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ArenaWorkspace id={id} />;
}
