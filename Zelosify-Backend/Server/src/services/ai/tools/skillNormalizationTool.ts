/**
 * Normalizes technical skills into standardized canonical names.
 */

const CANONICAL_SKILL_MAP: Record<string, string> = {
  "react.js": "React",
  "reactjs": "React",
  "react": "React",
  "next.js": "Next.js",
  "nextjs": "Next.js",
  "node.js": "Node.js",
  "nodejs": "Node.js",
  "node": "Node.js",
  "ts": "TypeScript",
  "typescript": "TypeScript",
  "js": "JavaScript",
  "javascript": "JavaScript",
  "py": "Python",
  "python": "Python",
  "aws": "AWS",
  "amazon web services": "AWS",
  "k8s": "Kubernetes",
  "kubernetes": "Kubernetes",
  "docker": "Docker",
  "postgres": "PostgreSQL",
  "postgresql": "PostgreSQL",
  "mongo": "MongoDB",
  "mongodb": "MongoDB",
  "express": "Express.js",
  "express.js": "Express.js",
  "graphql": "GraphQL",
  "prisma": "Prisma",
  "tailwind": "Tailwind CSS",
  "tailwindcss": "Tailwind CSS",
  "ci/cd": "CI/CD",
  "cicd": "CI/CD",
  "github actions": "GitHub Actions",
  "terraform": "Terraform",
  "keycloak": "Keycloak",
  "oauth": "OAuth2",
  "oauth2": "OAuth2",
  "redis": "Redis",
  "vitest": "Vitest",
  "jest": "Jest",
};

export function normalizeSkill(skill: string): string {
  const clean = skill.trim().toLowerCase();
  return CANONICAL_SKILL_MAP[clean] || skill.trim();
}

export function normalizeSkills(skills: string[]): string[] {
  const normalizedSet = new Set<string>();
  for (const s of skills) {
    if (s && typeof s === "string") {
      normalizedSet.add(normalizeSkill(s));
    }
  }
  return Array.from(normalizedSet);
}
