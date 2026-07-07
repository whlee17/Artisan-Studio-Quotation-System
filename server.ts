import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DB_PATH = process.env.VERCEL ? '/tmp/db.json' : path.join(process.cwd(), 'db.json');

// --- DEFAULT STATE IF DB NOT FOUND ---
const DEFAULT_CATEGORIES = [
  "打拆工程",
  "水務",
  "電力",
  "泥水",
  "木鋁門窗",
  "油漆",
  "雜項",
  "廚房傢俬",
  "浴室傢俬",
  "客廳傢俬",
  "房間傢俬"
];

const DEFAULT_STANDARD_ITEMS = {
  "打拆工程": [
    {
      name: "全屋舊物清拆",
      unit: "項",
      priceRange: "21000-35000",
      defaultRemark: "清拆全屋大廳及房間原有物件/傢俬\n清拆原有地台磚連腳線\n主/客浴室牆及浴室地全拆(包括:牆身/地台瓦,浴缸)\n廚房牆地全拆(包括:牆身/地台瓦）\n拆除全屋門連舊冷氣機\n裝修期間及裝修結束清走建築廢料及泥頭徵費"
    },
    {
      name: "廚房拆除",
      unit: "項",
      priceRange: "26800-28880",
      defaultRemark: "廚房牆地全拆(包括:牆身/地台瓦）\n裝修期間及裝修結束清走建築廢料及泥頭徵費"
    },
    {
      name: "局部拆牆",
      unit: "項",
      priceRange: "2500-5000",
      defaultRemark: "局部拆除指定牆壁，連工包料，不包泥頭費"
    }
  ],
  "水務": [
    {
      name: "廚房水喉",
      unit: "項",
      priceRange: "11000-14800",
      defaultRemark: "廚房 新造星盆冷熱水喉位,熱水爐冷熱水，露台洗衣機去水喉位,(包英國銅喉,明喉,連試磅谷磅)"
    },
    {
      name: "浴室水喉",
      unit: "項",
      priceRange: "12000-14800",
      defaultRemark: "新造洗手盤/花灑冷熱水喉位,地台及(企缸/浴屏)去水喉位,(包英國銅喉,入牆暗喉,連試磅谷磅)"
    },
    {
      name: "改糞喉",
      unit: "項",
      priceRange: "2000",
      defaultRemark: "更改馬桶糞喉出水位置"
    }
  ],
  "電力": [
    { name: "TV", unit: "個", priceRange: "800", defaultRemark: "新造電視訊號插座" },
    { name: "上網喉位", unit: "個", priceRange: "800", defaultRemark: "新造網絡數據插座" },
    { name: "AV槽出線位", unit: "個", priceRange: "1600", defaultRemark: "電視機底新拉影音穿線槽" },
    { name: "電箱改位", unit: "個", priceRange: "1500", defaultRemark: "原有配電箱移位或高度調整" },
    { name: "13A單蘇", unit: "個", priceRange: "750", defaultRemark: "新造 13A 單位插座" },
    { name: "13A雙蘇", unit: "個", priceRange: "1120", defaultRemark: "新造 13A 雙位插座(孖蘇)" },
    { name: "燈位", unit: "個", priceRange: "750", defaultRemark: "新造天花燈位連雙路開關" },
    { name: "20A燈曲", unit: "個", priceRange: "1500", defaultRemark: "新造冷氣或熱水爐 20A 專用開關" },
    {
      name: "電箱",
      unit: "項",
      priceRange: "5000",
      defaultRemark: "新造大電箱(連工包料)"
    }
  ],
  "泥水": [
    {
      name: "地台鋪磚",
      unit: "平方呎",
      priceRange: "85",
      defaultRemark: "盪地台+鋪磚 (包沙,泥,連人工) (不包磁磚)實際面積以平方呎計算（600x600mm / 1200x200mm或以下）"
    },
    { name: "牆地鋪磚", unit: "平方呎", priceRange: "88", defaultRemark: "廚房/浴室牆身地台盪平及鋪貼防滑磚（不包磁磚）" },
    { name: "浴室防水", unit: "項", priceRange: "3000", defaultRemark: "浴室牆地新造三層防水底漆工程" },
    { name: "廚房防水", unit: "項", priceRange: "2500", defaultRemark: "廚房洗水槽周圍新造防潮防水工程" },
    { name: "企缸", unit: "項", priceRange: "300", defaultRemark: "新造泥水石屎企缸基座及浴屏擋水石屎膊" }
  ],
  "木鋁門窗": [
    { name: "實心木門", unit: "扇", priceRange: "4300", defaultRemark: "安裝單扇大門實心木門（包括門框及門手柄）" },
    { name: "趟門", unit: "扇", priceRange: "500", defaultRemark: "吊軌木質或鋼框玻璃大拉門安裝工時" },
    { name: "鋁天花", unit: "項", priceRange: "4000", defaultRemark: "廚房/浴室安裝防潮針孔鋁片天花連 LED 筒燈" },
    { name: "浴室浴屏", unit: "項", priceRange: "500", defaultRemark: "安裝浴室鋼化玻璃拉門浴屏" }
  ],
  "油漆": [
    { name: "全屋油漆", unit: "項", priceRange: "22800", defaultRemark: "全屋牆身及天花鏟底、批灰三次，並塗刷五合一立邦漆三遍" }
  ],
  "雜項": [
    { name: "現場保護", unit: "項", priceRange: "1500", defaultRemark: "裝修前用珍珠棉/夾板保護公用電梯大堂、屋內現有地板" },
    { name: "安裝龍頭", unit: "個", priceRange: "500", defaultRemark: "安裝冷熱面盆、廚房星盆或淋浴花灑水龍頭" },
    { name: "完工清潔", unit: "項", priceRange: "300", defaultRemark: "全部工序完成後的專業深度除甲醛、粉塵清潔" }
  ],
  "廚房傢俬": [
    { name: "地櫃", unit: "直呎", priceRange: "980", defaultRemark: "新造廚房訂製高級防潮板地櫃（連優質木門/緩衝門鉸）" },
    { name: "吊櫃", unit: "直呎", priceRange: "980", defaultRemark: "新造廚房訂製防潮板吊櫃\n無拉手極簡外型" },
    { name: "石英石台面", unit: "直呎", priceRange: "980", defaultRemark: "訂製 20mm 厚高耐磨石英石櫥櫃枱面" },
    { name: "開石孔", unit: "個", priceRange: "500", defaultRemark: "石材面開洗手盆/煤氣爐安裝孔" }
  ],
  "浴室傢俬": [
    { name: "地櫃/吊櫃/台面", unit: "直呎", priceRange: "980", defaultRemark: "浴室防水材質洗手台地櫃連鏡櫃" },
    { name: "開石孔", unit: "個", priceRange: "500", defaultRemark: "浴室石材檯面盆孔開孔加工費" }
  ],
  "客廳傢俬": [
    { name: "鞋櫃/餐邊櫃", unit: "直呎", priceRange: "1800", defaultRemark: "訂製多功能客廳鞋櫃、頂天立地玄關儲物櫃（板材E1級）" },
    { name: "電視櫃", unit: "直呎", priceRange: "900", defaultRemark: "客廳訂製懸空造型木工電視矮櫃" },
    { name: "加高費", unit: "直呎", priceRange: "300", defaultRemark: "傢俬高度超過預設 8 呎之超高板材施工追加算" }
  ],
  "房間傢俬": [
    { name: "油壓床", unit: "張", priceRange: "5400起", defaultRemark: "主人房精製氣壓高箱儲物油壓床 (4呎半 / 5呎)" },
    { name: "衣櫃", unit: "直呎", priceRange: "1300", defaultRemark: "房中訂製通頂推拉滑軌大衣櫃，內部含不銹鋼掛衣杆與九宮格抽屜" },
    { name: "床頭櫃", unit: "直呎", priceRange: "700", defaultRemark: "訂製床頭兩側懸空插座配線格矮斗櫃" },
    { name: "櫃桶", unit: "個", priceRange: "160", defaultRemark: "抽屜加設阻尼三節路軌五金件費用" }
  ]
};

const DEFAULT_SETTINGS = {
  bankName: "中國銀行（香港）",
  companyName: "Artisan Studio Limited",
  bankAccount: "012-586-2-109941-2",
  fpsId: "121966964",
  showMainFooter: false,
  isDarkMode: false,
  defaultTerms: `1. 此合約不包括單位的水火險及第三者保險。
2. 報價有效期為兩(2)星期，客戶於簽署或蓋印後則成一份正式合約，所有已收取的款項不會退還。
3. 所有工程範圍及要求均以此報價單為準，所有口頭協議恕不接受。
4. 此項合約工程期為(稍後了解後確定)工作天(星期六、日，公眾假期及紅雨、黑雨、颱風日不計算在內)內基本完成。基本完成泛指完成所有能讓客戶入住的必要工程項目。若客戶於接收單位前發現有任何非客戶或第三方所引致的損毀，本公司可於損毀保養期內進行維修。
5. 如因客方原因而引致停工，在及後重新開工時需額外五(5)個工作天作安排人手重新進場。
6.1 由第三方/客戶所引致的延誤，其中包括但不限於延遲交場至本公司、第三方工程延誤、客戶或第三方所提供的物料延誤、客戶未能如期確認工程資料等，本公司恕不負責。
6.2 惡劣天氣及其對工程進度所引致的影響，本公司恕不負責。
6.3 客戶額外之要求，其中包括工程變更項目，本公司恕不負責。
6.4 客戶未能容許本公司進入工地，本公司恕不負責。
6.5 客戶或第三方在工地上對施工人員造成影響，本公司恕不負責。
6.6 不可抗力所引致的延誤，其中包括戰爭、入侵、火災、地震等，本公司恕不負責。
7. 如客戶需要後加工程，收費則須由本公司及客戶另行商議而定，而完工期亦會相應延長。
8. 此工程合約會以按量計算為準則，然而各單一工程項目亦有最低銷費，在計算工程變更時客人需另行跟本公司作協商。
9. 後加工程之定義包含，而不限於任何(1)附加工序(2)變更施工次序及工時(3)變更工程中使用之物料(4)變更已完成之工程成品(5)額外安裝服務等。
10. 後加工程有可能引致價錢及(或)工期上之影響，需由雙方同意及文字確認作實。
11. 本合約須由香港特別行政區的法律解釋、詮釋及規限。有關本合約所引致的訴訟必須在香港特別行政區之法院或香港仲裁公會內進行。
12. 凡因本合約所引起的或與之相關的任何爭議、糾紛、分歧或索賠，包括合同的存在、效力、解釋、履行、違反或終止，或因本合同引起的或與之相關的任何非合同性爭議，均應以下列程序處理：(爭議之金額少於HK 75,000)提交香港仲裁公會並按照其現行有效的香港仲裁公會規則最終解決。
13. 保修期由客戶接收單位起計十二(12)個月，客戶須注意部份缺陷維修工作會於保修期內進行。結構、防水及水電管道項目保養期為三十六(36)個月。
14. 客人需在工程基本完成後，與本公司代表一同在單位驗收及確定缺陷維修項目清單。
15. 本公司會於裝修期間及完工後拍攝照片及影片作記錄及宣傳之用。如客人不欲接受此條款，請於簽約前通知本公司。
16. 工程費用需依從合約中之付款時間繳付，其中後加項目的付費時間亦依從合約中的付款時間表。工程所有費用在任何情況下均不設退款。若貴客未能依時繳交工程費用，本公司有權立刻停工並追討因停工而引致的損失。因延遲繳付工程費用而引致的任何工程延誤，由貴客自負。
17. 除非另有說明，客人須負責向管理處或其他機構、部門申辦裝修申請或其他工程相關之准許及承擔其相關費用。
18. 除非另有說明，工程造法及設計均以本公司既有準則作標準。
19. 如有任何因本公司在安裝或運送過程中令客方物品(如小五金、燈飾等)引致損壞，本公司就該客方物品之最高賠償金額為港幣$500元。本公司並不負責一切保養及維修所有代工安裝 or 代客購買之物料。
20. 本公司並不負責代付或檢驗客人自購之物料，客人需自行到單位檢驗其自購物料。所有自購之物料需直送至單位，本公司並不負責代工搬運任何物資。
21. 除非另有說明，工程報價並未包含一切政府部門之申請費用。如需本公司代辦，可作另行商議。`
};

// Database structure
interface DBStructure {
  accounts: any[];
  quotes: any[];
  categories: string[];
  library: any;
  settings: any;
}

// Ensure database file is initialized
let inMemoryDB: DBStructure | null = null;

function loadDB(): DBStructure {
  if (inMemoryDB) return inMemoryDB;

  try {
    if (!fs.existsSync(DB_PATH)) {
      const initialDB: DBStructure = {
        accounts: [
          {
            username: 'whlee',
            password: '1122',
            role: 'admin',
            displayName: '管理員 whlee',
            createdAt: new Date().toISOString()
          }
        ],
        quotes: [],
        categories: DEFAULT_CATEGORIES,
        library: DEFAULT_STANDARD_ITEMS,
        settings: DEFAULT_SETTINGS
      };
      try {
        fs.writeFileSync(DB_PATH, JSON.stringify(initialDB, null, 2), 'utf-8');
      } catch (writeErr) {
        console.warn("Failed to write initial db.json, falling back to in-memory mode", writeErr);
        inMemoryDB = initialDB;
      }
      return initialDB;
    }

    const content = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(content);
    // Ensure vital keys exist
    if (!parsed.accounts) parsed.accounts = [];
    if (!parsed.quotes) parsed.quotes = [];
    if (!parsed.categories) parsed.categories = DEFAULT_CATEGORIES;
    if (!parsed.library) parsed.library = DEFAULT_STANDARD_ITEMS;
    if (!parsed.settings) parsed.settings = DEFAULT_SETTINGS;

    // Check if whlee exists, if not re-inject
    const whleeExists = parsed.accounts.some((a: any) => a.username === 'whlee');
    if (!whleeExists) {
      parsed.accounts.unshift({
        username: 'whlee',
        password: '1122',
        role: 'admin',
        displayName: '管理員 whlee',
        createdAt: new Date().toISOString()
      });
      try {
        fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
      } catch (writeErr) {
        inMemoryDB = parsed;
      }
    }

    return parsed;
  } catch (error) {
    console.error("Failed to parse db.json, returning default and using in-memory mode", error);
    const fallback: DBStructure = {
      accounts: [
        {
          username: 'whlee',
          password: '1122',
          role: 'admin',
          displayName: '管理員 whlee',
          createdAt: new Date().toISOString()
        }
      ],
      quotes: [],
      categories: DEFAULT_CATEGORIES,
      library: DEFAULT_STANDARD_ITEMS,
      settings: DEFAULT_SETTINGS
    };
    inMemoryDB = fallback;
    return fallback;
  }
}

function saveDB(db: DBStructure) {
  if (inMemoryDB) {
    inMemoryDB = db;
    return;
  }
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.warn("Failed to write db.json, switching to in-memory mode", error);
    inMemoryDB = db;
  }
}

const app = express();
app.use(express.json({ limit: '10mb' }));

// Initialize DB
loadDB();

  // Helper middleware to verify User Session Token
  const authenticateUser = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '未登入或無權存取，請先登入。' });
    }
    
    const username = authHeader.split(' ')[1]; // Simple token implementation: token is the username
    const db = loadDB();
    const user = db.accounts.find(a => a.username === username);
    
    if (!user) {
      return res.status(401).json({ success: false, message: '使用者帳戶不存在，請重新登入。' });
    }

    // Attach user metadata to request
    (req as any).user = user;
    next();
  };

  // Helper middleware to check Admin role
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '無管理員權限' });
    }
    next();
  };

  // --- API ENDPOINTS ---

  // 1. Auth Endpoint: Login
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '請輸入帳號與密碼' });
    }

    const db = loadDB();
    const user = db.accounts.find(a => a.username.trim().toLowerCase() === username.trim().toLowerCase());

    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: '帳號或密碼不正確' });
    }

    res.json({
      success: true,
      token: user.username, // Simply use username as token for robust iframe environment storage
      user: {
        username: user.username,
        role: user.role,
        displayName: user.displayName || user.username
      }
    });
  });

  // 2. Account Management (Admin only)
  app.get('/api/accounts', authenticateUser, requireAdmin, (req, res) => {
    const db = loadDB();
    // Return accounts with password redacted or just return them since it is a secure closed system
    const safeAccounts = db.accounts.map(a => ({
      username: a.username,
      role: a.role,
      displayName: a.displayName,
      createdAt: a.createdAt,
      password: a.password // Keep password visible so admin can manage or edit easily
    }));
    res.json({ success: true, accounts: safeAccounts });
  });

  app.post('/api/accounts', authenticateUser, requireAdmin, (req, res) => {
    const { username, password, role, displayName } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ success: false, message: '缺少必要欄位' });
    }

    const normalizedUsername = username.trim().toLowerCase();
    if (normalizedUsername === '') {
      return res.status(400).json({ success: false, message: '帳號不能為空白' });
    }

    const db = loadDB();
    const exists = db.accounts.some(a => a.username.toLowerCase() === normalizedUsername);
    if (exists) {
      return res.status(400).json({ success: false, message: '此帳號已存在' });
    }

    const newAccount = {
      username: username.trim(),
      password: password,
      role: role,
      displayName: displayName || username.trim(),
      createdAt: new Date().toISOString()
    };

    db.accounts.push(newAccount);
    saveDB(db);

    res.json({ success: true, account: newAccount, message: '帳號建立成功' });
  });

  app.post('/api/accounts/sync', authenticateUser, requireAdmin, (req, res) => {
    const { accounts } = req.body;
    if (!accounts || !Array.isArray(accounts)) {
      return res.status(400).json({ success: false, message: '不正確的帳戶資料格式' });
    }
    
    const db = loadDB();
    let updatedCount = 0;
    let createdCount = 0;
    
    accounts.forEach((localAcc: any) => {
      if (!localAcc.username) return;
      const index = db.accounts.findIndex(a => a.username.toLowerCase() === localAcc.username.toLowerCase());
      if (index >= 0) {
        if (localAcc.password) db.accounts[index].password = localAcc.password;
        if (localAcc.role) db.accounts[index].role = localAcc.role;
        if (localAcc.displayName) db.accounts[index].displayName = localAcc.displayName;
        updatedCount++;
      } else {
        db.accounts.push({
          username: localAcc.username.trim(),
          password: localAcc.password || '1122',
          role: localAcc.role || 'user',
          displayName: localAcc.displayName || localAcc.username.trim(),
          createdAt: localAcc.createdAt || new Date().toISOString()
        });
        createdCount++;
      }
    });
    
    if (updatedCount > 0 || createdCount > 0) {
      saveDB(db);
    }
    
    const safeAccounts = db.accounts.map(a => ({
      username: a.username,
      role: a.role,
      displayName: a.displayName,
      createdAt: a.createdAt,
      password: a.password
    }));
    
    res.json({ success: true, message: `同步帳戶完成：新增 ${createdCount} 個，更新 ${updatedCount} 個`, accounts: safeAccounts });
  });

  app.put('/api/accounts/:username', authenticateUser, requireAdmin, (req, res) => {
    const targetUsername = req.params.username;
    const { password, role, displayName } = req.body;

    const db = loadDB();
    const accountIndex = db.accounts.findIndex(a => a.username.toLowerCase() === targetUsername.toLowerCase());

    if (accountIndex === -1) {
      return res.status(404).json({ success: false, message: '找不到此帳號' });
    }

    // Protection: Prevent admin demoting their own account whlee
    if (targetUsername.toLowerCase() === 'whlee' && role !== 'admin') {
      return res.status(400).json({ success: false, message: '無法變更預設管理員的權限角色' });
    }

    if (password !== undefined) db.accounts[accountIndex].password = password;
    if (role !== undefined) db.accounts[accountIndex].role = role;
    if (displayName !== undefined) db.accounts[accountIndex].displayName = displayName;

    saveDB(db);
    res.json({ success: true, message: '帳號更新成功' });
  });

  app.delete('/api/accounts/:username', authenticateUser, requireAdmin, (req, res) => {
    const targetUsername = req.params.username;
    if (targetUsername.toLowerCase() === 'whlee') {
      return res.status(400).json({ success: false, message: '無法刪除預設管理員帳號' });
    }

    const db = loadDB();
    const filteredAccounts = db.accounts.filter(a => a.username.toLowerCase() !== targetUsername.toLowerCase());
    
    if (filteredAccounts.length === db.accounts.length) {
      return res.status(404).json({ success: false, message: '找不到此帳號' });
    }

    db.accounts = filteredAccounts;
    saveDB(db);
    res.json({ success: true, message: '帳號刪除成功' });
  });

  // 3. Centralized Shared Data Syncing & Retrieval (quotes, categories, library, settings)
  app.get('/api/data', authenticateUser, (req, res) => {
    const user = (req as any).user;
    const db = loadDB();

    // Filter quotes based on user role
    let responseQuotes = [];
    if (user.role === 'admin') {
      responseQuotes = db.quotes;
    } else {
      // Normal user: Only see quotes assigned to them
      responseQuotes = db.quotes.filter(q => q.assignedTo === user.username);
    }

    res.json({
      success: true,
      quotes: responseQuotes,
      categories: db.categories,
      library: db.library,
      settings: db.settings
    });
  });

  app.post('/api/data', authenticateUser, (req, res) => {
    const user = (req as any).user;
    const { quotes, categories, library, settings } = req.body;
    const db = loadDB();

    // 1. Categories, Library, and Settings are shared globally
    if (categories) db.categories = categories;
    if (library) db.library = library;
    if (settings) db.settings = settings;

    // 2. Safe merge of quotes based on user role to prevent cross-account deletions/overwrites
    if (quotes) {
      if (user.role === 'admin') {
        // Admin has complete authority to replace or modify all quotes, as well as change assignments
        db.quotes = quotes;
      } else {
        // Normal user: Merge strategy
        // Keep quotes that belong to OTHER users (assignedTo is not this user's username)
        const otherUsersQuotes = db.quotes.filter(q => q.assignedTo !== user.username);

        // Sanitize incoming quotes to ensure they are strictly assigned to this user
        const sanitizedIncomingQuotes = quotes.map((q: any) => ({
          ...q,
          assignedTo: user.username // Hard-enforce the correct assignment
        }));

        // Merge back together
        db.quotes = [...otherUsersQuotes, ...sanitizedIncomingQuotes];
      }
    }

    saveDB(db);
    res.json({ success: true, message: '所有變更已成功同步到伺服器' });
  });

  // 4. Dedicated endpoint for quick assignment update by Admin
  app.post('/api/quotes/assign', authenticateUser, requireAdmin, (req, res) => {
    const { quoteId, assignedTo } = req.body;
    if (!quoteId) {
      return res.status(400).json({ success: false, message: '缺少報價單編號' });
    }

    const db = loadDB();
    const index = db.quotes.findIndex(q => q.id === quoteId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: '找不到報價單' });
    }

    // Verify assigned user exists (can be empty string to unassign/leave for whlee)
    if (assignedTo) {
      const userExists = db.accounts.some(a => a.username === assignedTo);
      if (!userExists) {
        return res.status(400).json({ success: false, message: `使用者 ${assignedTo} 不存在` });
      }
    }

    db.quotes[index].assignedTo = assignedTo || '';
    saveDB(db);

    res.json({ success: true, message: '指派成功', quotes: db.quotes });
  });

  // Serve static files in production / Vite middleware in dev
  if (process.env.NODE_ENV !== "production") {
    createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    }).then((vite) => {
      app.use(vite.middlewares);
    }).catch((err) => {
      console.error("Failed to start Vite dev server middleware", err);
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Express full-stack server running on http://0.0.0.0:${PORT}`);
    });
  }

  export default app;
