
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AIAnalysisReport } from "../types";

// Initialize AI Client with validation
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY is missing from environment variables.");
}
const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-to-prevent-crash' });

const ANALYSIS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    stockName: { type: Type.STRING, description: "Stock Name" },
    stockCode: { type: Type.STRING, description: "Stock Code" },
    timestamp: { type: Type.STRING, description: "Current analysis timestamp format YYYY/MM/DD HH:mm:ss" },
    strategyMode: { type: Type.STRING, description: "The strategy mode used for this analysis (e.g., '趋势跟踪策略' or '短线博弈策略')" },
    recommendation: { 
      type: Type.STRING, 
      enum: ["Buy", "Wait", "Sell"],
      description: "Strict Investment recommendation: 'Buy' (Positive), 'Sell' (Negative), or 'Wait' (Neutral/Hold)" 
    },
    confidenceScore: { type: Type.NUMBER, description: "Confidence score 0-100" },
    analysisSummary: { type: Type.STRING, description: "A detailed executive summary of the analysis (Core Conclusion). Must be at least 200 Chinese characters. This section must be very detailed, covering macro, technical, and fundamental aspects." },
    fundsFlow: {
      type: Type.OBJECT,
      properties: {
        inflow: { type: Type.STRING, description: "Description of institutional fund flow (e.g., 'Significant Net Inflow')" },
        retailSentiment: { type: Type.STRING, description: "Description of retail investor sentiment (e.g., 'Panic Selling', 'FOMO')" }
      }
    },
    marketSentiment: { type: Type.STRING, description: "Overall market context tag (e.g., 'Sector Rotation', 'Risk-off')" },
    keyDrivers: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of 3-4 short keywords/tags explaining the driver (e.g. 'Valuation Repair', 'Tech Breakout')" 
    },
    technicalIndicators: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Indicator Name. MUST be exactly one of: 'RSI', 'MACD', '布林带', '成交量', '趋势强度'" },
          value: { type: Type.STRING, description: "Qualitative state (e.g. 'Overbought', 'Golden Cross', 'Near Upper Band', 'Expanding'). DO NOT use raw numbers." },
          status: { type: Type.STRING, description: "Short status phrase" },
          signal: { type: Type.STRING, description: "One sentence interpretation" },
          sentiment: { type: Type.STRING, enum: ["bullish", "bearish", "neutral"] }
        }
      },
      description: "Must contain exactly 5 indicators: RSI, MACD, 布林带, 成交量, 趋势强度"
    },
    technicalAnalysisAdvice: { type: Type.STRING, description: "Specific strategic advice based solely on technical analysis. Must be at least 150 words. Use **bold** markdown for key signals." },
    strategy: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, description: "Action phrase" },
        entryRange: { type: Type.STRING, description: "Price range for entry" },
        targetPrice: { type: Type.STRING, description: "Target price (Take Profit)" },
        stopLoss: { type: Type.STRING, description: "Stop loss price" },
        logic: { type: Type.STRING, description: "Detailed strategy logic (minimum 300 words). Must comprehensively analyze the Buy rationale, Sell risks, and Wait conditions. Use **bold** markdown for key points." }
      }
    }
  },
  required: ["stockName", "stockCode", "timestamp", "strategyMode", "recommendation", "analysisSummary", "fundsFlow", "marketSentiment", "technicalIndicators", "technicalAnalysisAdvice", "strategy", "keyDrivers"]
};

const SYSTEM_INSTRUCTION = `
You are "Lime AI", a senior financial analyst specialized in A-share, HK, and US markets.
Analyze the user's request (Stock Code or Chart Image) and return a STRICT JSON object matching the provided schema.

Analysis Guidelines:
1. **Recommendation**: Strictly use "Buy" (Buy/Strong Buy), "Sell" (Sell/Strong Sell), or "Wait" (Hold).
2. **Analysis Summary**: Provide a comprehensive analysis summary (minimum 200 Chinese characters). This is the most critical part of the report. You must explain the core logic behind the recommendation, including macro factors, sector trends, and specific stock technical/fundamental drivers.
3. **Fund Flow**: Infer institutional vs retail behavior based on volume/price action.
4. **Strategy**: Provide specific price targets based on support/resistance levels.
5. **Logic**: The strategy logic must be detailed (at least 300 words), covering different scenarios (Buy/Sell/Hold). Use **markdown bold** to highlight key phrases.
6. **Technical Indicators**: Return QUALITATIVE values (e.g., "Overbought", "Divergence") instead of raw numbers.
7. **Technical Advice**: Must be detailed (at least 150 words). Use **markdown bold** for emphasis.
8. **Language**: The content within the JSON values MUST be in **Chinese (Simplified)**.
9. **Timestamp**: Always return the current real-time timestamp in "YYYY/MM/DD HH:mm:ss" format.
10. **Strategy Mode**: explicitly state which strategy mode is being applied in the 'strategyMode' field.

Input handling:
- If an image is provided, analyze the K-line patterns deeply.
- If text is provided, use your knowledge base for recent trends.
`;

export const generateStockAnalysis = async (
  prompt: string,
  imageBase64: string | null,
  strategyMode: string
): Promise<AIAnalysisReport | null> => {
  if (!apiKey) {
    console.error("Cannot generate analysis: API Key is missing.");
    return null;
  }

  try {
    const model = 'gemini-2.5-flash';
    const parts: any[] = [];
    
    if (imageBase64) {
      const base64Data = imageBase64.split(',')[1] || imageBase64;
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data
        }
      });
      parts.push({ text: `Analyze this K-line chart using the ${strategyMode} strategy. ${prompt}` });
    } else {
      parts.push({ text: `Analyze this stock target using the ${strategyMode} strategy: ${prompt}` });
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.4, 
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_SCHEMA
      }
    });

    if (response.text) {
      const parsedData = JSON.parse(response.text) as AIAnalysisReport;
      // Ensure strategyMode is populated from our request if the model forgets (failsafe)
      if (!parsedData.strategyMode) {
        parsedData.strategyMode = strategyMode;
      }
      return parsedData;
    }
    return null;
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Explicitly return null on error so UI can handle it
    return null;
  }
};
