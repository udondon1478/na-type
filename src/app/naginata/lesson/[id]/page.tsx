import { LessonClient } from "./LessonClient";
import { naginataLessons } from "@/data/naginata/lessons";

export function generateStaticParams() {
  return naginataLessons.map((_, i) => ({ id: String(i + 1) }));
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LessonClient lessonId={id} />;
}
