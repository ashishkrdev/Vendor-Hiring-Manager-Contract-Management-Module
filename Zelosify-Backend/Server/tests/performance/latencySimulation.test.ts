import { describe, it, expect } from "vitest";
import { AgentOrchestrator } from "../../src/services/ai/agentOrchestrator.js";

describe("Performance SLA Test: 100 Profiles Latency Simulation", () => {
  it("should evaluate 100 profiles with P95 latency strictly < 2000ms", async () => {
    const orchestrator = new AgentOrchestrator();
    const latencies: number[] = [];
    const TOTAL_PROFILES = 100;

    const opening = {
      id: "op-perf-100",
      title: "Senior Full Stack Engineer",
      description: "React, Node.js, TypeScript, PostgreSQL, AWS, Docker",
      location: "Remote",
      contractType: "Full-Time",
      experienceMin: 5,
      experienceMax: 8,
    };

    const sampleSkills = [
      ["React", "Node.js", "TypeScript", "PostgreSQL"],
      ["Python", "Django", "Docker", "AWS"],
      ["React", "Next.js", "Tailwind CSS"],
      ["Java", "Spring Boot", "Kubernetes"],
      ["Node.js", "Express.js", "MongoDB", "Redis"],
    ];

    for (let i = 1; i <= TOTAL_PROFILES; i++) {
      const expYears = (i % 12) + 1; // 1 to 12 years
      const skills = sampleSkills[i % sampleSkills.length];
      const location = i % 3 === 0 ? "Remote" : i % 3 === 1 ? "New York, NY" : "Seattle, WA";

      const resumeText = `Candidate #${i}\nExperience: ${expYears} years in software engineering.\nSkills: ${skills.join(", ")}\nLocation: ${location}. Education: BS Computer Science.`;

      const start = Date.now();
      const result = await orchestrator.evaluateCandidate({
        profileId: i,
        s3Key: `tenant-perf/op-perf-100/${Date.now()}_resume_${i}.pdf`,
        resumeText,
        opening,
      });
      const duration = Date.now() - start;

      latencies.push(duration);

      // Verify each individual profile returned valid score
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    }

    // Sort latencies to compute percentiles
    latencies.sort((a, b) => a - b);

    const p50Index = Math.floor(TOTAL_PROFILES * 0.50);
    const p90Index = Math.floor(TOTAL_PROFILES * 0.90);
    const p95Index = Math.floor(TOTAL_PROFILES * 0.95);
    const p99Index = Math.floor(TOTAL_PROFILES * 0.99);

    const p50 = latencies[p50Index];
    const p90 = latencies[p90Index];
    const p95 = latencies[p95Index];
    const p99 = latencies[p99Index];

    console.log("=== 100 PROFILES PERFORMANCE SLA REPORT ===");
    console.log(`Min Latency:  ${latencies[0]} ms`);
    console.log(`P50 Latency:  ${p50} ms`);
    console.log(`P90 Latency:  ${p90} ms`);
    console.log(`P95 Latency:  ${p95} ms`);
    console.log(`P99 Latency:  ${p99} ms`);
    console.log(`Max Latency:  ${latencies[TOTAL_PROFILES - 1]} ms`);
    console.log("===========================================");

    // Strict assertions matching the document requirements:
    // P95 latency < 2000ms
    expect(p95).toBeLessThan(2000);
  });
});
