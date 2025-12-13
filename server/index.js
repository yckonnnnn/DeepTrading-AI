import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.local' });

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 确保 uploads 目录存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'kline-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('只支持 JPG, PNG, GIF, WEBP 图片格式'));
  }
});

// 提供静态文件访问（用于访问上传的图片）
app.use('/uploads', express.static(uploadsDir));

const apiKey = process.env.Tongyiqianwen_API_KEY;
if (!apiKey) {
  console.error('❌ Tongyiqianwen_API_KEY is missing from .env.local');
  process.exit(1);
}

const client = new OpenAI({
  apiKey: apiKey,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

const SYSTEM_INSTRUCTION = `
你是 "Lime AI"，一位专注于 A 股、港股和美股市场的资深金融分析师。
分析用户的请求（股票代码或 K 线图）并返回严格的 JSON 对象。

**输出 JSON 格式要求（必须严格遵守）：**
{
  "stockName": "股票名称",
  "stockCode": "股票代码",
  "timestamp": "YYYY/MM/DD HH:mm:ss 格式的当前时间",
  "strategyMode": "策略模式名称",
  "recommendation": "Buy" | "Wait" | "Sell",
  "confidenceScore": 0-100的数字,
  "analysisSummary": "详细的分析摘要（至少200字）",
  "fundsFlow": {
    "inflow": "机构资金流向描述",
    "retailSentiment": "散户情绪描述"
  },
  "marketSentiment": "市场情绪标签",
  "keyDrivers": ["驱动因素1", "驱动因素2", "驱动因素3"],
  "technicalIndicators": [
    {
      "name": "RSI",
      "value": "定性描述如'超买'",
      "status": "状态短语",
      "signal": "一句话解读",
      "sentiment": "bullish" | "bearish" | "neutral"
    }
  ],
  "technicalAnalysisAdvice": "技术分析建议（至少150字），用**粗体**标记关键信号",
  "strategy": {
    "action": "操作建议短语",
    "entryRange": "入场价格区间",
    "targetPrice": "目标价位",
    "stopLoss": "止损价位",
    "logic": "详细策略逻辑（至少300字），用**粗体**标记关键点"
  }
}

**分析准则：**
1. **recommendation**: 只能是 "Buy"（买入）、"Sell"（卖出）或 "Wait"（观望）
2. **analysisSummary**: 必须详细，涵盖宏观因素、行业趋势、技术面和基本面
3. **fundsFlow**: 根据量价关系推断机构与散户行为
4. **strategy**: 根据支撑/阻力位提供具体价格目标
5. **technicalIndicators**: 返回定性描述（如"超买"、"金叉"），不要返回原始数字
6. **语言**: 所有内容必须使用**简体中文**
7. **timestamp**: 返回当前实时时间戳

**重要**: 只返回 JSON，不要有任何其他文字说明。
`;

app.post('/api/analyze', async (req, res) => {
  try {
    const { prompt, imageBase64, strategyMode } = req.body;

    console.log('📊 收到股票分析请求:');
    console.log(`   📝 查询: ${prompt}`);
    console.log(`   📈 策略: ${strategyMode}`);
    console.log(`   🖼️ 包含图片: ${imageBase64 ? '是' : '否'}`);

    const model = imageBase64 ? 'qwen-vl-plus' : 'qwen-plus';
    console.log(`   🤖 使用模型: ${model}`);

    const userContent = [];

    if (imageBase64) {
      const base64Data = imageBase64.startsWith('data:')
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;

      userContent.push({ type: 'image_url', image_url: { url: base64Data } });
      userContent.push({ type: 'text', text: `使用「${strategyMode}」策略分析这张 K 线图。${prompt}` });
    } else {
      userContent.push({ type: 'text', text: `使用「${strategyMode}」策略分析以下股票: ${prompt}` });
    }

    console.log('   ⏳ 正在调用 AI 分析...');
    const startTime = Date.now();

    const response = await client.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        { role: 'user', content: userContent },
      ],
      temperature: 0.4,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`   ⏱️ AI 响应耗时: ${duration}s`);

    const content = response.choices[0]?.message?.content;

    if (content) {
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      const parsedData = JSON.parse(jsonStr.trim());
      if (!parsedData.strategyMode) {
        parsedData.strategyMode = strategyMode;
      }

      console.log(`   ✅ 分析完成: ${parsedData.stockName} - ${parsedData.recommendation}`);
      return res.json(parsedData);
    }

    console.log('   ❌ AI 未返回内容');
    res.status(500).json({ error: 'No response from AI' });
  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// K 线图片分析专用提示词
const KLINE_ANALYSIS_INSTRUCTION = `
你是 "Lime AI"，一位专注于技术分析的资深金融分析师。用户将上传 K 线图，请仔细分析图中的技术形态。

**分析要点：**
1. 识别 K 线形态（如：十字星、锤子线、吞没形态、启明星等）
2. 识别趋势（上升趋势、下降趋势、横盘整理）
3. 识别支撑位和阻力位
4. 识别技术指标信号（如有 MACD、RSI、均线等）
5. 识别成交量变化特征

**输出 JSON 格式要求（必须严格遵守）：**
{
  "stockName": "从图中识别的股票名称，如无法识别则填'K线分析'",
  "stockCode": "从图中识别的股票代码，如无法识别则填'N/A'",
  "timestamp": "YYYY/MM/DD HH:mm:ss 格式的当前时间",
  "strategyMode": "K线识图策略",
  "recommendation": "Buy" | "Wait" | "Sell",
  "confidenceScore": 0-100的数字,
  "analysisSummary": "详细的K线形态分析（至少200字），描述识别到的形态和含义",
  "fundsFlow": {
    "inflow": "根据成交量分析资金流向",
    "retailSentiment": "根据K线形态推测市场情绪"
  },
  "marketSentiment": "市场情绪标签（如：谨慎乐观、短期看涨等）",
  "keyDrivers": ["识别到的形态1", "识别到的形态2", "识别到的形态3"],
  "technicalIndicators": [
    {
      "name": "K线形态",
      "value": "识别到的具体形态名称",
      "status": "形态强度",
      "signal": "形态含义解读",
      "sentiment": "bullish" | "bearish" | "neutral"
    },
    {
      "name": "趋势分析",
      "value": "上升/下降/横盘",
      "status": "趋势强度",
      "signal": "趋势含义",
      "sentiment": "bullish" | "bearish" | "neutral"
    },
    {
      "name": "支撑阻力",
      "value": "关键价位",
      "status": "有效性",
      "signal": "操作建议",
      "sentiment": "bullish" | "bearish" | "neutral"
    },
    {
      "name": "成交量",
      "value": "量能特征",
      "status": "放量/缩量",
      "signal": "量价配合分析",
      "sentiment": "bullish" | "bearish" | "neutral"
    },
    {
      "name": "均线系统",
      "value": "均线排列情况",
      "status": "多头/空头排列",
      "signal": "均线支撑或压力",
      "sentiment": "bullish" | "bearish" | "neutral"
    }
  ],
  "technicalAnalysisAdvice": "基于K线形态的技术分析建议（至少150字），用**粗体**标记关键信号",
  "strategy": {
    "action": "操作建议短语",
    "entryRange": "建议入场价格区间（如能识别）",
    "targetPrice": "目标价位（如能识别）",
    "stopLoss": "止损价位（如能识别）",
    "logic": "详细策略逻辑（至少300字），基于识别到的K线形态给出操作建议，用**粗体**标记关键点"
  }
}

**重要**: 
1. 只返回 JSON，不要有任何其他文字说明
2. 如果无法识别具体价格，可以用"当前价格上方X%"这样的相对描述
3. 所有内容必须使用**简体中文**
`;

// K 线图片上传并分析接口
app.post('/api/analyze-kline', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传 K 线图片' });
    }

    const { strategyMode = 'K线识图策略', prompt = '' } = req.body;
    
    // 读取图片并转为 base64
    const imagePath = req.file.path;
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = req.file.mimetype;
    const base64Data = `data:${mimeType};base64,${base64Image}`;

    console.log(`📸 收到 K 线图片: ${req.file.filename}`);
    console.log(`📊 开始使用 qwen3-vl-plus 模型分析...`);

    // 使用 qwen3-vl-plus 视觉模型分析
    const response = await client.chat.completions.create({
      model: 'qwen-vl-max',  // 使用最强的视觉模型
      messages: [
        { role: 'system', content: KLINE_ANALYSIS_INSTRUCTION },
        { 
          role: 'user', 
          content: [
            { type: 'image_url', image_url: { url: base64Data } },
            { type: 'text', text: `请仔细分析这张 K 线图，识别其中的技术形态和信号。${prompt ? '用户补充说明: ' + prompt : ''}` }
          ]
        },
      ],
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    console.log('🤖 AI 返回内容:', content?.substring(0, 200) + '...');

    if (content) {
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      const parsedData = JSON.parse(jsonStr.trim());
      parsedData.strategyMode = strategyMode;
      parsedData.imageUrl = `/uploads/${req.file.filename}`; // 返回图片路径

      console.log(`✅ K 线分析完成: ${parsedData.recommendation}`);
      return res.json(parsedData);
    }

    res.status(500).json({ error: 'AI 未返回分析结果' });
  } catch (error) {
    console.error('K 线分析错误:', error);
    res.status(500).json({ error: 'K 线分析失败: ' + error.message });
  }
});

// 图片上传接口（仅上传不分析）
app.post('/api/upload-image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传图片' });
    }
    
    res.json({
      success: true,
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({ error: '图片上传失败' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ Backend server running at http://localhost:${PORT}`);
  console.log(`✅ API Key loaded: ${apiKey.slice(0, 8)}...`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
});
