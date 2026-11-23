import { normalizeSkills } from "./skillNormalizationTool.js";
import { parseResumeFromS3 } from "../fileParser.js";

export interface ParsedResumeSchema {
  experienceYears: number;
  skills: string[];
  normalizedSkills: string[];
  location: string;
  education: string[];
  keywords: string[];
}

/**
 * Extracts candidate profile features from sanitized resume text.
 */
export function extractStructuredResume(resumeText: string): ParsedResumeSchema {
  // 1. Detect experience years
  let experienceYears = 0;
  const expPatterns = [
    /(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?\s+experience/i,
    /experience\s*:\s*(\d+)\+?\s*(?:years?|yrs?)/i,
    /over\s+(\d+)\s+years/i,
    /(\d+)\s+years\s+in\s+software/i,
  ];

  for (const pattern of expPatterns) {
    const match = resumeText.match(pattern);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > 0 && parsed < 40) {
        experienceYears = parsed;
        break;
      }
    }
  }

  // Fallback: estimate from graduation or year ranges if no explicit pattern
  if (experienceYears === 0) {
    const yearMatches = [...resumeText.matchAll(/\b(20\d{2}|19\d{2})\b/g)].map((m) =>
      parseInt(m[1], 10)
    );
    if (yearMatches.length >= 2) {
      const minYear = Math.min(...yearMatches);
      const currentYear = new Date().getFullYear();
      const diff = currentYear - minYear;
      if (diff > 0 && diff <= 30) {
        experienceYears = diff;
      }
    }
  }

  // 2. Technical skill keywords catalog
  const KNOWN_SKILLS = [
    "JavaScript", "TypeScript", "React", "React.js", "Next.js", "Node.js", "Nodejs",
    "Express", "Python", "Docker", "Kubernetes", "AWS", "PostgreSQL", "MongoDB",
    "Tailwind CSS", "Redis", "GraphQL", "CI/CD", "GitHub Actions", "Terraform",
    "Keycloak", "OAuth2", "Prisma", "Vitest", "Jest", "Microservices", "REST API",
    "C++", "Java", "Go", "Git", "Kafka", "SQL", "HTML5", "CSS3"
  ];

  const foundSkills = new Set<string>();
  for (const skill of KNOWN_SKILLS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(resumeText)) {
      foundSkills.add(skill);
    }
  }

  const rawSkills = Array.from(foundSkills);
  const normalized = normalizeSkills(rawSkills);

  // 3. Location detection
  let location = "Remote";
  const locationMatches = resumeText.match(
    /(?:Location|Address|Based in|City)\s*[:\-]?\s*([A-Za-z\s,]+(?:Remote|New York|San Francisco|Austin|Boston|Chicago|Seattle|London|Berlin|CA|NY|TX|MA|IL|WA))/i
  );
  if (locationMatches && locationMatches[1]) {
    location = locationMatches[1].trim();
  } else if (/remote/i.test(resumeText)) {
    location = "Remote";
  } else if (/new york/i.test(resumeText)) {
    location = "New York, NY";
  } else if (/san francisco/i.test(resumeText)) {
    location = "San Francisco, CA";
  } else if (/austin/i.test(resumeText)) {
    location = "Austin, TX";
  }

  // 4. Education extraction
  const education: string[] = [];
  const degreePatterns = [
    /(?:bachelor(?:'s)?|b\.?s\.?|b\.?tech|master(?:'s)?|m\.?s\.?|m\.?tech|ph\.?d)[\w\s,]+/gi,
    /(?:computer science|software engineering|information technology|electrical engineering)/gi
  ];
  for (const pat of degreePatterns) {
    const degrees = resumeText.match(pat);
    if (degrees) {
      for (const d of degrees) {
        if (!education.includes(d.trim()) && education.length < 3) {
          education.push(d.trim());
        }
      }
    }
  }
  if (education.length === 0) {
    education.push("Bachelor's Degree in Computer Science");
  }

  // 5. Keywords extraction
  const keywords = Array.from(
    new Set([...normalized, location, experienceYears ? `${experienceYears}+ years` : "Experienced"])
  );

  return {
    experienceYears,
    skills: rawSkills,
    normalizedSkills: normalized,
    location,
    education,
    keywords,
  };
}

/**
 * Resume Parsing Tool callable by Agent Orchestrator.
 */
export async function executeResumeParsing(params: {
  s3Key?: string;
  resumeText?: string;
}): Promise<ParsedResumeSchema> {
  let text = params.resumeText || "";
  if (!text && params.s3Key) {
    text = await parseResumeFromS3(params.s3Key);
  }

  return extractStructuredResume(text);
}
