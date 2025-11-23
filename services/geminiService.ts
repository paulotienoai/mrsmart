
import { GoogleGenAI, Tool, FunctionDeclaration, Type } from "@google/genai";
import { TOOLS_SCHEMA } from "../types";

// Convert our simple schema to GenAI FunctionDeclaration
const getFunctionDeclarations = (): FunctionDeclaration[] => {
  return Object.values(TOOLS_SCHEMA).map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: Type.OBJECT,
      properties: Object.entries(tool.parameters.properties).reduce((acc, [key, val]: [string, any]) => {
        acc[key] = {
            type: val.type === 'STRING' ? Type.STRING : Type.NUMBER,
            description: val.description
        };
        return acc;
      }, {} as any),
      required: tool.parameters.required
    }
  }));
};

export const sendMessageToGemini = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string,
  useThinking: boolean = false,
  useSearch: boolean = false
) => {
  
  // ALWAYS create a new instance to ensure we use the latest API key from the environment
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Configure Model
  const modelName = useThinking ? "gemini-3-pro-preview" : "gemini-2.5-flash";
  
  const config: any = {
    systemInstruction: "You are Mr. Smart, a highly intelligent executive AI assistant. You have access to the user's email and calendar. You can browse the web using Google Search and find locations using Google Maps. When asked about current events, places, or websites, YOU MUST use the googleSearch or googleMaps tools. Be concise, professional, and proactive. If you need to perform an action, use the available tools. Before executing a tool, briefly narrate what you are doing. CRITICAL: Do not guess user intent. If a request is ambiguous or unclear, ASK for clarification. Respond exactly to what is asked.",
  };

  if (useThinking) {
    config.thinkingConfig = { thinkingBudget: 32768 };
  } 

  // Build Tools Array
  const tools: Tool[] = [];

  // Always add function tools
  tools.push({ functionDeclarations: getFunctionDeclarations() });

  // Add Search and Maps if requested or if we want them generally available
  if (useSearch || !useThinking) {
      tools.push({ googleSearch: {} });
      tools.push({ googleMaps: {} });
  }

  config.tools = tools;

  // Create Chat
  const chat = ai.chats.create({
    model: modelName,
    config,
    history: history as any
  });

  const response = await chat.sendMessage({ message });
  return response;
};

export const generateSummary = async (transcript: string): Promise<string> => {
    if (!transcript.trim()) return "No conversation detected.";
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Summarize the following conversation between 'Mr. Smart' (AI Executive Assistant) and the 'User' in 1-2 paragraphs. Highlight key actions taken or information requested. \n\nTranscript:\n${transcript}`
        });
        return response.text || "Summary not available.";
    } catch (e) {
        console.error("Error generating summary:", e);
        return "Failed to generate summary.";
    }
}
