// Helper function to check if a string is a GUID/UUID
function isGuid(str: string): boolean {
  if (!str) return false;
  
  // GUID/UUID pattern: 8-4-4-4-12 hexadecimal digits
  const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return guidPattern.test(str);
}

import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  Prompt,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fetch from "node-fetch";
import {
  OuraApiResponse,
  DailyActivity,
  DailyReadiness,
  DailySleep,
  DailyStress,
  SleepSession,
  HeartRate,
  EnhancedTag,
  TagApiResponse
} from "./interfaces.js";

// Define the prompts with guidance for automatic correlation
const getReadinessPrompt: Prompt = {
  id: "get-readiness",
  name: "Get readiness data",
  description: "Retrieve readiness scores from your Oura ring",
  text: "Show me my readiness scores for the [TIME_PERIOD]. To do this, you'll need to:\n1. Use the oura-fetch tool to get daily readiness data\n2. Analyze the data to show average scores and trends\n3. Consider fetching tags data for the same period to look for correlations with activities, meals, or other factors that might affect readiness",
};

const getSleepPrompt: Prompt = {
  id: "get-sleep",
  name: "Get sleep data",
  description: "Retrieve sleep metrics from your Oura ring",
  text: "Show me my sleep data for the [TIME_PERIOD]. To do this, you'll need to:\n1. Use the oura-fetch tool to get daily sleep data\n2. Analyze the data to show sleep duration, efficiency, and other metrics\n3. IMPORTANT: When calculating sleep stage percentages (deep, REM, light), always use the total_sleep_duration as the denominator, NOT time_in_bed. This ensures calculations match what the Oura app shows.\n4. If visualizing sleep stages, show percentages of actual sleep time, not time in bed.\n5. Consider fetching tags data for the same period to look for correlations with activities, meals, or other factors that might affect sleep",
};

const getActivityPrompt: Prompt = {
  id: "get-activity",
  name: "Get activity data",
  description: "Retrieve activity metrics from your Oura ring",
  text: "Show me my activity data for the [TIME_PERIOD]. To do this, you'll need to:\n1. Use the oura-fetch tool to get daily activity data\n2. Analyze the data to show steps, calories, and activity levels\n3. Consider fetching tags data for the same period to look for correlations with meals, recovery practices, or other factors that might affect activity",
};

const getHeartRatePrompt: Prompt = {
  id: "get-heart-rate",
  name: "Get heart rate data",
  description: "Retrieve heart rate data from your Oura ring",
  text: "Show me my heart rate data for the [TIME_PERIOD]. To do this, you'll need to:\n1. Use the oura-fetch tool to get heart rate data\n2. Calculate average, minimum, and maximum heart rates over the specified period\n3. Be precise with time-based calculations and always verify the units of measurement (seconds vs. minutes vs. hours)\n4. Consider fetching tags data for the same period to look for correlations with activities, meals, or other factors that might affect heart rate",
};

const getHeartRateDuringSleepPrompt: Prompt = {
  id: "get-heart-rate-during-sleep",
  name: "Get heart rate during sleep",
  description: "Retrieve heart rate data during sleep periods",
  text: "Show me my heart rate data during sleep for the [TIME_PERIOD]. To do this, you'll need to:\n1. Use the oura-fetch tool to get sleep data to identify sleep periods\n2. Use the oura-fetch tool to get heart rate data during those periods\n3. Analyze the data to show trends in heart rate during sleep\n4. Consider fetching tags data for the same period to look for correlations with evening activities, meals, or other factors that might affect night-time heart rate",
};

const getStressPrompt: Prompt = {
  id: "get-stress",
  name: "Get stress data",
  description: "Retrieve stress metrics from your Oura ring",
  text: "Show me my stress data for the [TIME_PERIOD]. To do this, you'll need to:\n1. Use the oura-fetch tool with the stress endpoint\n2. Analyze the data to show stress levels and recovery periods\n3. Consider fetching tags data for the same period to look for correlations with activities, meals, or other factors that might affect stress levels",
};

const getTagsPrompt: Prompt = {
  id: "get-tags",
  name: "Get Oura tags",
  description: "Retrieve tags from your Oura ring",
  text: "Show me my tags for the [TIME_PERIOD]. To do this, you'll need to:\n1. Use the oura-fetch tool with the tags endpoint\n2. Analyze the data to show tags I've created\n3. Consider fetching health metrics (sleep, readiness, activity, stress) for the same period to identify patterns and correlations",
};

const analyzeHealthFactorsPrompt: Prompt = {
  id: "analyze-health-factors",
  name: "Analyze health factors",
  description: "Analyze how different factors affect your health metrics",
  text: "Analyze how different factors affect my [METRIC_TYPE] for the [TIME_PERIOD]. To do this, you'll need to:\n1. Use the oura-fetch tool to get [METRIC_TYPE] data\n2. Use the oura-fetch tool to get tags data for the same period\n3. When processing duration data, always verify the units (the API provides durations in seconds) and convert appropriately to hours/minutes for visualization\n4. For sleep data, always calculate stage percentages based on total_sleep_duration, not time_in_bed\n5. Analyze the data to identify patterns and correlations\n6. Create a visualization showing how different factors (such as meals, activities, etc.) in my tags relate to my [METRIC_TYPE]",
};

const analyzeMealEffectsPrompt: Prompt = {
  id: "analyze-meal-effects",
  name: "Analyze meal effects on health",
  description: "Analyze how different meals affect your health metrics",
  text: "Analyze how my meals affect my [METRIC_TYPE] for the [TIME_PERIOD]. To do this, you'll need to:\n1. Use the oura-fetch tool to get [METRIC_TYPE] data\n2. Use the oura-fetch tool to get tags data for the same period\n3. Filter the tags to focus on those containing meal descriptions (like 'Dinner', 'Breakfast', etc.)\n4. Analyze the data to identify patterns between meal types and health metrics\n5. Create a visualization showing how different meals relate to my [METRIC_TYPE]",
};

const verifyCalculationsPrompt: Prompt = {
  id: "verify-calculations",
  name: "Verify calculations",
  description: "Double-check calculations for accuracy",
  text: "Verify my [METRIC_TYPE] calculations for [TIME_PERIOD]. To do this, you'll need to:\n1. Use the oura-fetch tool to get raw data\n2. Show your calculation methodology step-by-step, including units and conversion factors\n3. For sleep data, verify that percentages match what would be shown in the Oura app (based on total_sleep_duration, not time_in_bed)\n4. Identify any potential calculation errors or statistical anomalies\n5. Present both raw values and calculated percentages/averages side by side for transparency",
};

const getSleepDetailsPrompt: Prompt = {
  id: "get-sleep-details",
  name: "Get detailed sleep information",
  description: "Retrieve and explain detailed sleep metrics from your Oura ring",
  text: "Show me detailed analysis of my sleep for [TIME_PERIOD]. To do this, you'll need to:\n1. Use the oura-fetch tool with the sleep_sessions endpoint for detailed sleep metrics\n2. Understand key fields: total_sleep_duration (actual sleep in seconds), time_in_bed (total time in seconds), awake_time (awake time in seconds)\n3. Sleep stage data includes: deep_sleep_duration, rem_sleep_duration, light_sleep_duration (all in seconds)\n4. Calculate sleep efficiency as (total_sleep_duration / time_in_bed * 100)\n5. Calculate sleep stage percentages using total_sleep_duration as the denominator, not time_in_bed\n6. Present all findings with original units AND human-readable formats (convert seconds to hours/minutes)",
};

const dataHandlingGuidelines: Prompt = {
  id: "data-handling-guidelines",
  name: "Data handling guidelines",
  description: "Guidelines for handling Oura data correctly",
  text: "Important guidelines for analyzing Oura data:\n\n1. TIME UNITS: All duration fields in the API response are in seconds. Always convert to hours/minutes for user-friendly display.\n\n2. SLEEP PERCENTAGES: Always calculate sleep stage percentages (deep, REM, light) using total_sleep_duration as the denominator, not time_in_bed. This matches how percentages are displayed in the Oura app.\n\n3. EFFICIENCY: Sleep efficiency is total_sleep_duration divided by time_in_bed, multiplied by 100 to get a percentage.\n\n4. TAGS: Custom tags (with GUID tag_type_code) usually contain meal information in the comment field.\n\n5. CORRELATIONS: When analyzing correlations, always ensure data points are properly time-aligned and use appropriate time offsets when looking for delayed effects.\n\n6. VISUALIZATION: Always show both raw values and percentages in visualizations, and clearly label which denominator was used for percentage calculations.",
};


// Store all prompts in an array
const prompts = [
  getReadinessPrompt,
  getSleepPrompt,
  getActivityPrompt,
  getHeartRatePrompt,
  getHeartRateDuringSleepPrompt,
  getStressPrompt,
  getTagsPrompt,
  analyzeHealthFactorsPrompt,
  analyzeMealEffectsPrompt,
  verifyCalculationsPrompt,
  getSleepDetailsPrompt,
  dataHandlingGuidelines
];

// Oura Tool definitions - simplified
const ouraFetchTool: Tool = {
  name: "oura-fetch",
  description: "Fetch data from Oura Ring API endpoints",
  inputSchema: {
    type: "object",
    properties: {
      endpoint: {
        type: "string",
        enum: [
          "activity",
          "readiness",
          "sleep",
          "stress",
          "heartrate",
          "sleep_sessions",
          "tags",
        ],
        description: "The Oura API endpoint to fetch data from",
      },
      startDate: {
        type: "string",
        description: "Start date in YYYY-MM-DD format",
      },
      endDate: {
        type: "string",
        description: "End date in YYYY-MM-DD format",
      },
      startDateTime: {
        type: "string",
        description:
          "Start datetime in ISO format with timezone (for heartrate endpoint)",
      },
      endDateTime: {
        type: "string",
        description:
          "End datetime in ISO format with timezone (for heartrate endpoint)",
      },
      sleepPeriod: {
        type: "boolean",
        description:
          "Whether to filter heart rate data to sleep periods only (requires additional sleep data fetch)",
      },
      tagName: {
        type: "string",
        description: "Optional filter for specific tag name or keyword in comment",
      },
    },
    required: ["endpoint"],
  },
};

// Oura service class
class OuraService {
  private token: string;
  private baseUrl: string = "https://api.ouraring.com/v2/usercollection";

  constructor(token: string) {
    this.token = token;
  }

  private async fetchData<T>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<OuraApiResponse<T>> {
    const myHeaders = new Headers();
    myHeaders.append("Authorization", `Bearer ${this.token}`);

    // Build URL with query parameters
    const url = new URL(`${this.baseUrl}/${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const requestOptions = {
      method: "GET",
      headers: myHeaders,
    };

    try {
      const response = await fetch(url.toString(), requestOptions);

      if (!response.ok) {
        throw new Error(
          `API request failed with status ${
            response.status
          }: ${await response.text()}`
        );
      }

      return (await response.json()) as OuraApiResponse<T>;
    } catch (error) {
      console.error("Error fetching data from Oura API:", error);
      throw error;
    }
  }

  async getDailyActivity(
    startDate: string,
    endDate: string
  ): Promise<OuraApiResponse<DailyActivity>> {
    return this.fetchData<DailyActivity>("daily_activity", {
      start_date: startDate,
      end_date: endDate,
    });
  }

  async getDailyReadiness(
    startDate: string,
    endDate: string
  ): Promise<OuraApiResponse<DailyReadiness>> {
    return this.fetchData<DailyReadiness>("daily_readiness", {
      start_date: startDate,
      end_date: endDate,
    });
  }

  async getDailySleep(
    startDate: string,
    endDate: string
  ): Promise<OuraApiResponse<DailySleep>> {
    return this.fetchData<DailySleep>("daily_sleep", {
      start_date: startDate,
      end_date: endDate,
    });
  }

  async getDailyStress(
    startDate: string,
    endDate: string
  ): Promise<OuraApiResponse<DailyStress>> {
    return this.fetchData<DailyStress>("daily_stress", {
      start_date: startDate,
      end_date: endDate,
    });
  }

  async getHeartRate(
    startDateTime: string,
    endDateTime: string
  ): Promise<OuraApiResponse<HeartRate>> {
    return this.fetchData<HeartRate>("heartrate", {
      start_datetime: startDateTime,
      end_datetime: endDateTime,
    });
  }

  async getTags(
    startDate: string,
    endDate: string
  ): Promise<OuraApiResponse<EnhancedTag>> {
    return this.fetchData<EnhancedTag>("enhanced_tag", {
      start_date: startDate,
      end_date: endDate,
    });
  }

  async getSleep(
    startDate: string,
    endDate: string
  ): Promise<OuraApiResponse<SleepSession>> {
    return this.fetchData<SleepSession>("sleep", {
      start_date: startDate,
      end_date: endDate,
    });
  }
}

// Create MCP Server
async function main() {
  // Get token from environment variable
  const ouraToken = process.env.OURA_TOKEN;

  if (!ouraToken) {
    console.error("OURA_TOKEN environment variable must be set");
    process.exit(1);
  }

  // Initialize Oura service
  const ouraService = new OuraService(ouraToken);

  // Create and configure the server
  const server = new Server({
    name: "oura-mcp-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        ouraFetchTool,
      },
    },
  });

  // Handle list prompts request
  server.setRequestHandler(ListPromptsRequestSchema, async (request) => {
    return {
      prompts: prompts.map((prompt) => ({
        id: prompt.id,
        name: prompt.name,
        description: prompt.description,
      })),
    };
  });

  // Handle get prompt request
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { params } = request;
    const { id } = params;

    const prompt = prompts.find((p) => p.id === id);
    if (!prompt) {
      throw new Error(`Prompt not found: ${id}`);
    }

    return {
      prompt,
    };
  });

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    return {
      tools: [ouraFetchTool],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { params } = request;
    const { name, arguments: parameters = {} } = params;

    try {
      // Handle Oura fetch operations
      if (name === "oura-fetch") {
        const endpoint = parameters.endpoint as string;
        const startDate = parameters.startDate as string;
        const endDate = parameters.endDate as string;
        const startDateTime = parameters.startDateTime as string;
        const endDateTime = parameters.endDateTime as string;
        const sleepPeriod = parameters.sleepPeriod as boolean;
        const tagName = parameters.tagName as string;

        let result: any;
        switch (endpoint) {
          case "activity":
            result = await ouraService.getDailyActivity(startDate, endDate);
            break;
          case "readiness":
            result = await ouraService.getDailyReadiness(startDate, endDate);
            break;
          case "sleep":
            result = await ouraService.getDailySleep(startDate, endDate);
            break;
          case "stress":
            result = await ouraService.getDailyStress(startDate, endDate);
            break;
          case "heartrate":
            result = await ouraService.getHeartRate(startDateTime, endDateTime);
            // If sleepPeriod is true, also fetch sleep data and include that
            if (sleepPeriod && startDate && endDate) {
              const sleepData = await ouraService.getSleep(startDate, endDate);
              result = {
                heartRate: result,
                sleepData: sleepData,
                note: "Heart rate data and sleep data are both provided so you can analyze heart rate during sleep periods.",
              };
            }
            break;
          case "sleep_sessions":
            result = await ouraService.getSleep(startDate, endDate);
            break;
          case "tags":
            // Fetch tags
            const tagsResult = await ouraService.getTags(startDate, endDate);
            
            // Convert to our extended interface
            result = {
              ...tagsResult
            } as TagApiResponse;
            
            // Filter out custom tags (GUID) with empty comments
            if (result.data) {
                result.data = result.data.filter((tag: EnhancedTag) => {
                // Keep the tag if:
                // 1. It's a standard tag (tag_type_code is not a GUID), or
                // 2. It's a custom tag (tag_type_code is a GUID) but has a non-empty comment
                return !isGuid(tag.tag_type_code) || 
                     (isGuid(tag.tag_type_code) && tag.comment && tag.comment.trim() !== '');
                });
              
              // Add metadata to help Claude understand the tag structure
              result.tagMetadata = {
                standardTags: result.data.filter((tag:EnhancedTag) => !isGuid(tag.tag_type_code)).length,
                customTags: result.data.filter((tag:EnhancedTag) => isGuid(tag.tag_type_code)).length,
                note: "Custom tags (with GUID tag_type_code) represent user-defined entries, often containing meal information. Standard tags have descriptive tag_type_code values like 'tag_generic_supplements'."
              };
            }
            
            // Filter by tag name if provided
            if (tagName && result.data) {
              result.data = result.data.filter(
                (tag:EnhancedTag) =>
                  tag.custom_name
                    ?.toLowerCase()
                    .includes(tagName.toLowerCase()) ||
                  tag.comment?.toLowerCase().includes(tagName.toLowerCase())
              );
            }
            break;
          default:
            throw new Error(`Unsupported endpoint: ${endpoint}`);
        }

        // Return JSON data only
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
          isError: false,
        };
      }

      throw new Error(`Unsupported tool: ${name}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Error executing tool:", errorMessage);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: errorMessage }),
          },
        ],
        isError: true,
      };
    }
  });

  // Start the server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Run the server
main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});