import prisma from "../../config/prisma/prisma.js";
import { AgentOrchestrator } from "./agentOrchestrator.js";

const orchestrator = new AgentOrchestrator();

/**
 * Evaluates candidate recommendation for a given profile and persists the result atomically.
 */
export async function evaluateAndSaveRecommendation(profileId: number): Promise<void> {
  const profile = await prisma.hiringProfile.findUnique({
    where: { id: profileId },
    include: { opening: true },
  });

  if (!profile || !profile.opening) {
    throw new Error(`Profile ${profileId} or associated opening not found`);
  }

  const result = await orchestrator.evaluateCandidate({
    profileId: profile.id,
    s3Key: profile.s3Key,
    opening: {
      id: profile.opening.id,
      title: profile.opening.title,
      description: profile.opening.description,
      location: profile.opening.location,
      contractType: profile.opening.contractType,
      experienceMin: profile.opening.experienceMin,
      experienceMax: profile.opening.experienceMax,
    },
  });

  // Atomic write in Prisma transaction (no partial writes)
  await prisma.$transaction(async (tx) => {
    await tx.hiringProfile.update({
      where: { id: profileId },
      data: {
        recommended: result.recommended,
        recommendationScore: result.score,
        recommendationReason: result.reason,
        recommendationLatencyMs: result.latencyMs,
        recommendationVersion: result.version,
        recommendationConfidence: result.confidence,
        recommendedAt: new Date(),
      },
    });
  });

  console.log(`[RecommendationService] Profile ${profileId} evaluation saved successfully (Score: ${result.score}, Recommended: ${result.recommended}, Latency: ${result.latencyMs}ms).`);
}

/**
 * Triggers asynchronous background evaluation of a submitted profile.
 * Non-blocking for the API response.
 */
export function triggerAsyncProfileEvaluation(profileId: number): void {
  // Fire and forget in the event loop without blocking the HTTP request
  setImmediate(async () => {
    try {
      await evaluateAndSaveRecommendation(profileId);
    } catch (err: any) {
      console.error(`[RecommendationService] Background recommendation failed for profile ${profileId}:`, err);
    }
  });
}
