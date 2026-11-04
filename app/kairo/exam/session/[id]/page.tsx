import { ExamWorkspace } from "@/components/kairo/exam-workspace";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExamWorkspace id={id} />;
}
