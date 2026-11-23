import { describe, it, expect } from "vitest";
import {
  calculateExperienceScore,
  calculateSkillScore,
  calculateLocationScore,
  executeDeterministicMatch,
} from "../../src/services/ai/tools/deterministicMatchingTool.js";
import { executeScoringEngine } from "../../src/services/ai/tools/scoringEngineTool.js";
import { evaluateDecisionPolicy } from "../../src/services/ai/decisionPolicy.js";

describe("Deterministic Matching & Scoring Unit Tests", () => {
  describe("Experience Boundary Tests", () => {
    const min = 5;
    const max = 8;

    it("should return 0 when candidate experience is below min boundary", () => {
      expect(calculateExperienceScore(4, min, max)).toBe(0);
      expect(calculateExperienceScore(0, min, max)).toBe(0);
      expect(calculateExperienceScore(4.9, min, max)).toBe(0);
    });

    it("should return 1 when candidate experience is within min-max range (inclusive boundaries)", () => {
      expect(calculateExperienceScore(5, min, max)).toBe(1.0); // Exact min boundary
      expect(calculateExperienceScore(6.5, min, max)).toBe(1.0); // Mid range
      expect(calculateExperienceScore(8, min, max)).toBe(1.0); // Exact max boundary
    });

    it("should return 0.8 when candidate experience is strictly above max boundary", () => {
      expect(calculateExperienceScore(9, min, max)).toBe(0.8);
      expect(calculateExperienceScore(15, min, max)).toBe(0.8);
      expect(calculateExperienceScore(8.1, min, max)).toBe(0.8);
    });

    it("should handle open-ended max range correctly (null/undefined)", () => {
      expect(calculateExperienceScore(6, 5, null)).toBe(1.0);
      expect(calculateExperienceScore(20, 5, null)).toBe(1.0);
      expect(calculateExperienceScore(3, 5, null)).toBe(0);
    });
  });

  describe("Skill Overlap Accuracy Tests", () => {
    const requiredSkills = ["React", "Node.js", "TypeScript", "PostgreSQL"];

    it("should return 1.0 for 100% skill overlap", () => {
      const candidateSkills = ["React", "Node.js", "TypeScript", "PostgreSQL", "Docker"];
      const score = calculateSkillScore(candidateSkills, requiredSkills);
      expect(score).toBe(1.0);
    });

    it("should return 0.75 for 3 out of 4 matching skills", () => {
      const candidateSkills = ["React", "Node.js", "TypeScript", "Python"];
      const score = calculateSkillScore(candidateSkills, requiredSkills);
      expect(score).toBe(0.75);
    });

    it("should return 0.50 for 2 out of 4 matching skills", () => {
      const candidateSkills = ["React", "Node.js"];
      const score = calculateSkillScore(candidateSkills, requiredSkills);
      expect(score).toBe(0.5);
    });

    it("should return 0 for zero matching skills", () => {
      const candidateSkills = ["PHP", "Ruby", "Laravel"];
      const score = calculateSkillScore(candidateSkills, requiredSkills);
      expect(score).toBe(0);
    });

    it("should be case-insensitive in skill matching", () => {
      const candidateSkills = ["react", "NODE.JS", "typescript", "postgresql"];
      const score = calculateSkillScore(candidateSkills, requiredSkills);
      expect(score).toBe(1.0);
    });
  });

  describe("Location Matching Logic Tests", () => {
    it("should return 1.0 when either candidate or opening is Remote", () => {
      expect(calculateLocationScore("Remote", "New York, NY")).toBe(1.0);
      expect(calculateLocationScore("Austin, TX", "Remote")).toBe(1.0);
      expect(calculateLocationScore("Remote", "Remote")).toBe(1.0);
    });

    it("should return 1.0 when candidate and opening locations match exactly", () => {
      expect(calculateLocationScore("New York, NY", "New York, NY")).toBe(1.0);
      expect(calculateLocationScore("San Francisco, CA", "San Francisco, CA")).toBe(1.0);
    });

    it("should return 0.5 for onsite mismatch", () => {
      expect(calculateLocationScore("Austin, TX", "Boston, MA")).toBe(0.5);
      expect(calculateLocationScore("Seattle, WA", "Chicago, IL")).toBe(0.5);
    });
  });

  describe("Mandatory Final Score Formula Correctness", () => {
    // Formula: FinalScore = (0.5 * skillMatchScore) + (0.3 * experienceMatchScore) + (0.2 * locationMatchScore)
    it("should calculate exact score using mandatory formula weights (0.5, 0.3, 0.2)", () => {
      const result = executeScoringEngine({
        skillMatchScore: 0.8,
        experienceMatchScore: 1.0,
        locationMatchScore: 1.0,
      });

      // 0.5*0.8 + 0.3*1.0 + 0.2*1.0 = 0.4 + 0.3 + 0.2 = 0.90
      expect(result.finalScore).toBeCloseTo(0.9, 4);
      expect(result.skillMatchScore).toBe(0.8);
      expect(result.experienceMatchScore).toBe(1.0);
      expect(result.locationMatchScore).toBe(1.0);
    });

    it("should calculate correct score for borderline candidate", () => {
      const result = executeScoringEngine({
        skillMatchScore: 0.5,
        experienceMatchScore: 0.8, // above max
        locationMatchScore: 0.5, // onsite mismatch
      });

      // 0.5*0.5 + 0.3*0.8 + 0.2*0.5 = 0.25 + 0.24 + 0.10 = 0.59
      expect(result.finalScore).toBeCloseTo(0.59, 4);
    });

    it("should calculate correct score for rejected candidate below min experience", () => {
      const result = executeScoringEngine({
        skillMatchScore: 0.25,
        experienceMatchScore: 0, // below min
        locationMatchScore: 1.0,
      });

      // 0.5*0.25 + 0.3*0 + 0.2*1.0 = 0.125 + 0 + 0.2 = 0.325
      expect(result.finalScore).toBeCloseTo(0.325, 4);
    });
  });

  describe("Decision Policy Thresholds", () => {
    it("should mark score >= 0.75 as Recommended", () => {
      const high = evaluateDecisionPolicy(0.82);
      expect(high.recommended).toBe(true);
      expect(high.category).toBe("RECOMMENDED");

      const threshold = evaluateDecisionPolicy(0.75);
      expect(threshold.recommended).toBe(true);
      expect(threshold.category).toBe("RECOMMENDED");
    });

    it("should mark 0.50 <= score < 0.75 as Borderline (recommended: false)", () => {
      const mid = evaluateDecisionPolicy(0.68);
      expect(mid.recommended).toBe(false);
      expect(mid.category).toBe("BORDERLINE");

      const edge = evaluateDecisionPolicy(0.50);
      expect(edge.recommended).toBe(false);
      expect(edge.category).toBe("BORDERLINE");
    });

    it("should mark score < 0.50 as Not Recommended", () => {
      const low = evaluateDecisionPolicy(0.42);
      expect(low.recommended).toBe(false);
      expect(low.category).toBe("NOT_RECOMMENDED");
    });
  });
});
