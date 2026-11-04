import { getLearningResources } from "@/lib/learning-resources";
import type { Grade, LearningResource, Subject } from "@/lib/types";

// OpenAI-hosted search tools are billed separately from complimentary text tokens.
// Deliberately use the reviewed catalog only; never invent missing lesson URLs.
export async function verifiedTopicResources(topics: string[], grade: Grade, subject: Subject): Promise<Map<string, LearningResource[]>> {
  return new Map(topics.map(topic => [topic, getLearningResources(topic, grade, subject)]));
}
