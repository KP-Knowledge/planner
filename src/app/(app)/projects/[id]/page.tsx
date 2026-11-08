import { GanttView } from "@/features/gantt/GanttView";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GanttView projectId={id} />;
}
