import { AIAnalysisReport, RealStockData } from "../types";

const API_BASE_URL = "http://localhost:3001";
const STOCK_INDICATORS_URL = `${API_BASE_URL}/api/stock-indicators`;
const API_URL = `${API_BASE_URL}/api/analyze`;
const KLINE_API_URL = `${API_BASE_URL}/api/analyze-kline`;

export const generateStockAnalysis = async (
  prompt: string,
  imageBase64: string | null,
  strategyMode: string
): Promise<AIAnalysisReport | null> => {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, imageBase64, strategyMode }),
    });

    if (!response.ok) {
      let errorData: any = null;
      try {
        errorData = await response.json();
      } catch {
        errorData = null;
      }
      const err: any = new Error(errorData?.error || `Backend API Error: ${response.status}`);
      err.status = response.status;
      err.code = errorData?.code;
      throw err;
    }

    const data = await response.json();
    return data as AIAnalysisReport;
  } catch (error) {
    console.error("Analysis request failed:", error);
    throw error;
  }
};

/**
 * K 线图片分析 - 上传图片文件进行视觉分析
 * @param imageFile - 图片文件对象
 * @param strategyMode - 策略模式
 * @param prompt - 可选的补充说明
 */
export const analyzeKlineImage = async (
  imageFile: File,
  strategyMode: string = "K线识图策略",
  prompt: string = ""
): Promise<AIAnalysisReport | null> => {
  try {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("strategyMode", strategyMode);
    if (prompt) {
      formData.append("prompt", prompt);
    }

    console.log("📤 上传 K 线图片进行分析...", imageFile.name);

    const response = await fetch(KLINE_API_URL, {
      method: "POST",
      body: formData, // FormData 会自动设置 Content-Type
    });

    if (!response.ok) {
      let errorData: any = null;
      try {
        errorData = await response.json();
      } catch {
        errorData = null;
      }
      console.error("K 线分析 API 错误:", errorData);
      const err: any = new Error(errorData?.error || "K 线分析失败");
      err.status = response.status;
      err.code = errorData?.code;
      throw err;
    }

    const data = await response.json();
    console.log("✅ K 线分析完成:", data.recommendation);
    return data as AIAnalysisReport;
  } catch (error) {
    console.error("K 线分析请求失败:", error);
    throw error;
  }
};

/**
 * 仅上传图片（不分析）
 * @param imageFile - 图片文件对象
 */
export const uploadImage = async (
  imageFile: File
): Promise<{ success: boolean; url: string; filename: string } | null> => {
  try {
    const formData = new FormData();
    formData.append("image", imageFile);

    const response = await fetch(`${API_BASE_URL}/api/upload-image`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      console.error("图片上传失败:", response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("图片上传请求失败:", error);
    return null;
  }
};

/**
 * 获取股票技术指标数据（真实数据）
 * @param symbol - 股票代码
 */
export const getStockIndicators = async (
  symbol: string
): Promise<RealStockData | null> => {
  try {
    // 清理股票代码，只保留数字
    const cleanSymbol = symbol.replace(/[^0-9]/g, '').trim();
    if (!cleanSymbol) return null;

    const response = await fetch(`${STOCK_INDICATORS_URL}/${cleanSymbol}`);

    if (!response.ok) {
      console.error("获取股票指标失败:", response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("获取股票指标请求失败:", error);
    return null;
  }
};
