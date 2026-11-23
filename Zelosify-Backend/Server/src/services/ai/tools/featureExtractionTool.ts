import { ParsedResumeSchema } from "./resumeParsingTool.js";
import { executeDeterministicMatch } from "./deterministicMatchingTool.js";

export interface FeatureVector {
  experienceYears: number;
  skills: string[];
  location: string;
  skillMatchScore: number;
  experienceMatchScore: number;
  locationMatchScore: number;
}

export interface FeatureExtractionInput {
  parsedProfile: ParsedResumeSchema;
  openingRequirements: {
    experienceMin: number;
    experienceMax?: number | null;
    requiredSkills: string[];
    location?: string | null;
  };
}

export function executeFeatureExtraction(
  input: FeatureExtractionInput
): FeatureVector {
  const matchResult = executeDeterministicMatch({
    candidateExp: input.parsedProfile.experienceYears,
    experienceMin: input.openingRequirements.experienceMin,
    experienceMax: input.openingRequirements.experienceMax,
    candidateSkills: input.parsedProfile.normalizedSkills,
    requiredSkills: input.openingRequirements.requiredSkills,
    candidateLocation: input.parsedProfile.location,
    openingLocation: input.openingRequirements.location,
  });

  return {
    experienceYears: input.parsedProfile.experienceYears,
    skills: input.parsedProfile.normalizedSkills,
    location: input.parsedProfile.location,
    skillMatchScore: matchResult.skillMatchScore,
    experienceMatchScore: matchResult.experienceMatchScore,
    locationMatchScore: matchResult.locationMatchScore,
  };
}
