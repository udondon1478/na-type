import { LessonClient } from "./LessonClient";

const LESSON_IDS = ["1", "2", "3", "4", "5", "6", "7", "8"];

export function generateStaticParams() {
  return LESSON_IDS.map((id) => ({ id }));
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LessonClient lessonId={id} />;
}
