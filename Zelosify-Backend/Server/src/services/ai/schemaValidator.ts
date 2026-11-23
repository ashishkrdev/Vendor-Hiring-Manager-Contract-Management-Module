import Ajv, { JSONSchemaType } from "ajv";

const ajv = new Ajv({ allErrors: true, coerceTypes: true });

export interface AgentFinalOutput {
  recommended: boolean;
  score: number;
  confidence: number;
  reason: string;
}

const agentFinalSchema: JSONSchemaType<AgentFinalOutput> = {
  type: "object",
  properties: {
    recommended: { type: "boolean" },
    score: { type: "number" },
    confidence: { type: "number" },
    reason: { type: "string" },
  },
  required: ["recommended", "score", "confidence", "reason"],
  additionalProperties: true,
};

const validateAgentOutput = ajv.compile(agentFinalSchema);

export function validateFinalOutput(data: unknown): {
  isValid: boolean;
  errors?: string[];
  validatedData?: AgentFinalOutput;
} {
  const isValid = validateAgentOutput(data);
  if (!isValid) {
    const errors = validateAgentOutput.errors?.map(
      (err) => `${err.instancePath} ${err.message}`
    ) || ["Invalid agent output schema"];
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    validatedData: data as AgentFinalOutput,
  };
}
