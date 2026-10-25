import { AIAnalysisReport, RealStockData } from '../types';
import { API_BASE_URL, getAuthToken, type ApiError } from './api';

const STOCK_INDICATORS_URL = `${API_BASE_URL}/api/stock-indicators`;
const API_URL = `${API_BASE_URL}/api/analyze`;
const KLINE_API_URL = `${API_BASE_URL}/api/analyze-kline`;

export const generateStockAnalysis = async (
  prompt: string,
  imageBase64: string | null,
  strategyMode: string
): Promise<AIAnalysisReport | null> => {
  const token = getAuthToken();
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ prompt, imageBase64, strategyMode }),
  });

  if (!response.ok) {
    let errorData: any = null;
    try {
      errorData = await response.json();
    } catch {
      errorData = null;
    }
    const err = new Error(errorData?.error || `Backend API Error: ${response.status}`) as ApiError;
    err.status = response.status;
    err.code = errorData?.code;
    throw err;
  }

  const data = await response.json();
  return data as AIAnalysisReport;
};

/**
 * K 线图片分析 - 上传图片文件进行视觉分析
 */
export const analyzeKlineImage = async (
  imageFile: File,
  strategyMode: string = 'K线识图策略',
  prompt: string = ''
): Promise<AIAnalysisReport | null> => {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('strategyMode', strategyMode);
  if (prompt) {
    formData.append('prompt', prompt);
  }

  const response = await fetch(KLINE_API_URL, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData, // FormData 会自动设置 Content-Type
  });

  if (!response.ok) {
    let errorData: any = null;
    try {
      errorData = await response.json();
    } catch {
      errorData = null;
    }
    const err = new Error(errorData?.error || 'K 线分析失败') as ApiError;
    err.status = response.status;
    err.code = errorData?.code;
    throw err;
  }

  const data = await response.json();
  return data as AIAnalysisReport;
};

/**
 * 获取股票技术指标数据（真实数据）
 */
export const getStockIndicators = async (symbol: string): Promise<RealStockData | null> => {
  try {
    const cleanSymbol = symbol.replace(/[^0-9]/g, '').trim();
    if (!cleanSymbol) return null;

    const response = await fetch(`${STOCK_INDICATORS_URL}/${cleanSymbol}`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
};
