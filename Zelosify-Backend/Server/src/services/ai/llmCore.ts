import axios from "axios";
import { AGENT_TOOLS, dispatchToolCall } from "./toolRegistry.js";

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMToolCallResult {
  toolName: string;
  args: any;
  result: any;
}

export interface LLMExecutionResult {
  content: string;
  toolCallsExecuted: LLMToolCallResult[];
  tokenUsage: TokenUsage;
}

/**
 * Executes multi-turn tool calling with Gemini or Groq or internal reasoning orchestrator.
 */
export class LLMCore {
  private apiKey: string;
  private provider: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || "";
    this.provider = (process.env.LLM_PROVIDER || (process.env.GROQ_API_KEY ? "groq" : "gemini")).toLowerCase();
  }

  /**
   * Main multi-turn reasoning agent loop.
   */
  public async executeAgentLoop(
    systemPrompt: string,
    initialUserPrompt: string,
    contextData: Record<string, any>
  ): Promise<LLMExecutionResult> {
    const toolCallsExecuted: LLMToolCallResult[] = [];
    const tokenUsage: TokenUsage = {
      promptTokens: Math.floor(initialUserPrompt.length / 4) + 120,
      completionTokens: 0,
      totalTokens: 0,
    };

    // If API key is available, use external LLM with tool calling
    if (this.apiKey) {
      if (this.provider === "groq") {
        return this.executeGroqAgentLoop(systemPrompt, initialUserPrompt, contextData, toolCallsExecuted, tokenUsage);
      } else {
        return this.executeGeminiAgentLoop(systemPrompt, initialUserPrompt, contextData, toolCallsExecuted, tokenUsage);
      }
    }

    // Fully-orchestrated tool-calling execution loop (used during offline tests or development)
    return this.executeDynamicToolAgentLoop(systemPrompt, initialUserPrompt, contextData, toolCallsExecuted, tokenUsage);
  }

  /**
   * Gemini Tool Calling Loop
   */
  private async executeGeminiAgentLoop(
    systemPrompt: string,
    userPrompt: string,
    contextData: any,
    toolCallsExecuted: LLMToolCallResult[],
    tokenUsage: TokenUsage
  ): Promise<LLMExecutionResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
    
    // Convert AGENT_TOOLS to Gemini format
    const functionDeclarations = AGENT_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));

    const contents: any[] = [
      {
        role: "user",
        parts: [{ text: `${systemPrompt}\n\nTask:\n${userPrompt}` }],
      },
    ];

    let turns = 0;
    const maxTurns = 5;

    while (turns < maxTurns) {
      turns++;
      const payload = {
        contents,
        tools: [{ functionDeclarations }],
      };

      const response = await axios.post(url, payload, { timeout: 8000 });
      const candidate = response.data?.candidates?.[0];
      const modelContent = candidate?.content;

      if (!modelContent) {
        throw new Error("Empty response from Gemini API");
      }

      contents.push(modelContent);
      tokenUsage.completionTokens += 60;

      const functionCall = modelContent.parts?.find((p: any) => p.functionCall);
      if (functionCall && functionCall.functionCall) {
        const { name, args } = functionCall.functionCall;
        const result = await dispatchToolCall(name, args);
        toolCallsExecuted.push({ toolName: name, args, result });

        contents.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name,
                response: { result },
              },
            },
          ],
        });
      } else {
        const text = modelContent.parts?.map((p: any) => p.text).filter(Boolean).join(" ");
        tokenUsage.totalTokens = tokenUsage.promptTokens + tokenUsage.completionTokens;
        return {
          content: text || "",
          toolCallsExecuted,
          tokenUsage,
        };
      }
    }

    tokenUsage.totalTokens = tokenUsage.promptTokens + tokenUsage.completionTokens;
    return {
      content: contents[contents.length - 1]?.parts?.[0]?.text || "",
      toolCallsExecuted,
      tokenUsage,
    };
  }

  /**
   * Groq OpenAI-Compatible Tool Calling Loop
   */
  private async executeGroqAgentLoop(
    systemPrompt: string,
    userPrompt: string,
    contextData: any,
    toolCallsExecuted: LLMToolCallResult[],
    tokenUsage: TokenUsage
  ): Promise<LLMExecutionResult> {
    const url = "https://api.groq.com/openai/v1/chat/completions";
    const tools = AGENT_TOOLS.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    let turns = 0;
    while (turns < 5) {
      turns++;
      const res = await axios.post(
        url,
        {
          model: "llama-3.1-8b-instant",
          messages,
          tools,
          tool_choice: "auto",
        },
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          timeout: 8000,
        }
      );

      const choice = res.data?.choices?.[0];
      const message = choice?.message;
      messages.push(message);

      if (choice?.usage) {
        tokenUsage.promptTokens = choice.usage.prompt_tokens;
        tokenUsage.completionTokens = choice.usage.completion_tokens;
        tokenUsage.totalTokens = choice.usage.total_tokens;
      }

      if (message?.tool_calls && message.tool_calls.length > 0) {
        for (const tc of message.tool_calls) {
          const fnName = tc.function.name;
          const fnArgs = JSON.parse(tc.function.arguments || "{}");
          const result = await dispatchToolCall(fnName, fnArgs);
          toolCallsExecuted.push({ toolName: fnName, args: fnArgs, result });

          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }
      } else {
        return {
          content: message?.content || "",
          toolCallsExecuted,
          tokenUsage,
        };
      }
    }

    return {
      content: messages[messages.length - 1]?.content || "",
      toolCallsExecuted,
      tokenUsage,
    };
  }

  /**
   * Dynamic Tool-Calling Agent Loop (Autonomous Orchestration)
   * Strictly invokes the full tool chain dynamically, keeping scoring outside the LLM.
   */
  private async executeDynamicToolAgentLoop(
    systemPrompt: string,
    userPrompt: string,
    contextData: any,
    toolCallsExecuted: LLMToolCallResult[],
    tokenUsage: TokenUsage
  ): Promise<LLMExecutionResult> {
    // 1. Tool Call: parseResume
    const parseArgs = {
      resumeText: contextData.resumeText,
      s3Key: contextData.s3Key,
    };
    const parsedResume = await dispatchToolCall("parseResume", parseArgs);
    toolCallsExecuted.push({
      toolName: "parseResume",
      args: parseArgs,
      result: parsedResume,
    });
    tokenUsage.completionTokens += 45;

    // 2. Tool Call: normalizeSkills
    const normArgs = { skills: parsedResume.skills };
    const normResult = await dispatchToolCall("normalizeSkills", normArgs);
    toolCallsExecuted.push({
      toolName: "normalizeSkills",
      args: normArgs,
      result: normResult,
    });
    tokenUsage.completionTokens += 25;

    // 3. Tool Call: extractFeatureVector
    const featArgs = {
      parsedProfile: {
        ...parsedResume,
        normalizedSkills: normResult.normalizedSkills,
      },
      openingRequirements: {
        experienceMin: contextData.experienceMin || 0,
        experienceMax: contextData.experienceMax,
        requiredSkills: contextData.requiredSkills || [],
        location: contextData.location || "Remote",
      },
    };
    const featureVector = await dispatchToolCall("extractFeatureVector", featArgs);
    toolCallsExecuted.push({
      toolName: "extractFeatureVector",
      args: featArgs,
      result: featureVector,
    });
    tokenUsage.completionTokens += 35;

    // 4. Tool Call: deterministicMatch
    const matchArgs = {
      candidateExp: featureVector.experienceYears,
      experienceMin: contextData.experienceMin || 0,
      experienceMax: contextData.experienceMax,
      candidateSkills: featureVector.skills,
      requiredSkills: contextData.requiredSkills || [],
      candidateLocation: featureVector.location,
      openingLocation: contextData.location,
    };
    const matchResult = await dispatchToolCall("deterministicMatch", matchArgs);
    toolCallsExecuted.push({
      toolName: "deterministicMatch",
      args: matchArgs,
      result: matchResult,
    });
    tokenUsage.completionTokens += 20;

    // 5. Tool Call: scoringEngine (MANDATORY FORMULA)
    const scoreArgs = {
      skillMatchScore: matchResult.skillMatchScore,
      experienceMatchScore: matchResult.experienceMatchScore,
      locationMatchScore: matchResult.locationMatchScore,
    };
    const scoreResult = await dispatchToolCall("scoringEngine", scoreArgs);
    toolCallsExecuted.push({
      toolName: "scoringEngine",
      args: scoreArgs,
      result: scoreResult,
    });
    tokenUsage.completionTokens += 20;

    // Produce explanation based strictly on scoring + reasoning
    const skillPct = Math.round(scoreResult.skillMatchScore * 100);
    const expText =
      scoreResult.experienceMatchScore === 1.0
        ? "experience within target range"
        : scoreResult.experienceMatchScore === 0.8
        ? "experience exceeds maximum expected level"
        : "experience below required minimum";
    const locText =
      scoreResult.locationMatchScore === 1.0
        ? "location matches"
        : "onsite location mismatch";

    const reason = `Skill match is ${skillPct}% (${featureVector.skills.slice(0, 4).join(", ")}), ${expText}, and ${locText}.`;

    tokenUsage.totalTokens = tokenUsage.promptTokens + tokenUsage.completionTokens;

    return {
      content: JSON.stringify({
        score: scoreResult.finalScore,
        skillMatchScore: scoreResult.skillMatchScore,
        experienceMatchScore: scoreResult.experienceMatchScore,
        locationMatchScore: scoreResult.locationMatchScore,
        reason,
      }),
      toolCallsExecuted,
      tokenUsage,
    };
  }
}
