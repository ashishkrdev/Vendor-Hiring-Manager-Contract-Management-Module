import { executeResumeParsing, ParsedResumeSchema } from "./tools/resumeParsingTool.js";
import { normalizeSkills } from "./tools/skillNormalizationTool.js";
import { executeFeatureExtraction, FeatureVector } from "./tools/featureExtractionTool.js";
import { executeDeterministicMatch, DeterministicMatchOutput } from "./tools/deterministicMatchingTool.js";
import { executeScoringEngine, ScoringEngineOutput } from "./tools/scoringEngineTool.js";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: "parseResume",
    description: "Extracts structured candidate data (experience years, skills, location, education, keywords) from resume text or S3 key.",
    parameters: {
      type: "object",
      properties: {
        resumeText: { type: "string", description: "Sanitized resume text" },
        s3Key: { type: "string", description: "AWS S3 storage key of candidate profile" },
      },
      required: [],
    },
  },
  {
    name: "normalizeSkills",
    description: "Normalizes an array of technical skill strings into canonical standardized names.",
    parameters: {
      type: "object",
      properties: {
        skills: {
          type: "array",
          items: { type: "string" },
          description: "List of raw technical skills",
        },
      },
      required: ["skills"],
    },
  },
  {
    name: "deterministicMatch",
    description: "Executes deterministic comparison between candidate features and opening requirements.",
    parameters: {
      type: "object",
      properties: {
        candidateExp: { type: "number", description: "Candidate years of experience" },
        experienceMin: { type: "number", description: "Minimum required experience" },
        experienceMax: { type: "number", description: "Maximum expected experience" },
        candidateSkills: { type: "array", items: { type: "string" } },
        requiredSkills: { type: "array", items: { type: "string" } },
        candidateLocation: { type: "string" },
        openingLocation: { type: "string" },
      },
      required: ["candidateExp", "experienceMin", "candidateSkills", "requiredSkills", "candidateLocation"],
    },
  },
  {
    name: "scoringEngine",
    description: "Calculates the final deterministic candidate score using mandatory formula: (0.5 * skillMatchScore) + (0.3 * experienceMatchScore) + (0.2 * locationMatchScore).",
    parameters: {
      type: "object",
      properties: {
        skillMatchScore: { type: "number", description: "Normalized skill overlap score (0 to 1)" },
        experienceMatchScore: { type: "number", description: "Experience match score (0, 0.8, or 1)" },
        locationMatchScore: { type: "number", description: "Location match score (0.5 or 1)" },
      },
      required: ["skillMatchScore", "experienceMatchScore", "locationMatchScore"],
    },
  },
  {
    name: "extractFeatureVector",
    description: "Generates full structured feature vector comparing parsed candidate profile against opening requirements.",
    parameters: {
      type: "object",
      properties: {
        parsedProfile: { type: "object" },
        openingRequirements: { type: "object" },
      },
      required: ["parsedProfile", "openingRequirements"],
    },
  },
];

export async function dispatchToolCall(toolName: string, args: any): Promise<any> {
  switch (toolName) {
    case "parseResume":
      return await executeResumeParsing(args);

    case "normalizeSkills":
      return { normalizedSkills: normalizeSkills(args.skills || []) };

    case "deterministicMatch":
      return executeDeterministicMatch(args);

    case "scoringEngine":
      return executeScoringEngine(args);

    case "extractFeatureVector":
      return executeFeatureExtraction(args);

    default:
      throw new Error(`Unrecognized agent tool: ${toolName}`);
  }
}
