import express from 'express';
import crypto from 'crypto';
import fs from 'fs';

import { requireAuth } from '../middlewares/auth.js';

const createAnalyzeRouter = ({
  pool,
  client,
  upload,
  SYSTEM_INSTRUCTION,
  KLINE_ANALYSIS_INSTRUCTION,
  tryGetAuthUser,
  getStockDataWithIndicators,
  getMoneyFlowMonitor,
  buildEnhancedPrompt,
  buildDemoNewsAnalysis,
  persistAnalysisReportToDb,
  inferMarketFromSymbol,
  getTierForUser,
  getActiveSubscriptionForUser,
  reserveQuotaForAttempt,
  finalizeQuotaAttempt
}) => {
  const router = express.Router();

  router.post('/analyze', requireAuth, async (req, res) => {
    let reservation = null;
    try {
      const { prompt, imageBase64, strategyMode } = req.body;

      const requestStartedAt = new Date();
      const reportId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

      const extractStockCode = (input) => {
        if (!input || typeof input !== 'string') return null;
        const code = input.replace(/[^0-9]/g, '').trim();
        if (!code || code.length !== 6) return null;
        // A 股常见：60/68(沪), 00/30(深), 83/87/88/43/47(北交所部分)
        if (/^(60|68|00|30|83|87|88|43|47)\d{4}$/.test(code)) return code;
        return null;
      };

      console.log('📊 收到股票分析请求:');
      console.log(`   📝 查询: ${prompt}`);
      console.log(`   📈 策略: ${strategyMode}`);
      console.log(`   🖼️ 包含图片: ${imageBase64 ? '是' : '否'}`);

      const model = imageBase64 ? 'qwen-vl-plus' : 'qwen-plus';
      console.log(`   🤖 使用模型: ${model}`);

      const userContent = [];
      let stockDataWithIndicators = null;
      let moneyFlowMonitor = null;
      let enhancedPrompt = '';

      // 如果不是图片分析，先校验股票代码，非法输入不调用大模型
      if (!imageBase64) {
        const stockCode = extractStockCode(prompt);
        if (!stockCode) {
          console.log('   ⚠️ 输入不包含合法股票代码，已拒绝调用大模型');
          return res.status(400).json({
            error: '请输入正确的股票代码（6位数字，如 600519 / 000001 / 300750）',
            code: 'INVALID_STOCK_CODE'
          });
        }

        console.log('   🔍 正在查询数据库获取真实股票数据...');
        try {
          stockDataWithIndicators = await getStockDataWithIndicators(prompt);
        } catch (e) {
          stockDataWithIndicators = null;
          console.error('❌ getStockDataWithIndicators failed, fallback to model-only analysis:', e);
        }

        try {
          moneyFlowMonitor = await getMoneyFlowMonitor(prompt);
        } catch (e) {
          moneyFlowMonitor = null;
          console.error('❌ getMoneyFlowMonitor failed, fallback to model-only analysis:', e);
        }

        if (moneyFlowMonitor) {
          console.log('   💸 资金与情绪监控(最新):');
          console.log(`      📅 trade_date: ${moneyFlowMonitor.tradeDate}`);
          console.log(`      💰 3D净流入(亿元): ${moneyFlowMonitor.netInflow3d}`);
          console.log(`      💰 5D净流入(亿元): ${moneyFlowMonitor.netInflow5d}`);
          console.log(`      💰 20D净流入(亿元): ${moneyFlowMonitor.netInflow20d}`);
          console.log(`      🧾 主力买入(亿元): ${moneyFlowMonitor.mainBuyAmount}`);
          console.log(`      🧾 主力卖出(亿元): ${moneyFlowMonitor.mainSellAmount}`);
          console.log(`      🙂 fund_sentiment_index(0-100): ${moneyFlowMonitor.fundSentimentIndex} (${moneyFlowMonitor.fundSentimentLevel})`);
        } else {
          console.log('   💸 未查询到资金与情绪监控数据(a_stock_money_flow)');
        }

        if (stockDataWithIndicators) {
          console.log(`   ✅ 成功获取 ${stockDataWithIndicators.stockInfo.name}(${stockDataWithIndicators.stockInfo.symbol}) 的数据`);
          console.log(`   📅 数据日期: ${stockDataWithIndicators.stockInfo.latestDate}`);
          console.log(`   💰 最新价格: ${stockDataWithIndicators.stockInfo.latestPrice}`);

          try {
            enhancedPrompt = buildEnhancedPrompt(stockDataWithIndicators, moneyFlowMonitor, strategyMode, prompt);
            userContent.push({ type: 'text', text: enhancedPrompt });
          } catch (e) {
            console.error('❌ buildEnhancedPrompt failed, fallback to model-only analysis:', e);
            userContent.push({ type: 'text', text: `使用「${strategyMode}」策略分析以下股票: ${prompt}` });
          }
        } else {
          console.log('   ⚠️ 未找到股票日线数据，使用降级分析模式');

          if (moneyFlowMonitor) {
            userContent.push({
              type: 'text',
              text: `使用「${strategyMode}」策略分析以下股票: ${prompt}\n\n可用数据补充（来自数据库真实数据：a_stock_money_flow）：\n- 数据日期: ${moneyFlowMonitor.tradeDate}\n- 3日净流入(亿元): ${moneyFlowMonitor.netInflow3d ?? 'N/A'}\n- 5日净流入(亿元): ${moneyFlowMonitor.netInflow5d ?? 'N/A'}\n- 20日净流入(亿元): ${moneyFlowMonitor.netInflow20d ?? 'N/A'}\n- 当日主力买入金额(亿元): ${moneyFlowMonitor.mainBuyAmount ?? 'N/A'}\n- 当日主力卖出金额(亿元): ${moneyFlowMonitor.mainSellAmount ?? 'N/A'}\n\n请基于以上真实资金数据与市场常识给出分析，并严格按 JSON 输出。`
            });
          } else {
            userContent.push({ type: 'text', text: `使用「${strategyMode}」策略分析以下股票: ${prompt}` });
          }
        }
      } else {
        const base64Data = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;

        userContent.push({ type: 'image_url', image_url: { url: base64Data } });
        userContent.push({ type: 'text', text: `使用「${strategyMode}」策略分析这张 K 线图。${prompt}` });
      }

      const authUser = await tryGetAuthUser(req);
      if (!authUser?.user_id) {
        return res.status(401).json({ error: '未登录', code: 'UNAUTHORIZED' });
      }

      const tier = await getTierForUser(authUser);
      const subscription = tier === 'pro' ? await getActiveSubscriptionForUser(authUser.user_id) : null;
      const reportType = imageBase64 ? 'kline' : 'text';
      reservation = await reserveQuotaForAttempt({
        userId: authUser.user_id,
        tier,
        subscription,
        reportType
      });
      if (!reservation.ok) {
        return res.status(reservation.status).json(reservation.payload);
      }

      console.log('   ⏳ 正在调用 AI 分析...');
      const startTime = Date.now();

      let response;
      try {
        response = await client.chat.completions.create({
          model: model,
          messages: [
            { role: 'system', content: SYSTEM_INSTRUCTION },
            { role: 'user', content: userContent }
          ],
          temperature: 0.4
        });
      } catch (e) {
        await finalizeQuotaAttempt({
          attemptId: reservation.attemptId,
          quotaPeriodId: reservation.quotaPeriodId,
          success: false,
          reserved: reservation.reserved
        });
        throw e;
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`   ⏱️ AI 响应耗时: ${duration}s`);

      const content = response.choices[0]?.message?.content;

      if (content) {
        let jsonStr = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1];
        }

        let parsedData;
        try {
          parsedData = JSON.parse(jsonStr.trim());
        } catch (e) {
          await finalizeQuotaAttempt({
            attemptId: reservation.attemptId,
            quotaPeriodId: reservation.quotaPeriodId,
            success: false,
            reserved: reservation.reserved
          });
          return res.status(500).json({ error: 'AI 返回格式不正确', code: 'INVALID_AI_RESPONSE' });
        }
        if (!parsedData.strategyMode) {
          parsedData.strategyMode = strategyMode;
        }

        // 如果有真实数据，将技术指标附加到返回结果中
        if (stockDataWithIndicators) {
          parsedData.realData = {
            stockInfo: stockDataWithIndicators.stockInfo,
            indicators: stockDataWithIndicators.indicators
          };
          // 确保使用数据库中的股票名称和代码
          parsedData.stockName = stockDataWithIndicators.stockInfo.name;
          parsedData.stockCode = stockDataWithIndicators.stockInfo.symbol;
        }

        if (moneyFlowMonitor) {
          parsedData.moneyFlowMonitor = moneyFlowMonitor;
        }

        if (!parsedData.newsAnalysis) {
          parsedData.newsAnalysis = buildDemoNewsAnalysis(parsedData.stockName);
        }

        const requestEndedAt = new Date();
        const reportStockCode = parsedData.stockCode || extractStockCode(prompt) || null;
        const market = inferMarketFromSymbol(reportStockCode);
        await persistAnalysisReportToDb({
          reportId,
          startedAt: requestStartedAt.toISOString(),
          endedAt: requestEndedAt.toISOString(),
          stockCode: reportStockCode,
          market,
          user: authUser,
          content: parsedData,
          reportType,
          strategyMode
        });

        await finalizeQuotaAttempt({
          attemptId: reservation.attemptId,
          quotaPeriodId: reservation.quotaPeriodId,
          success: true,
          reserved: reservation.reserved
        });

        parsedData.id = reportId;

        console.log(`   ✅ 分析完成: ${parsedData.stockName} - ${parsedData.recommendation}`);
        return res.json(parsedData);
      }

      console.log('   ❌ AI 未返回内容');
      await finalizeQuotaAttempt({
        attemptId: reservation?.attemptId,
        quotaPeriodId: reservation?.quotaPeriodId,
        success: false,
        reserved: reservation?.reserved
      });
      res.status(500).json({ error: 'No response from AI' });
    } catch (error) {
      console.error('❌ API Error:', error);
      try {
        await finalizeQuotaAttempt({
          attemptId: reservation?.attemptId,
          quotaPeriodId: reservation?.quotaPeriodId,
          success: false,
          reserved: reservation?.reserved
        });
      } catch {}
      const debugEnabled = process.env.DEBUG_API_ERRORS === '1';
      if (debugEnabled) {
        return res.status(500).json({
          error: 'Analysis failed',
          code: 'ANALYSIS_FAILED',
          details: {
            name: error?.name,
            message: error?.message,
            status: error?.status,
            code: error?.code,
            requestId: error?.request_id || error?.requestId || error?.data?.requestId || error?.data?.RequestId,
            type: error?.type,
            param: error?.param
          }
        });
      }
      return res.status(500).json({ error: 'Analysis failed', code: 'ANALYSIS_FAILED' });
    }
  });

  // ==================== 股票数据 API ====================

  // 获取股票技术指标数据
  router.get('/stock-indicators/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      console.log(`📈 查询股票指标: ${symbol}`);

      const data = await getStockDataWithIndicators(symbol);

      if (!data) {
        return res.status(404).json({ error: '未找到该股票数据' });
      }

      res.json({
        stockInfo: data.stockInfo,
        indicators: data.indicators
      });
    } catch (error) {
      console.error('❌ 查询股票指标失败:', error);
      res.status(500).json({ error: '查询失败' });
    }
  });

  // 获取股票原始数据
  router.get('/stock-data/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const cleanSymbol = symbol.replace(/[^0-9]/g, '').trim();

      const [rows] = await pool.execute(
        'SELECT symbol, name, industry, date, open, high, low, close, pre_close, change_amount, change_percent, volume FROM stock_daily WHERE symbol = ? ORDER BY date DESC LIMIT 60',
        [cleanSymbol]
      );

      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: '未找到该股票数据' });
      }

      res.json(rows);
    } catch (error) {
      console.error('❌ 查询股票数据失败:', error);
      res.status(500).json({ error: '查询失败' });
    }
  });

  // K 线图片上传并分析接口
  router.post('/analyze-kline', requireAuth, upload.single('image'), async (req, res) => {
    let reservation = null;
    try {
      if (!req.file) {
        return res.status(400).json({ error: '请上传 K 线图片' });
      }

      const requestStartedAt = new Date();
      const reportId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

      const { strategyMode = 'K线识图策略', prompt = '' } = req.body;
      const extractStockCode = (input) => {
        if (!input || typeof input !== 'string') return null;
        const code = input.replace(/[^0-9]/g, '').trim();
        if (!code || code.length !== 6) return null;
        if (/^(60|68|00|30|83|87|88|43|47)\d{4}$/.test(code)) return code;
        return null;
      };

      // 读取图片并转为 base64
      const imagePath = req.file.path;
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = req.file.mimetype;
      const base64Data = `data:${mimeType};base64,${base64Image}`;

      const authUser = await tryGetAuthUser(req);
      if (!authUser?.user_id) {
        return res.status(401).json({ error: '未登录', code: 'UNAUTHORIZED' });
      }
      const tier = await getTierForUser(authUser);
      const subscription = tier === 'pro' ? await getActiveSubscriptionForUser(authUser.user_id) : null;
      reservation = await reserveQuotaForAttempt({
        userId: authUser.user_id,
        tier,
        subscription,
        reportType: 'kline'
      });
      if (!reservation.ok) {
        return res.status(reservation.status).json(reservation.payload);
      }

      console.log(`📸 收到 K 线图片: ${req.file.filename}`);
      console.log(`📊 开始使用 qwen3-vl-plus 模型分析...`);

      // 使用 qwen3-vl-plus 视觉模型分析
      let response;
      try {
        response = await client.chat.completions.create({
          model: 'qwen-vl-max',
          messages: [
            { role: 'system', content: KLINE_ANALYSIS_INSTRUCTION },
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: base64Data } },
                { type: 'text', text: `请仔细分析这张 K 线图，识别其中的技术形态和信号。${prompt ? '用户补充说明: ' + prompt : ''}` }
              ]
            }
          ],
          temperature: 0.3
        });
      } catch (e) {
        await finalizeQuotaAttempt({
          attemptId: reservation.attemptId,
          quotaPeriodId: reservation.quotaPeriodId,
          success: false,
          reserved: reservation.reserved
        });
        throw e;
      }

      const content = response.choices[0]?.message?.content;
      console.log('🤖 AI 返回内容:', content?.substring(0, 200) + '...');

      if (content) {
        let jsonStr = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1];
        }

        let parsedData;
        try {
          parsedData = JSON.parse(jsonStr.trim());
        } catch (e) {
          await finalizeQuotaAttempt({
            attemptId: reservation.attemptId,
            quotaPeriodId: reservation.quotaPeriodId,
            success: false,
            reserved: reservation.reserved
          });
          return res.status(500).json({ error: 'AI 返回格式不正确', code: 'INVALID_AI_RESPONSE' });
        }
        parsedData.strategyMode = strategyMode;
        parsedData.imageUrl = `/uploads/${req.file.filename}`;

        // 严格校验：K线识图必须识别出合法股票代码，否则不继续（不查库、不返回 N/A）
        const stockCodeFromImage = extractStockCode(parsedData.stockCode);
        if (!stockCodeFromImage) {
          console.log('   ⚠️ K线识图未识别出合法股票代码，已拒绝进入真实数据增强与合并');
          parsedData.warning = {
            code: 'UNRECOGNIZED_STOCK_CODE',
            message: '未能从K线图中识别出合法A股股票代码，因此未合并数据库真实数据（技术指标/资金情绪）。以下为纯识图分析结果。'
          };

          if (!parsedData.newsAnalysis) {
            parsedData.newsAnalysis = buildDemoNewsAnalysis(parsedData.stockName);
          }

          const requestEndedAt = new Date();
          await persistAnalysisReportToDb({
            reportId,
            startedAt: requestStartedAt.toISOString(),
            endedAt: requestEndedAt.toISOString(),
            stockCode: extractStockCode(parsedData.stockCode) || null,
            market: inferMarketFromSymbol(parsedData.stockCode),
            user: authUser,
            content: parsedData,
            reportType: 'kline',
            strategyMode
          });

          await finalizeQuotaAttempt({
            attemptId: reservation.attemptId,
            quotaPeriodId: reservation.quotaPeriodId,
            success: true,
            reserved: reservation.reserved
          });

          parsedData.id = reportId;

          console.log(`✅ K 线分析完成(未合并真实数据): ${parsedData.recommendation}`);
          return res.json(parsedData);
        }

        console.log(`   🔍 已识别股票代码: ${stockCodeFromImage}，开始查询数据库真实数据...`);
        const [stockDataWithIndicators, moneyFlowMonitor] = await Promise.all([
          getStockDataWithIndicators(stockCodeFromImage),
          getMoneyFlowMonitor(stockCodeFromImage)
        ]);

        if (moneyFlowMonitor) {
          console.log('   💸 资金与情绪监控(最新):');
          console.log(`      📅 trade_date: ${moneyFlowMonitor.tradeDate}`);
          console.log(`      💰 3D净流入(亿元): ${moneyFlowMonitor.netInflow3d}`);
          console.log(`      💰 5D净流入(亿元): ${moneyFlowMonitor.netInflow5d}`);
          console.log(`      💰 20D净流入(亿元): ${moneyFlowMonitor.netInflow20d}`);
          console.log(`      🧾 主力买入(亿元): ${moneyFlowMonitor.mainBuyAmount}`);
          console.log(`      🧾 主力卖出(亿元): ${moneyFlowMonitor.mainSellAmount}`);
          console.log(`      🙂 fund_sentiment_index(0-100): ${moneyFlowMonitor.fundSentimentIndex} (${moneyFlowMonitor.fundSentimentLevel})`);
        } else {
          console.log('   💸 未查询到资金与情绪监控数据(a_stock_money_flow)');
        }

        if (stockDataWithIndicators) {
          parsedData.realData = {
            stockInfo: stockDataWithIndicators.stockInfo,
            indicators: stockDataWithIndicators.indicators
          };
          parsedData.stockName = stockDataWithIndicators.stockInfo.name;
          parsedData.stockCode = stockDataWithIndicators.stockInfo.symbol;
        }

        if (moneyFlowMonitor) {
          parsedData.moneyFlowMonitor = moneyFlowMonitor;
        }

        if (!parsedData.newsAnalysis) {
          parsedData.newsAnalysis = buildDemoNewsAnalysis(parsedData.stockName);
        }

        const requestEndedAt = new Date();
        await persistAnalysisReportToDb({
          reportId,
          startedAt: requestStartedAt.toISOString(),
          endedAt: requestEndedAt.toISOString(),
          stockCode: parsedData.stockCode || stockCodeFromImage,
          market: inferMarketFromSymbol(parsedData.stockCode || stockCodeFromImage),
          user: authUser,
          content: parsedData,
          reportType: 'kline',
          strategyMode
        });

        await finalizeQuotaAttempt({
          attemptId: reservation.attemptId,
          quotaPeriodId: reservation.quotaPeriodId,
          success: true,
          reserved: reservation.reserved
        });

        parsedData.id = reportId;

        console.log(`✅ K 线分析完成: ${parsedData.recommendation}`);
        return res.json(parsedData);
      }

      await finalizeQuotaAttempt({
        attemptId: reservation?.attemptId,
        quotaPeriodId: reservation?.quotaPeriodId,
        success: false,
        reserved: reservation?.reserved
      });
      res.status(500).json({ error: 'AI 未返回分析结果' });
    } catch (error) {
      console.error('K 线分析错误:', error);
      try {
        await finalizeQuotaAttempt({
          attemptId: reservation?.attemptId,
          quotaPeriodId: reservation?.quotaPeriodId,
          success: false,
          reserved: reservation?.reserved
        });
      } catch {}
      res.status(500).json({ error: 'K 线分析失败: ' + error.message });
    }
  });

  // 图片上传接口（仅上传不分析）
  router.post('/upload-image', upload.single('image'), (req, res) => {
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

  return router;
};

export default createAnalyzeRouter;
