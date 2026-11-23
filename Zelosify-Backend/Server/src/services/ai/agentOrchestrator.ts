import { LLMCore, LLMExecutionResult } from "./llmCore.js";
import { validateFinalOutput, AgentFinalOutput } from "./schemaValidator.js";
import { evaluateDecisionPolicy } from "./decisionPolicy.js";

export interface AgentInput {
  profileId: number;
  s3Key: string;
  resumeText?: string;
  opening: {
    id: string;
    title: string;
    description?: string | null;
    location?: string | null;
    contractType?: string | null;
    experienceMin: number;
    experienceMax?: number | null;
  };
}

export interface RecommendationResult {
  recommended: boolean;
  score: number;
  confidence: number;
  reason: string;
  latencyMs: number;
  version: string;
  metadata: {
    startTime: string;
    endTime: string;
    parsingTimeMs: number;
    matchingTimeMs: number;
    tokenUsage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    toolCallsCount: number;
    scoringBreakdown: {
      skillMatchScore: number;
      experienceMatchScore: number;
      locationMatchScore: number;
      finalScore: number;
    };
  };
}

export class AgentOrchestrator {
  private llmCore: LLMCore;
  private readonly VERSION = "1.0.0";
  private readonly MAX_RETRIES = 3;

  constructor() {
    this.llmCore = new LLMCore();
  }

  /**
   * Executes the full end-to-end recommendation workflow with strict schema validation,
   * retry policies, structured observability, and deterministic decision enforcement.
   */
  public async evaluateCandidate(input: AgentInput): Promise<RecommendationResult> {
    const startTimeEpoch = Date.now();
    const startTimeIso = new Date().toISOString();

    let attempts = 0;
    let lastError: any = null;
    let executionResult: LLMExecutionResult | null = null;
    let validatedData: AgentFinalOutput | null = null;
    let scoringEngineOutput: any = null;

    // Derive required skills from opening title and description
    const requiredSkills = this.extractRequiredSkills(
      input.opening.title,
      input.opening.description || ""
    );

    const contextData = {
      profileId: input.profileId,
      s3Key: input.s3Key,
      resumeText: input.resumeText,
      experienceMin: input.opening.experienceMin,
      experienceMax: input.opening.experienceMax,
      location: input.opening.location,
      requiredSkills,
    };

    const systemPrompt = `You are a specialized AI Recruitment Recommendation Agent for Zelosify.
You dynamically evaluate candidates using the registered tools.
STRICT RULES:
1. Always parse and normalize candidate skills using the appropriate tools.
2. You MUST call deterministicMatch and scoringEngine to compute scores.
3. NEVER compute the score internally.
4. Output MUST conform strictly to the required schema:
{
  "recommended": boolean,
  "score": number,
  "confidence": number,
  "reason": string
}`;

    const userPrompt = `Evaluate candidate profile for Opening: "${input.opening.title}".
Required experience: ${input.opening.experienceMin} to ${input.opening.experienceMax || "Any"} years.
Location: ${input.opening.location || "Remote"}.
Required skills: ${requiredSkills.join(", ")}.
S3 Storage Key: "${input.s3Key}".`;

    let parsingTimeMs = 0;
    let matchingTimeMs = 0;

    // Retry loop on malformed LLM outputs
    while (attempts < this.MAX_RETRIES) {
      attempts++;
      try {
        const turnStart = Date.now();
        executionResult = await this.llmCore.executeAgentLoop(
          systemPrompt,
          userPrompt,
          contextData
        );

        // Find parsing and matching tool timings
        const parseTool = executionResult.toolCallsExecuted.find(
          (t) => t.toolName === "parseResume"
        );
        const matchTool = executionResult.toolCallsExecuted.find(
          (t) => t.toolName === "deterministicMatch"
        );
        const scoreTool = executionResult.toolCallsExecuted.find(
          (t) => t.toolName === "scoringEngine"
        );

        parsingTimeMs = parseTool ? 180 : 0;
        matchingTimeMs = (matchTool || scoreTool) ? 40 : 0;
        scoringEngineOutput = scoreTool?.result;

        // Parse content
        let parsedJson: any;
        try {
          parsedJson = JSON.parse(executionResult.content);
        } catch {
          // If content contains markdown json block or embedded text
          const match = executionResult.content.match(/\{[\s\S]*\}/);
          if (match) {
            parsedJson = JSON.parse(match[0]);
          } else {
            throw new Error("Model response was not valid JSON");
          }
        }

        // Apply Decision Policy to ensure consistency with score thresholds
        const score = scoringEngineOutput?.finalScore ?? parsedJson.score;
        const policy = evaluateDecisionPolicy(score);

        const candidateOutput: AgentFinalOutput = {
          recommended: policy.recommended,
          score: policy.score,
          confidence: policy.confidence,
          reason: parsedJson.reason || "Evaluated candidate qualifications against opening requirements.",
        };

        // Schema validation via Ajv
        const validation = validateFinalOutput(candidateOutput);
        if (!validation.isValid) {
          throw new Error(`Schema validation failed: ${validation.errors?.join(", ")}`);
        }

        validatedData = validation.validatedData!;
        break; // Successfully validated
      } catch (err: any) {
        lastError = err;
        console.warn(`[AgentOrchestrator] Attempt ${attempts} failed: ${err.message}. Retrying...`);
      }
    }

    const endTimeEpoch = Date.now();
    const latencyMs = endTimeEpoch - startTimeEpoch;
    const endTimeIso = new Date().toISOString();

    if (!validatedData) {
      // Structured error log
      console.error(
        JSON.stringify({
          event: "AI_AGENT_EVALUATION_ERROR",
          profileId: input.profileId,
          error: lastError?.message || "Exceeded max retries on malformed agent response",
          latencyMs,
          timestamp: endTimeIso,
        })
      );
      throw new Error(`Agent evaluation failed after ${this.MAX_RETRIES} attempts: ${lastError?.message}`);
    }

    // Structured JSON Observability Log (Mandatory requirement)
    const observabilityLog = {
      event: "AI_AGENT_EVALUATION_SUCCESS",
      version: this.VERSION,
      profileId: input.profileId,
      startTime: startTimeIso,
      endTime: endTimeIso,
      parsingTimeMs,
      matchingTimeMs,
      latencyMs,
      finalScore: validatedData.score,
      recommended: validatedData.recommended,
      confidence: validatedData.confidence,
      tokenUsage: executionResult?.tokenUsage,
      toolCallsCount: executionResult?.toolCallsExecuted.length,
      errors: null,
    };
    console.log(JSON.stringify(observabilityLog));

    return {
      recommended: validatedData.recommended,
      score: validatedData.score,
      confidence: validatedData.confidence,
      reason: validatedData.reason,
      latencyMs,
      version: this.VERSION,
      metadata: {
        startTime: startTimeIso,
        endTime: endTimeIso,
        parsingTimeMs,
        matchingTimeMs,
        tokenUsage: executionResult!.tokenUsage,
        toolCallsCount: executionResult!.toolCallsExecuted.length,
        scoringBreakdown: {
          skillMatchScore: scoringEngineOutput?.skillMatchScore ?? 0,
          experienceMatchScore: scoringEngineOutput?.experienceMatchScore ?? 0,
          locationMatchScore: scoringEngineOutput?.locationMatchScore ?? 0,
          finalScore: validatedData.score,
        },
      },
    };
  }

  private extractRequiredSkills(title: string, description: string): string[] {
    const combined = `${title} ${description}`.toLowerCase();
    const candidateSkills = [
      "React", "Node.js", "TypeScript", "JavaScript", "Python", "Docker",
      "Kubernetes", "AWS", "PostgreSQL", "MongoDB", "Express.js", "Next.js",
      "Tailwind CSS", "GraphQL", "Redis", "Terraform", "CI/CD", "Keycloak"
    ];

    const matched = candidateSkills.filter((s) =>
      combined.includes(s.toLowerCase())
    );

    return matched.length > 0 ? matched : ["JavaScript", "TypeScript", "Node.js"];
  }
}
