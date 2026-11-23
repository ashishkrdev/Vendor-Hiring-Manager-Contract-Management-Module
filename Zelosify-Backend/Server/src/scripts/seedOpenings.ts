import prisma from "../config/prisma/prisma.js";

/**
 * Seeds the database with sample job openings for testing purposes.
 * - Ensures Tenant "Bruce Wayne Corp" exists
 * - Ensures a Hiring Manager user exists for assigning openings
 * - Populates at least 12 varied contract openings under the same tenant
 */
async function seedOpenings() {
  try {
    console.log("🌱 Seeding openings data...");

    // 1. Ensure Tenant "Bruce Wayne Corp" exists
    let tenant = await prisma.tenants.findFirst({
      where: { companyName: "Bruce Wayne Corp" },
    });

    if (!tenant) {
      tenant = await prisma.tenants.create({
        data: {
          companyName: "Bruce Wayne Corp",
        },
      });
      console.log(`✅ Created Tenant: ${tenant.companyName} (${tenant.tenantId})`);
    } else {
      console.log(`ℹ️ Existing Tenant found: ${tenant.companyName} (${tenant.tenantId})`);
    }

    const tenantId = tenant.tenantId;

    // 2. Ensure a Hiring Manager exists for this tenant
    let hiringManager = await prisma.user.findFirst({
      where: {
        tenantId,
        role: "HIRING_MANAGER",
      },
    });

    if (!hiringManager) {
      hiringManager = await prisma.user.create({
        data: {
          username: "bruce_wayne_hm",
          email: "hm@brucewaynecorp.com",
          firstName: "Bruce",
          lastName: "Wayne",
          role: "HIRING_MANAGER",
          tenantId,
          department: "Engineering Leadership",
          profileComplete: true,
        },
      });
      console.log(`✅ Created Hiring Manager: ${hiringManager.firstName} ${hiringManager.lastName} (${hiringManager.id})`);
    } else {
      console.log(`ℹ️ Existing Hiring Manager found: ${hiringManager.firstName} ${hiringManager.lastName} (${hiringManager.id})`);
    }

    // 3. Define 14 diverse contract openings
    const sampleOpenings = [
      {
        title: "Senior Full Stack Engineer",
        description: "Seeking a senior full stack developer proficient in React, Next.js, Node.js, and TypeScript. Experience with distributed architectures and PostgreSQL required.",
        location: "Remote",
        contractType: "Full-Time 12 Months",
        experienceMin: 5,
        experienceMax: 8,
      },
      {
        title: "Cloud Infrastructure Architect",
        description: "Lead AWS infrastructure automation, Terraform IaC, multi-region failover, and Docker container orchestration. Strong Kubernetes background expected.",
        location: "New York, NY",
        contractType: "Full-Time 6 Months",
        experienceMin: 8,
        experienceMax: 12,
      },
      {
        title: "Lead Backend Developer",
        description: "Design high-throughput microservices using Node.js, Express, Prisma ORM, and message queues. Deep SQL optimization skills needed.",
        location: "Remote",
        contractType: "Fixed Term 12 Months",
        experienceMin: 6,
        experienceMax: 10,
      },
      {
        title: "AI/ML Integration Engineer",
        description: "Integrate LLM tool-calling agents, retrieval augmented generation, NLP pipelines, and model evaluation metrics into production SaaS.",
        location: "San Francisco, CA",
        contractType: "C2C 9 Months",
        experienceMin: 4,
        experienceMax: 7,
      },
      {
        title: "Senior Frontend Specialist",
        description: "Build reactive, accessible, high-performance web applications using Next.js 15, Tailwind CSS, Redux Toolkit, and Radix UI components.",
        location: "Remote",
        contractType: "Full-Time 6 Months",
        experienceMin: 4,
        experienceMax: 8,
      },
      {
        title: "DevOps & Platform Engineer",
        description: "Maintain CI/CD pipelines (GitHub Actions), automate container deployments, manage monitoring dashboards, and maintain 99.99% uptime.",
        location: "Austin, TX",
        contractType: "Full-Time 12 Months",
        experienceMin: 5,
        experienceMax: 9,
      },
      {
        title: "Cybersecurity & IAM Compliance Specialist",
        description: "Enforce Keycloak/OAuth2/OIDC SSO security standards, RBAC policies, penetration audit fixes, and cryptographic token verification.",
        location: "Remote",
        contractType: "Fixed Term 6 Months",
        experienceMin: 7,
        experienceMax: 12,
      },
      {
        title: "Staff Distributed Systems Architect",
        description: "Architect event-driven systems handling millions of daily events. Deep experience with Kafka, Redis, horizontal scaling, and latency SLAs.",
        location: "Boston, MA",
        contractType: "C2C 12 Months",
        experienceMin: 10,
        experienceMax: 15,
      },
      {
        title: "Quality Assurance & Automation Lead",
        description: "Build robust automated end-to-end and integration test suites with Vitest, Playwright, and load testing tooling.",
        location: "Remote",
        contractType: "Full-Time 6 Months",
        experienceMin: 5,
        experienceMax: 8,
      },
      {
        title: "Data Pipeline Engineer",
        description: "Construct scalable ETL pipelines, schema migrations, and analytics ingestion layers with PostgreSQL, Python, and Airflow.",
        location: "Chicago, IL",
        contractType: "Part-Time Contract",
        experienceMin: 4,
        experienceMax: 7,
      },
      {
        title: "Mobile Application Engineer",
        description: "Develop enterprise React Native mobile apps with offline synchronization, biometric authentication, and push notifications.",
        location: "Remote",
        contractType: "Full-Time 6 Months",
        experienceMin: 3,
        experienceMax: 6,
      },
      {
        title: "Enterprise API Integration Specialist",
        description: "Build partner-facing REST and GraphQL APIs with rate limiting, signature verification, and automated webhook web workers.",
        location: "Remote",
        contractType: "C2C 12 Months",
        experienceMin: 6,
        experienceMax: 10,
      },
      {
        title: "Site Reliability Engineer (Observability)",
        description: "Focus on application observability, distributed tracing, structured JSON logging, and latency degradation alerts under 2000ms SLA.",
        location: "Seattle, WA",
        contractType: "Full-Time 9 Months",
        experienceMin: 4,
        experienceMax: 8,
      },
      {
        title: "Product Security Engineer",
        description: "Implement defense-in-depth security, prevent prompt injection attacks in AI integrations, and audit file upload sanitization workflows.",
        location: "Remote",
        contractType: "Fixed Term 12 Months",
        experienceMin: 5,
        experienceMax: 9,
      },
    ];

    let createdCount = 0;
    for (const op of sampleOpenings) {
      const existing = await prisma.opening.findFirst({
        where: {
          tenantId,
          title: op.title,
        },
      });

      if (!existing) {
        await prisma.opening.create({
          data: {
            tenantId,
            hiringManagerId: hiringManager.id,
            title: op.title,
            description: op.description,
            location: op.location,
            contractType: op.contractType,
            experienceMin: op.experienceMin,
            experienceMax: op.experienceMax,
            status: "OPEN",
          },
        });
        createdCount++;
      }
    }

    console.log(`🎉 Seeding complete! Created ${createdCount} openings (Total sample list: ${sampleOpenings.length}) for tenant "${tenant.companyName}".`);
  } catch (error) {
    console.error("❌ Error seeding openings:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedOpenings();
