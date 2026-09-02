import express from 'express';
import { 
  getVapidPublicKey, 
  savePushSubscription, 
  deletePushSubscription, 
  sendMorningPushToAllSubscribers 
} from '../src/lib/pushService';

const app = express();
app.use(express.json());

// Enable CORS for Vercel & cross-origin previews
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), platform: 'vercel-serverless' });
});

// 1. Get VAPID public key
app.get('/api/push/vapid-public-key', (req, res) => {
  try {
    const publicKey = getVapidPublicKey();
    res.json({ success: true, publicKey });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || '獲取公鑰失敗' });
  }
});

// 2. Register / Update device push subscription
app.post('/api/push/subscribe', async (req, res) => {
  try {
    const { subscription, username, userLabel, scope, deviceType, isStandalone } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, message: '缺少推播端點或金鑰資訊' });
    }

    const saved = await savePushSubscription({
      subscription,
      username,
      userLabel,
      scope,
      deviceType,
      isStandalone
    });

    res.json({ success: true, message: '推播設備已成功註冊至雲端', subscription: saved });
  } catch (err: any) {
    console.error('[Push API Serverless] Subscribe error:', err);
    res.status(500).json({ success: false, message: err?.message || '註冊推播失敗' });
  }
});

// 3. Remove push subscription
app.post('/api/push/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ success: false, message: '缺少端點' });
    }
    await deletePushSubscription(endpoint);
    res.json({ success: true, message: '推播設備已解除註冊' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || '解除推播失敗' });
  }
});

// 4. Send test push
app.post('/api/push/test', async (req, res) => {
  try {
    const { date } = req.body;
    const result = await sendMorningPushToAllSubscribers(date);
    res.json({
      success: true,
      message: `🚀 雲端推播已發送！共送達 ${result.sentCount} 台已註冊設備 (失敗: ${result.failCount}, 過期清除: ${result.expiredCount})`,
      result
    });
  } catch (err: any) {
    console.error('[Push API Serverless] Test push error:', err);
    res.status(500).json({ success: false, message: err?.message || '發送測試推播失敗' });
  }
});

// 5. Automated cron trigger for 08:00 HKT
app.all('/api/push/trigger-morning', async (req, res) => {
  try {
    const date = (req.body?.date || req.query?.date) as string | undefined;
    const result = await sendMorningPushToAllSubscribers(date);
    res.json({ success: true, result });
  } catch (err: any) {
    console.error('[Push API Serverless] Morning trigger error:', err);
    res.status(500).json({ success: false, message: err?.message || '觸發晨間推播失敗' });
  }
});

export default app;
