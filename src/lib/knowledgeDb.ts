import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import * as XLSX from 'xlsx';

export interface KnowledgeItem {
  id: string;
  no: string;
  category: string;
  description: string;
  unit: string;
  internalCost: string; // 內部成本中位數 (HKD) - Sensitive!
  marketPrice: string;  // 街客價中位數 (HKD)
  remarks?: string;
}

export interface KnowledgeSheet {
  id: string;
  title: string;
  icon?: string;
  description?: string;
  type: 'cleardown' | 'materials' | 'guidelines' | 'manual' | 'custom' | 'engineering';
  items?: KnowledgeItem[];
  customContent?: string;
}

export interface KnowledgeDatabasePayload {
  version: number;
  lastUpdated: number;
  updatedBy: string;
  hash: string;
  sheets: KnowledgeSheet[];
}

// Minimal sync throttling interval (30 seconds)
export const MIN_SYNC_INTERVAL_MS = 30000;

// Default initial dataset built directly from user provided 18 CSV datasets
export const INITIAL_KNOWLEDGE_SHEETS: KnowledgeSheet[] = [
  {
    id: 'sheet-1-cleardown',
    title: '1. 打拆工程與物料',
    type: 'engineering',
    description: '全屋/局部打拆、地台木地板、牆身間隔、廚廁專項、泥頭清運與打拆輔料',
    items: [
      { id: 'cd-1', no: '1', category: 'A. 保護', description: '全屋地台中空板保護', unit: '單位（2-3房呎標準有電梯單位）', internalCost: '1000-2000', marketPrice: '2000-3000', remarks: '' },
      { id: 'cd-2', no: '2', category: 'A. 保護', description: '全屋地台MDF + 馬路膠紙保護', unit: '單位（2-3房呎標準有電梯單位）', internalCost: '2000-3000', marketPrice: '3000-4000', remarks: '' },
      { id: 'cd-3', no: '3', category: 'A. 清運', description: '額外泥頭清運（第4車起）視乎情況多小', unit: '次', internalCost: '1200-2000', marketPrice: '2000-3000', remarks: '' },
      { id: 'cd-4', no: '4', category: 'A. 清運', description: '全屋基本清拆連清走泥頭3次 + 大廈公眾保護 + 政府處置費', unit: '全屋', internalCost: '3000', marketPrice: '4200', remarks: '' },
      { id: 'cd-5', no: '5', category: 'B. 地板類', description: '封木地板連底板 + 踢腳線', unit: '井（100呎）', internalCost: '1200', marketPrice: '2200-2400', remarks: '' },
      { id: 'cd-6', no: '6', category: 'B. 地板類', description: '封木地板連底板 + 踢腳線（非全屋計費）', unit: '井（100呎）', internalCost: '1500', marketPrice: '2800-3000', remarks: '' },
      { id: 'cd-7', no: '7', category: 'B. 地板類', description: '拆地台磁磚連批盪層', unit: '井（100呎）', internalCost: '1500', marketPrice: '2800-3000', remarks: '' },
      { id: 'cd-8', no: '8', category: 'B. 地板類', description: '拆地台磁磚連批盪層（非全屋計費）', unit: '井（100呎）', internalCost: '1800', marketPrice: '3400-3600', remarks: '' },
      { id: 'cd-9', no: '9', category: 'B. 地板類', description: '吉仔/柚木', unit: '井（100呎）', internalCost: '700', marketPrice: '1400-1600', remarks: '' },
      { id: 'cd-10', no: '10', category: 'B. 地板類', description: '吉仔/柚木（非全屋計費）', unit: '井（100呎）', internalCost: '1000', marketPrice: '1800-2000', remarks: '' },
      { id: 'cd-11', no: '11', category: 'C. 牆身+間隔', description: '拆非結構磚牆連牆邊（細沙磚）', unit: '井（100呎）', internalCost: '2000', marketPrice: '2800-3000', remarks: '' },
      { id: 'cd-12', no: '12', category: 'C. 牆身+間隔', description: '拆非結構磚牆連牆邊（大沙磚）', unit: '井（100呎）', internalCost: '3000', marketPrice: '3800-4000', remarks: '' },
      { id: 'cd-13', no: '13', category: 'C. 牆身+間隔', description: '拆廳房牆身磁磚/雲石', unit: '井（100呎）', internalCost: '1600', marketPrice: '2800-3200', remarks: '' },
      { id: 'cd-14', no: '14', category: 'C. 牆身+間隔', description: '拆部份間隔牆（牆物開門窿）', unit: '幅', internalCost: '800', marketPrice: '1600', remarks: '' },
      { id: 'cd-15', no: '15', category: 'D. 廚房專項', description: '廚房牆地全爆（連舊櫃 + 石面 + 部份牆體）標準公/居/私樓', unit: '套', internalCost: '4500', marketPrice: '9000', remarks: '' },
      { id: 'cd-16', no: '16', category: 'D. 廚房專項', description: '廚房牆地全爆（非全屋計費）', unit: '套', internalCost: '5000', marketPrice: '10000', remarks: '' },
      { id: 'cd-17', no: '17', category: 'D. 廚房專項', description: '廚房牆地天全爆（連舊櫃 + 石面 + 部份牆體）標準公/居/私樓', unit: '套', internalCost: '5300', marketPrice: '10600', remarks: '' },
      { id: 'cd-18', no: '18', category: 'D. 廚房專項', description: '大屋廚房牆地全爆（連舊櫃 + 石面 + 部份牆體）', unit: '套', internalCost: '6500-8000', marketPrice: '13000-16000', remarks: '' },
      { id: 'cd-19', no: '19', category: 'D. 廚房專項', description: '拆舊廚櫃全套（地櫃+吊櫃+舊石面+鋅盤）', unit: '套', internalCost: '2500', marketPrice: '4500', remarks: '' },
      { id: 'cd-20', no: '20', category: 'D. 廚房專項', description: '拆舊公屋露台位置（牆身及地台瓦）', unit: '套', internalCost: '2000', marketPrice: '3800-4000', remarks: '' },
      { id: 'cd-21', no: '21', category: 'E. 廁所專項', description: '廁所牆地全爆（連浴缸/企缸 + 舊櫃）', unit: '套', internalCost: '4000', marketPrice: '8000-9000', remarks: '' },
      { id: 'cd-22', no: '22', category: 'E. 廁所專項', description: '廁所牆地全爆（非全屋計費）', unit: '套', internalCost: '5000', marketPrice: '10000', remarks: '' },
      { id: 'cd-23', no: '23', category: 'E. 廁所專項', description: '廁所牆地天全爆（連浴缸/企缸 + 舊櫃）', unit: '套', internalCost: '4800', marketPrice: '9600', remarks: '' },
      { id: 'cd-24', no: '24', category: 'E. 廁所專項', description: '大屋廁所牆地全爆（連浴缸/企缸 + 舊櫃）', unit: '套', internalCost: '6000-7000', marketPrice: '12000-14000', remarks: '' },
      { id: 'cd-25', no: '25', category: 'E. 廁所專項', description: '拆舊廁所櫃 + 鏡櫃', unit: '套', internalCost: '2500', marketPrice: '3500', remarks: '' },
      { id: 'cd-26', no: '26', category: 'E. 廁所專項', description: '拆舊浴缸 / 企缸', unit: '個', internalCost: '3000', marketPrice: '4000', remarks: '' },
      { id: 'cd-27', no: '27', category: 'E. 廁所專項', description: '拆舊潔具全套（馬桶+花灑+浴屏+面盆）', unit: '件', internalCost: '800', marketPrice: '1100', remarks: '' },
      { id: 'cd-28', no: '28', category: 'F. 門窗大門', description: '拆舊木門連門框', unit: '扇', internalCost: '300', marketPrice: '500', remarks: '' },
      { id: 'cd-29', no: '29', category: 'F. 門窗大門', description: '拆舊鋁窗（2-3房單位）', unit: '一間屋', internalCost: '4000', marketPrice: '8000', remarks: '' },
      { id: 'cd-30', no: '30', category: 'F. 門窗大門', description: '拆舊鐵窗（2-3房單位）', unit: '一間屋', internalCost: '5000', marketPrice: '10000', remarks: '' },
      { id: 'cd-31', no: '31', category: 'F. 門窗大門', description: '拆大門木殼 / 走廊木殼', unit: '套', internalCost: '2000', marketPrice: '3000', remarks: '' },
      { id: 'cd-32', no: '32', category: 'G. 天花冷氣', description: '拆舊冷氣機（窗口式或分體式）連拆喉', unit: '部', internalCost: '300', marketPrice: '500', remarks: '' },
      { id: 'cd-33', no: '33', category: 'I. 特殊保護', description: '拆石棉瓦 / 危險物料（需專業）', unit: '平方呎', internalCost: '125', marketPrice: '180', remarks: '' },
      { id: 'cd-34', no: '34', category: 'I. 特殊保護', description: '拆僭建物（天台屋/棚架/露台擴建）', unit: '平方呎', internalCost: '40', marketPrice: '60', remarks: '' },
      { id: 'cd-35', no: '35', category: 'I. 特殊保護', description: '完工後基本清場連垃圾清走', unit: '次', internalCost: '1200', marketPrice: '2400', remarks: '' }
    ]
  },
  {
    id: 'sheet-2-masonry',
    title: '2. 泥水工程',
    type: 'engineering',
    description: '地台鋪磚、壁磚、石屎台、企缸基仔、防水全套、窗台雲石吸咀及地台找平',
    items: [
      { id: 'ma-1', no: '1', category: 'J. 泥水工程', description: '廳房地台瓷磚鋪設 (連找平器、掃口，不包磚) 乾濕沙做法', unit: '平方呎', internalCost: '35-40', marketPrice: '80-88', remarks: '包600X600/1200X200' },
      { id: 'ma-2', no: '2', category: 'J. 泥水工程', description: '廳房地台瓷磚鋪設 (連找平器、掃口，不包磚) 硬底做法', unit: '平方呎', internalCost: '45-50', marketPrice: '90-98', remarks: '包600X600/1200X200' },
      { id: 'ma-3', no: '3', category: 'J. 泥水工程', description: '廚房/浴室牆身+地台全包鋪磚 (連防水底層，不包磚)', unit: '平方呎', internalCost: '45-50', marketPrice: '90-98', remarks: '硬底做法' },
      { id: 'ma-4', no: '4', category: 'J. 泥水工程', description: '廚房櫃底石屎台（台面不包貼磚）', unit: '個', internalCost: '1000-1500', marketPrice: '2000-2500', remarks: '連工包料及盪平' },
      { id: 'ma-5', no: '5', category: 'J. 泥水工程', description: '廁所櫃底石屎台（台面不包貼磚）', unit: '個', internalCost: '1000', marketPrice: '1500-2000', remarks: '連工包料及盪平' },
      { id: 'ma-6', no: '6', category: 'J. 泥水工程', description: '廁所新造企缸基仔', unit: '個', internalCost: '2000', marketPrice: '3000-4000', remarks: '連工包料及底加牛奶水加強防水' },
      { id: 'ma-7', no: '7', category: 'J. 泥水工程', description: '廁所糞喉改位起基仔', unit: '個', internalCost: '1000-1500', marketPrice: '2000-3000', remarks: '連工包料' },
      { id: 'ma-8', no: '8', category: 'J. 泥水工程', description: '浴室防水全套 (Sika/德高兩層+閉水測試48小時)', unit: '套', internalCost: '1000-2000', marketPrice: '3000-4000', remarks: '每間廁所；連淋浴位6呎高' },
      { id: 'ma-9', no: '9', category: 'J. 泥水工程', description: '廚房防水全套 (連斜水、閉水測試)', unit: '套', internalCost: '1000-2000', marketPrice: '3000-4000', remarks: '每間廚房腰線以下及地台' },
      { id: 'ma-10', no: '10', category: 'J. 泥水工程', description: '砌新磚牆 / 間隔牆 (連批盪，1井=100呎)', unit: '井', internalCost: '4000-4500', marketPrice: '8000-9000', remarks: '標準沙磚；加鋼筋貴$800' },
      { id: 'ma-11', no: '11', category: 'J. 泥水工程', description: '地台找平 + 造斜水 (廚廁專用)', unit: '平方呎', internalCost: '18', marketPrice: '28', remarks: '防積水必做；連英泥沙' },
      { id: 'ma-12', no: '12', category: 'J. 泥水工程', description: '窗台/門檻雲石吸咀安裝 (連批盪) 2房間隔', unit: '間', internalCost: '1000-1500', marketPrice: '2500-3000', remarks: '標準尺寸；雲石另計' },
      { id: 'ma-13', no: '13', category: 'J. 泥水工程', description: '窗台/門檻雲石吸咀安裝 (連批盪) 3房間隔', unit: '間', internalCost: '1500-2000', marketPrice: '2500-4000', remarks: '標準尺寸；雲石另計' },
      { id: 'ma-14', no: '14', category: 'J. 泥水工程', description: '局部牆身批盪維修 (裂縫/霉菌處理)', unit: '平方呎', internalCost: '22', marketPrice: '32', remarks: '舊樓常用；連防潮強化' },
      { id: 'ma-15', no: '15', category: 'J. 泥水工程', description: '大理石/雲石窗台包邊 (連批盪)', unit: '直線米', internalCost: '380', marketPrice: '680', remarks: '高檔設計；包安裝' }
    ]
  },
  {
    id: 'sheet-3-plumbing',
    title: '3. 水力工程',
    type: 'engineering',
    description: '全屋來去水喉重造 (PPR/銅喉)、外牆喉、水錶喉、糞喉、座廁潔具安裝',
    items: [
      { id: 'pl-1', no: '1', category: 'N. 水工程', description: '全屋來去水喉重造 (一廚一廁，PPR膠喉或銅喉，連磅水測試)', unit: '套', internalCost: '14500', marketPrice: '27000-29000', remarks: '包裝龍頭馬桶' },
      { id: 'pl-2', no: '2', category: 'N. 水工程', description: '全屋來去水喉重造 (一廚兩廁)', unit: '套', internalCost: '20000', marketPrice: '40000-42000', remarks: '包裝龍頭馬桶' },
      { id: 'pl-3', no: '3', category: 'N. 水工程', description: '廚房廁所外牆喉（一廚一廁）', unit: '套', internalCost: '8000', marketPrice: '12000-16000', remarks: '不包搭棚' },
      { id: 'pl-4', no: '4', category: 'N. 水工程', description: '水錶房入屋食水喉(底銷5米內）', unit: '米', internalCost: '5000', marketPrice: '8000-10000', remarks: '超5米以上$10000' },
      { id: 'pl-5', no: '5', category: 'N. 水工程', description: '新造糞喉/喊水喉改位（明喉）', unit: '套', internalCost: '4000', marketPrice: '6000-8000', remarks: '暗喉$7000' },
      { id: 'pl-6', no: '6', category: 'N. 水工程', description: '新造一條來水喉', unit: '條', internalCost: '2500', marketPrice: '4000-5000', remarks: '視乎現場及造法' },
      { id: 'pl-7', no: '7', category: 'N. 水工程', description: '新造一條去水喉', unit: '條', internalCost: '2500', marketPrice: '4000-5000', remarks: '視乎現場及造法' },
      { id: 'pl-8', no: '8', category: 'N. 水工程', description: '座廁/智能座廁安裝 (不包潔具)', unit: '個', internalCost: '1600-2000', marketPrice: '1800-2800', remarks: '' },
      { id: 'pl-9', no: '9', category: 'N. 水工程', description: '洗手盆/花灑/水龍頭安裝 (連水喉接駁及隔氣，不包潔具)', unit: '個', internalCost: '800', marketPrice: '800-1200', remarks: '' },
      { id: 'pl-10', no: '10', category: 'N. 水工程', description: '排水管/地台去水隔氣安裝 (連U彎+防臭)', unit: '個', internalCost: '600', marketPrice: '800', remarks: '' },
      { id: 'pl-11', no: '11', category: 'N. 水工程', description: '水喉維修/局部更換 (漏水、通渠、單件配件)', unit: '項', internalCost: '800', marketPrice: '1000', remarks: '' }
    ]
  },
  {
    id: 'sheet-4-electrical',
    title: '4. 電力工程',
    type: 'engineering',
    description: '單相/三相電力、13A插座、20A/32A/40A專用位、Cat6網絡線、WR1證明書與全屋電位預算',
    items: [
      { id: 'el-1', no: '1', category: 'O. 單相', description: '13A單蘇插座安裝（不連面板）', unit: '個', internalCost: '500-550', marketPrice: '780-800', remarks: '標準單蘇；孖蘇計1.5-2位' },
      { id: 'el-2', no: '2', category: 'O. 單相', description: '13A孖蘇插座安裝（不連面板）', unit: '個', internalCost: '750-825', marketPrice: '1170-1200', remarks: '' },
      { id: 'el-3', no: '3', category: 'O. 單相', description: '燈出線位/燈開關/櫃燈出線位', unit: '個', internalCost: '500-550', marketPrice: '780-800', remarks: '如多於一枝燈開關計一個' },
      { id: 'el-4', no: '4', category: 'O. 單相', description: '20A專用電位（冷氣/儲水熱水爐）', unit: '個', internalCost: '1000-1100', marketPrice: '1600-1800', remarks: '冷氣最常用；包粗線+RCBO' },
      { id: 'el-5', no: '5', category: 'O. 單相', description: '32A專用電位（電磁爐/即熱水器/單相EV預留）', unit: '個', internalCost: '1375', marketPrice: '2500', remarks: '廚房高功率首選；單相7kW常用' },
      { id: 'el-6', no: '6', category: 'O. 單相', description: '弱電位 Cat6網絡線（每條/每位，包RJ45插座）', unit: '個', internalCost: '500-550', marketPrice: '780-800', remarks: '最常用Cat6高速；支援Gigabit' },
      { id: 'el-7', no: '7', category: 'O. 單相', description: '單相電箱更換（60-100A，連WR1測試文件）', unit: '個', internalCost: '4000', marketPrice: '6000-6500', remarks: '如需改位$1500-$2500視乎遠近' },
      { id: 'el-8', no: '8', category: 'O. 單相', description: '出WR1完工證明書（全屋新裝/改裝）', unit: '張', internalCost: '4000', marketPrice: '6000', remarks: '註冊電業承辦商簽發' },
      { id: 'el-9', no: '9', category: 'O. 三相', description: '全屋電力工程（三相升級版，含三相電箱+高功率專線）', unit: '套', internalCost: '38000', marketPrice: '55000', remarks: '適合EV充電或電磁爐大單位' },
      { id: 'el-10', no: '10', category: 'O. 三相', description: '三相電箱更換（100A以上，連WR1測試文件）', unit: '個', internalCost: '10000', marketPrice: '13000', remarks: '包升級協助' },
      { id: 'el-11', no: '11', category: 'O. 預算對照', description: '全屋總電位估算（351 - 400呎，36個電位）', unit: '套', internalCost: '22000', marketPrice: '37000', remarks: '標準住宅最穩陣方案' }
    ]
  },
  {
    id: 'sheet-5-flooring',
    title: '5. 地板工程',
    type: 'engineering',
    description: '全屋強化複合木地板、PVC/乙烯基地板、瓷磚地台、實木地板及地台加高',
    items: [
      { id: 'fl-1', no: '1', category: 'R. 地板工程', description: '全屋強化複合木地板 (連底板+踢腳線+找平)', unit: '平方呎', internalCost: '48', marketPrice: '72', remarks: '最常用；12mm厚；防潮版貴$5/呎' },
      { id: 'fl-2', no: '2', category: 'R. 地板工程', description: '全屋PVC/乙烯基地板 (防水，連找平)', unit: '平方呎', internalCost: '32', marketPrice: '48', remarks: '廚廁/寵物單位首選；易潔耐用' },
      { id: 'fl-3', no: '3', category: 'R. 地板工程', description: '全屋瓷磚地板 (連找平掃口，不包磚)', unit: '平方呎', internalCost: '35', marketPrice: '52', remarks: '大磚人字鋪加15%' },
      { id: 'fl-4', no: '4', category: 'R. 地板工程', description: '全屋實木地板 (連底板+踢腳線)', unit: '平方呎', internalCost: '85', marketPrice: '128', remarks: '高檔天然木紋；需保養' },
      { id: 'fl-5', no: '5', category: 'R. 地板工程', description: '地台加高 + 木地板 (連結構)', unit: '平方呎', internalCost: '65', marketPrice: '95', remarks: '小單位慳位神器' },
      { id: 'fl-6', no: '6', category: 'R. 地板工程', description: '地板工程清場 + 基本保護', unit: '次', internalCost: '1500', marketPrice: '2200', remarks: '完工必做' }
    ]
  },
  {
    id: 'sheet-6-ceiling',
    title: '6. 天花工程',
    type: 'engineering',
    description: '全屋石膏板假天花、廚廁防潮天花、鋁質長條天花及跌級造型天花',
    items: [
      { id: 'ce-1', no: '1', category: 'K. 天花工程', description: '全屋石膏板假天花', unit: '平方呎', internalCost: '25', marketPrice: '38', remarks: '最常用廳房款；包基本安裝' },
      { id: 'ce-2', no: '2', category: 'K. 天花工程', description: '廚房/浴室防潮石膏板假天花 (防火防霉) 標準款', unit: '套', internalCost: '3000', marketPrice: '5000', remarks: '防潮版必用；連燈位抽氣扇開口' },
      { id: 'ce-3', no: '3', category: 'K. 天花工程', description: '廚房廁所鋁質長條型假天花 (防潮易潔) 標準款', unit: '套', internalCost: '2000', marketPrice: '4000', remarks: '200或300闊鋁片/包2支LED燈' },
      { id: 'ce-4', no: '4', category: 'K. 天花工程', description: '焗漆明架假天花 (連玻璃棉隔熱)', unit: '平方呎', internalCost: '16', marketPrice: '25', remarks: '最平經濟型；適合預算單位' },
      { id: 'ce-5', no: '5', category: 'K. 天花工程', description: '暗架石膏板造型天花 (平整高檔)', unit: '平方呎', internalCost: '32', marketPrice: '48', remarks: '增加層次感；客廳主力' },
      { id: 'ce-6', no: '6', category: 'K. 天花工程', description: '木夾板特色天花 (連批灰)', unit: '平方呎', internalCost: '30', marketPrice: '55', remarks: '溫馨木紋風；需防蟲處理' },
      { id: 'ce-7', no: '7', category: 'K. 天花工程', description: '局部多層/跌級造型天花', unit: '平方呎', internalCost: '42', marketPrice: '65', remarks: '視複雜度；常連燈槽用' }
    ]
  },
  {
    id: 'sheet-7-partition',
    title: '7. 木工與間牆工程',
    type: 'engineering',
    description: '石膏板輕鋼牆、隔音牆、夾板牆、黑/銀鋁框玻璃隔斷及隱形門加固',
    items: [
      { id: 'part-1', no: '1', category: 'M. 間牆工程', description: '石膏板輕鋼牆 (標準雙面含雙面單層板)', unit: '平方呎', internalCost: '25', marketPrice: '35-50', remarks: '超出8尺高每尺加$3' },
      { id: 'part-2', no: '2', category: 'M. 間牆工程', description: '石膏板隔音牆 (標準雙面含岩棉)', unit: '平方呎', internalCost: '28', marketPrice: '38-53', remarks: '厚度約 10-12cm' },
      { id: 'part-3', no: '3', category: 'M. 間牆工程', description: '石膏板隔音牆 (雙面雙層板含岩棉)', unit: '平方呎', internalCost: '38', marketPrice: '48-53', remarks: '隔音性能更佳' },
      { id: 'part-4', no: '4', category: 'M. 間牆工程', description: '夾板輕鋼牆 (標準雙面)', unit: '平方呎', internalCost: '34', marketPrice: '44-59', remarks: '可掛重物' },
      { id: 'part-5', no: '5', category: 'M. 間牆工程', description: '黑/銀鋁框邊框玻璃隔斷 (連 8mm 或 10mm 強化玻璃)', unit: '平方呎', internalCost: '190', marketPrice: '285', remarks: '現代通透感設計' },
      { id: 'part-6', no: '6', category: 'M. 間牆工程', description: '極簡細黑框玻璃隔斷 (連 5+5mm 雙層夾膠安全玻璃)', unit: '平方呎', internalCost: '260', marketPrice: '380', remarks: '夾膠玻璃破碎不飛濺' },
      { id: 'part-7', no: '7', category: 'M. 間牆工程', description: '間隔牆開門位 / 木門框安裝', unit: '個', internalCost: '1450', marketPrice: '2200', remarks: '包含木框加固及修邊' },
      { id: 'part-8', no: '8', category: 'M. 間牆工程', description: '隱藏式平開門口位處理', unit: '個', internalCost: '2200', marketPrice: '3200', remarks: '對精度要求極高' }
    ]
  },
  {
    id: 'sheet-8-painting',
    title: '8. 油漆工程',
    type: 'engineering',
    description: '全屋剷底批灰髹乳膠漆 (3灰1底2面)、基本翻油、天花髹漆、木器噴塗與藝術漆',
    items: [
      { id: 'pa-1', no: '1', category: 'I. 油漆工程', description: '全屋剷底批灰髹乳膠漆 (3層灰+底漆1層+面漆2層，連清潔保養)', unit: '平方呎', internalCost: '17-22', marketPrice: '28-30', remarks: '最常用全屋項目；髹油面積≈實用面積×3' },
      { id: 'pa-2', no: '2', category: 'I. 油漆工程', description: '基本翻油 (不剷底，執灰+底漆+面漆)', unit: '平方呎', internalCost: '12', marketPrice: '18', remarks: '牆身良好單位首選' },
      { id: 'pa-3', no: '3', category: 'I. 油漆工程', description: '天花專項剷底批灰髹漆', unit: '平方呎', internalCost: '20', marketPrice: '30-32', remarks: '廚廁防霉漆加$5/呎' },
      { id: 'pa-4', no: '4', category: 'I. 油漆工程', description: '木器/門框/踢腳線噴塗 (批灰+多層清漆)', unit: '平方呎', internalCost: '45', marketPrice: '65', remarks: '高級焗漆貴20%' },
      { id: 'pa-5', no: '5', category: 'I. 油漆工程', description: '單扇木門全包髹漆 (連五金拆裝)', unit: '扇', internalCost: '1000-1500', marketPrice: '2000-2500', remarks: '標準尺寸' },
      { id: 'pa-6', no: '6', category: 'I. 油漆工程', description: '牆面剝落/裂痕專業維修 (局部剷底批灰)', unit: '平方呎', internalCost: '28', marketPrice: '42', remarks: '連防潮處理' },
      { id: 'pa-7', no: '7', category: 'I. 油漆工程', description: '特色牆藝術漆/陰陽色效果', unit: '平方呎', internalCost: '35-50', marketPrice: '80-130', remarks: '需額外模板' }
    ]
  },
  {
    id: 'sheet-9-furniture',
    title: '9. 傢俬工程與主櫃體',
    type: 'engineering',
    description: '高身衣櫃、矮櫃、廚櫃全套、無縫石/石英石檯面、高級五金、長虹/水波紋玻璃門與上下格床',
    items: [
      { id: 'fu-1', no: '1', category: 'P. 主櫃體', description: '高身衣櫃 / 到頂高櫃 (生態板，連基本五金收口)', unit: '直線呎', internalCost: '1980', marketPrice: '2980', remarks: '計算方法：只計闊度直線呎' },
      { id: 'fu-2', no: '2', category: 'P. 主櫃體', description: '半高矮櫃 (電視櫃/鞋櫃/玄關櫃)', unit: '直線呎', internalCost: '980', marketPrice: '1480', remarks: '4呎以下' },
      { id: 'fu-3', no: '3', category: 'P. 主櫃體', description: '廚櫃全套 (地櫃+吊櫃，防潮板，不包石面)', unit: '直線呎', internalCost: '2150', marketPrice: '3250', remarks: '包拉籃位' },
      { id: 'fu-4', no: '4', category: 'P. 主櫃體', description: '浴室防潮櫃 (鏡櫃+地櫃，防霉板)', unit: '直線呎', internalCost: '1680', marketPrice: '2480', remarks: '防濕防霉' },
      { id: 'fu-5', no: '5', category: 'P. 石面專項', description: '人造無縫石檯面 (連安裝後擋水)', unit: '直線呎', internalCost: '520', marketPrice: '780', remarks: '最平可塑性高' },
      { id: 'fu-6', no: '6', category: 'P. 石面專項', description: '石英石檯面 (連安裝後擋水)', unit: '直線呎', internalCost: '720', marketPrice: '1080', remarks: '耐刮耐熱首選' },
      { id: 'fu-7', no: '7', category: 'P. 五金配件', description: '緩衝隱藏鉸鏈 - Blum高級版', unit: '個', internalCost: '45', marketPrice: '68', remarks: '旗艦耐用' },
      { id: 'fu-8', no: '8', category: 'P. 玻璃配件', description: '長虹玻璃門 (6mm強化，直紋壓花，連鉸鏈)', unit: '扇', internalCost: '450', marketPrice: '680', remarks: '最熱門！透光不透影' },
      { id: 'fu-9', no: '9', category: 'P. 上下格床', description: '上下格床訂造 (基本款，連梯)', unit: '套', internalCost: '5800', marketPrice: '8800', remarks: '長×闊×層高計' }
    ]
  },
  {
    id: 'sheet-10-aircon',
    title: '10. 冷氣工程',
    type: 'engineering',
    description: '窗口式/分體式1.5-3匹冷氣安裝、隱藏式天花冷氣、搭棚連動與全屋冷氣套餐',
    items: [
      { id: 'ac-1', no: '1', category: 'U. 冷氣工程', description: '窗口式冷氣安裝 (1匹，Panasonic/Daikin/Gree等)', unit: '台', internalCost: '4800', marketPrice: '7200', remarks: '包玻璃封邊+排水' },
      { id: 'ac-2', no: '2', category: 'U. 冷氣工程', description: '分體式冷氣安裝 (1.5匹，Daikin/Mitsubishi/Panasonic變頻)', unit: '台', internalCost: '10500', marketPrice: '15500', remarks: '標準廳房主力' },
      { id: 'ac-3', no: '3', category: 'U. 冷氣工程', description: '分體式冷氣安裝 (2匹，常見品牌變頻)', unit: '台', internalCost: '12000', marketPrice: '18000', remarks: '大廳常用' },
      { id: 'ac-4', no: '4', category: 'U. 冷氣工程', description: '隱藏式天花冷氣安裝 (1.5-2匹，連喉管)', unit: '台', internalCost: '15000', marketPrice: '22500', remarks: '高檔無痕設計' },
      { id: 'ac-5', no: '5', category: 'U. 冷氣工程', description: '全屋分體式冷氣套餐 (1廳2房，連搭棚)', unit: '套', internalCost: '28000', marketPrice: '42000', remarks: '400-550呎單位最常用' }
    ]
  },
  {
    id: 'sheet-11-aluminum',
    title: '11. 鋁質與PD門工程',
    type: 'engineering',
    description: '50料鋁窗、新造實心/隱形PD門、鋁趟門、鋁合金浴屏、鋁蜂窩假天花及窗花蚊網',
    items: [
      { id: 'al-1', no: '1', category: 'A. 鋁窗', description: '全屋50料鋁窗 (8mm光片/基本中空玻璃，連搭棚+塞英泥沙)', unit: '平方呎', internalCost: '175', marketPrice: '255', remarks: '最常用全屋項目' },
      { id: 'al-2', no: '2', category: 'B. PD門', description: '新造實心PD門 (連門框+門鎖+門鉸+人工)', unit: '扇', internalCost: '3650', marketPrice: '5350', remarks: '廚廁最常用；實心防潮防味' },
      { id: 'al-3', no: '3', category: 'B. PD門', description: '新造隱形PD門 (連門框+五金+人工)', unit: '扇', internalCost: '6800', marketPrice: '9800', remarks: '開放式設計首選' },
      { id: 'al-4', no: '4', category: 'D. 浴屏', description: '鋁合金浴屏 (8mm強化玻璃，三趟動光片，連工包料)', unit: '套', internalCost: '3150', marketPrice: '4650', remarks: '標準尺寸' },
      { id: 'al-5', no: '5', category: 'F. 鋁蜂窩板', description: '全屋鋁蜂窩板假天花 (防火防潮輕身)', unit: '平方呎', internalCost: '125', marketPrice: '178', remarks: '近年最流行' }
    ]
  },
  {
    id: 'sheet-12-curtains',
    title: '12. 窗簾與窗飾工程',
    type: 'engineering',
    description: '電動窗簾軌、百葉簾、蜂巢遮光簾、窗簾盒安裝與全屋智能電動窗簾',
    items: [
      { id: 'cu-1', no: '1', category: 'L. 窗飾', description: '電動窗簾軌 + 布簾 (全屋，連遙控)', unit: '直線米', internalCost: '380', marketPrice: '580', remarks: '最常用；防紫外線布料' },
      { id: 'cu-2', no: '2', category: 'L. 窗飾', description: '百葉簾 / 木百葉 (防水版)', unit: '平方呎', internalCost: '65', marketPrice: '95', remarks: '廚廁/浴室首選' },
      { id: 'cu-3', no: '3', category: 'L. 窗飾', description: '蜂巢簾 / 捲簾 (遮光版)', unit: '平方呎', internalCost: '45', marketPrice: '68', remarks: '臥室隔光神器' },
      { id: 'cu-4', no: '4', category: 'L. 窗飾', description: '智能電動窗簾全套 (連App控制)', unit: '套', internalCost: '6500', marketPrice: '9800', remarks: '現代智能家居必備' }
    ]
  },
  {
    id: 'sheet-13-featurewall',
    title: '13. 特色牆工程',
    type: 'engineering',
    description: '岩板特色牆 (無縫拼接)、3D立體板、文化石、無縫壁布與電視牆燈槽組合',
    items: [
      { id: 'fw-1', no: '1', category: 'S. 特色牆', description: '岩板特色牆 (人造石/大理石紋，連批灰安裝)', unit: '平方呎', internalCost: '120', marketPrice: '180', remarks: '客廳/電視牆最熱門' },
      { id: 'fw-2', no: '2', category: 'S. 特色牆', description: '3D立體板 / 軟硬包特色牆', unit: '平方呎', internalCost: '85', marketPrice: '128', remarks: '現代風首選' },
      { id: 'fw-3', no: '3', category: 'S. 特色牆', description: '壁紙 / 無縫壁布 (連批灰)', unit: '平方呎', internalCost: '28', marketPrice: '42', remarks: '防霉版貴$5/呎' },
      { id: 'fw-4', no: '4', category: 'S. 特色牆', description: '電視牆燈槽 + 岩板組合套餐', unit: '套', internalCost: '4800', marketPrice: '7200', remarks: '包燈槽+岩板' }
    ]
  },
  {
    id: 'sheet-14-lighttrough',
    title: '14. 燈槽工程',
    type: 'engineering',
    description: '石膏板直線燈槽、L型/轉角雙面燈槽、無邊框現代燈槽與廚房線形燈槽',
    items: [
      { id: 'lt-1', no: '1', category: 'L. 燈槽工程', description: '標準石膏板直線隱藏燈槽 (連燈帶位，單層)', unit: '尺', internalCost: '250', marketPrice: '550', remarks: '最常用客廳/飯廳' },
      { id: 'lt-2', no: '2', category: 'L. 燈槽工程', description: 'L型/轉角雙面燈槽 (連燈帶位)', unit: '直線米', internalCost: '255', marketPrice: '380', remarks: '電視牆或餐廳常用' },
      { id: 'lt-3', no: '3', category: 'L. 燈槽工程', description: '隱藏式無邊框現代燈槽 (高級版)', unit: '直線米', internalCost: '275', marketPrice: '410', remarks: '現代無主燈設計' },
      { id: 'lt-4', no: '4', category: 'L. 燈槽工程', description: '客廳全週邊或大面積燈槽套餐', unit: '套', internalCost: '4800', marketPrice: '7200', remarks: '包基本LED位' }
    ]
  },
  {
    id: 'sheet-15-scaffolding',
    title: '15. 搭棚工程',
    type: 'engineering',
    description: '標準8呎/12呎/16呎竹棚、24呎轉角竹棚、冷氣專用搭棚、吊船及工程棚紙申請',
    items: [
      { id: 'sc-1', no: '1', category: 'Y. 搭棚工程', description: '標準8呎竹棚 (單窗/冷氣專用，連安裝+棚紙申請+安全網+保險)', unit: '組', internalCost: '2500', marketPrice: '3800', remarks: '低層換窗/冷氣最常用' },
      { id: 'sc-2', no: '2', category: 'Y. 搭棚工程', description: '標準12呎竹棚 (連安裝+棚紙)', unit: '組', internalCost: '3200', marketPrice: '4800', remarks: '中層常用' },
      { id: 'sc-3', no: '3', category: 'Y. 搭棚工程', description: '全屋外牆換窗搭棚 (400-550呎中層單位)', unit: '次', internalCost: '12000', marketPrice: '18000', remarks: '換窗主力' },
      { id: 'sc-4', no: '4', category: 'Y. 搭棚工程', description: '搭棚許可證 + 工程師簽紙 (棚紙)', unit: '次', internalCost: '1500', marketPrice: '2200', remarks: '法律要求，必做' }
    ]
  },
  {
    id: 'sheet-16-smarthome',
    title: '16. 智能家居工程',
    type: 'engineering',
    description: '全屋智能家居基礎版 (燈控+門鎖+App)、智能門鎖、CCTV監控系統與電動窗簾連動',
    items: [
      { id: 'sh-1', no: '1', category: 'X. 智能家居', description: '全屋智能家居基礎版 (燈控+門鎖+App，連預留線)', unit: '套', internalCost: '8500', marketPrice: '12800', remarks: '最常用' },
      { id: 'sh-2', no: '2', category: 'X. 智能家居', description: '智能門鎖安裝 (指紋/密碼/App)', unit: '個', internalCost: '2800', marketPrice: '4200', remarks: '主門必備' },
      { id: 'sh-3', no: '3', category: 'X. 智能家居', description: 'CCTV監控系統 (4-8支鏡頭，連儲存)', unit: '套', internalCost: '6500', marketPrice: '9800', remarks: '包安裝' },
      { id: 'sh-4', no: '4', category: 'X. 智能家居', description: '智能燈控系統 (全屋調光調色)', unit: '套', internalCost: '4200', marketPrice: '6500', remarks: '包燈槽連動' }
    ]
  },
  {
    id: 'sheet-17-outdoor',
    title: '17. 戶外工程',
    type: 'engineering',
    description: '戶外實木/塑木地板、木平台/花架搭建、伸縮遮陽篷、人工草皮與BBQ區搭建',
    items: [
      { id: 'od-1', no: '1', category: 'W. 戶外工程', description: '戶外實木 / 塑木地板 (連底架+防水)', unit: '平方呎', internalCost: '85', marketPrice: '128', remarks: '露台最常用' },
      { id: 'od-2', no: '2', category: 'W. 戶外工程', description: '戶外木平台 / 花架搭建 (連結構)', unit: '平方呎', internalCost: '120', marketPrice: '180', remarks: '天台神器' },
      { id: 'od-3', no: '3', category: 'W. 戶外工程', description: '伸縮遮陽篷安裝 (連固定)', unit: '直線呎', internalCost: '320', marketPrice: '480', remarks: '防雨防曬' },
      { id: 'od-4', no: '4', category: 'W. 戶外工程', description: '人工草皮安裝 (連底層)', unit: '平方呎', internalCost: '45', marketPrice: '68', remarks: '寵物/兒童區首選' }
    ]
  },
  {
    id: 'sheet-18-miscellaneous',
    title: '18. 安裝雜項與潔具',
    type: 'engineering',
    description: '座廁/智能座廁安裝、龍頭花灑、雨淋花灑、鏡櫃、抽氣扇/浴室寶及電視掛架',
    items: [
      { id: 'mi-1', no: '1', category: 'V. 安裝雜項', description: '座廁 / 智能座廁安裝 (連五金、通渠測試，不包潔具)', unit: '個', internalCost: '1150', marketPrice: '1750', remarks: '最常用；智能款加$500' },
      { id: 'mi-2', no: '2', category: 'V. 安裝雜項', description: '龍頭 / 花灑套裝安裝 (連水喉接駁，不包潔具)', unit: '個', internalCost: '480', marketPrice: '720', remarks: '浴室/廚房常用' },
      { id: 'mi-3', no: '3', category: 'V. 安裝雜項', description: '雨淋花灑 / 淋浴柱安裝 (連固定)', unit: '個', internalCost: '850', marketPrice: '1280', remarks: '豪華版' },
      { id: 'mi-4', no: '4', category: 'V. 安裝雜項', description: '鏡櫃安裝 (連燈+固定)', unit: '個', internalCost: '650', marketPrice: '950', remarks: '浴室必備' },
      { id: 'mi-5', no: '5', category: 'V. 安裝雜項', description: '抽氣扇 / 浴室寶安裝 (連接駁)', unit: '個', internalCost: '550', marketPrice: '820', remarks: '廚廁常用' },
      { id: 'mi-6', no: '6', category: 'V. 安裝雜項', description: '全屋雜項安裝套餐 (燈具+掛架+潔具)', unit: '套', internalCost: '5500', marketPrice: '8200', remarks: '大單優惠' }
    ]
  },
  {
    id: 'sheet-guidelines',
    title: '19. 打拆估算法則與加價條款',
    type: 'guidelines',
    description: '全爆工程總價速算公式、特殊地形加價規則及環境驗收標準',
    customContent: `📌 全爆打拆行情速算法則：
• 全爆打拆街客價 ≈ 實用面積 (平方呎) × $60 HKD

📌 常見加價規則與現場條款：
1. 唐樓 / 無電梯行樓梯單位：人工與搬運成本加收 +30%。
2. 舊膠水 / 瀝青黏死地板：需特別工具刮除，地台每呎額外加收 +$10/呎。
3. 額外泥頭處置：合約基本含 3 車泥頭清運（含公眾地方保護與政府堆填費），自第 4 車起每車酌收 $2,000 - $3,000 HKD。
4. 特殊危險物料：拆除石棉瓦或僭建物需專用許可，以獨立報價算。`
  },
  {
    id: 'sheet-manual',
    title: '20. 築匠系統使用指南與操作手冊',
    type: 'manual',
    description: '系統合約簽署、請款對帳、工程日曆、D單進度及雲端備份指引',
    customContent: `📘 築匠系統 (Artisan Studio) 操作指引：

1. 工程合約與報價單管理：
• 點擊首頁「＋ 建立工程合約/報價」即可開始。
• 支援點擊「自動產單號」或手動編號。
• 支持點擊「標準細項庫」一鍵自動填入預設單價及施工描述。
• 合約簽署：點擊「簽署並蓋印合約」，上傳印章並完成電子簽章。

2. 請款與對帳 (A單管理)：
• 開啟報價單「付款期數與對帳」頁籤。
• 每一期點擊「確認收款」可記錄實收金額、日期與交易備註，系統自動計算未收尾款。

3. 工程日曆與施工甘特圖：
• 首頁切換至「工程與日程日曆」，檢視項目進場、工期及驗收節點。

4. D單進度與客戶面談：
• 記錄現場面談、設計變更及客戶確認事項。`
  }
];

// Simple Hash calculation for ETag/version check
export function computeDataHash(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'v1-' + Math.abs(hash).toString(36);
}

// Local Cache Manager via IndexedDB / LocalStorage fallback
const LOCAL_STORAGE_KEY = 'artisan_knowledge_db_cache_v3';
const INDEXED_DB_NAME = 'ArtisanDB';
const INDEXED_DB_STORE = 'knowledge_store';

export async function loadLocalKnowledgePayload(): Promise<KnowledgeDatabasePayload> {
  // Try IndexedDB first
  try {
    const fromIdb = await getFromIndexedDB();
    if (fromIdb && fromIdb.sheets && fromIdb.sheets.length >= 18) {
      return fromIdb;
    }
  } catch (err) {
    console.warn('IndexedDB read failed, falling back to localStorage:', err);
  }

  // Fallback to localStorage
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.sheets && parsed.sheets.length >= 18) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('LocalStorage read error:', err);
  }

  // Default fallback with all 18 sheets
  const initialPayload: KnowledgeDatabasePayload = {
    version: 1,
    lastUpdated: Date.now(),
    updatedBy: '系統預設 (18大類工程庫)',
    hash: computeDataHash(INITIAL_KNOWLEDGE_SHEETS),
    sheets: INITIAL_KNOWLEDGE_SHEETS
  };

  saveLocalKnowledgePayload(initialPayload).catch(console.warn);
  return initialPayload;
}

export async function saveLocalKnowledgePayload(payload: KnowledgeDatabasePayload): Promise<void> {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('LocalStorage write warning:', e);
  }

  try {
    await saveToIndexedDB(payload);
  } catch (e) {
    console.warn('IndexedDB write warning:', e);
  }
}

// IndexedDB Helper implementation
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = window.indexedDB.open(INDEXED_DB_NAME, 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(INDEXED_DB_STORE)) {
        db.createObjectStore(INDEXED_DB_STORE);
      }
    };
    request.onsuccess = (e: any) => resolve(e.target.result);
    request.onerror = (e: any) => reject(e.target.error);
  });
}

async function getFromIndexedDB(): Promise<KnowledgeDatabasePayload | null> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(INDEXED_DB_STORE, 'readonly');
    const store = tx.objectStore(INDEXED_DB_STORE);
    const req = store.get('current_payload');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function saveToIndexedDB(payload: KnowledgeDatabasePayload): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(INDEXED_DB_STORE, 'readwrite');
    const store = tx.objectStore(INDEXED_DB_STORE);
    const req = store.put(payload, 'current_payload');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Server Sync Protocol (Firestore backend with Hash check & Anti-Flooding Throttling)
let lastServerSyncTimestamp = 0;

export interface SyncResult {
  status: 'success' | 'already_latest' | 'throttled' | 'error';
  message: string;
  payload?: KnowledgeDatabasePayload;
  remainingCooldownMs?: number;
}

export async function syncKnowledgeDatabaseWithServer(
  localPayload: KnowledgeDatabasePayload,
  isPushUpdate: boolean = false,
  currentUser: string = 'whlee'
): Promise<SyncResult> {
  const now = Date.now();
  const elapsed = now - lastServerSyncTimestamp;

  // 1. Throttling Protection Check (30 seconds limit)
  if (!isPushUpdate && elapsed < MIN_SYNC_INTERVAL_MS) {
    const remainingSeconds = Math.ceil((MIN_SYNC_INTERVAL_MS - elapsed) / 1000);
    return {
      status: 'throttled',
      message: `⚡ 同步頻率保護中：請於 ${remainingSeconds} 秒後再試，避免伺服器負載過大。`,
      remainingCooldownMs: MIN_SYNC_INTERVAL_MS - elapsed
    };
  }

  try {
    const docRef = doc(db, 'shared_data', 'knowledge_database');
    const docSnap = await getDoc(docRef);

    if (isPushUpdate) {
      // Admin is forcing a push/save to Server
      const updatedHash = computeDataHash(localPayload.sheets);
      const newPayload: KnowledgeDatabasePayload = {
        version: (localPayload.version || 1) + 1,
        lastUpdated: now,
        updatedBy: currentUser,
        hash: updatedHash,
        sheets: localPayload.sheets
      };

      await setDoc(docRef, newPayload);
      await saveLocalKnowledgePayload(newPayload);
      lastServerSyncTimestamp = Date.now();

      return {
        status: 'success',
        message: '已成功發布並同步最新的全套 (18個工程類別) 資料庫與手冊至雲端 Server！',
        payload: newPayload
      };
    }

    // Pull / Sync Check Mode:
    if (docSnap.exists()) {
      const serverPayload = docSnap.data() as KnowledgeDatabasePayload;
      
      // Hash / ETag Check Protocol
      const localHash = computeDataHash(localPayload.sheets);
      if (serverPayload.hash === localHash) {
        lastServerSyncTimestamp = Date.now();
        return {
          status: 'already_latest',
          message: '本地資料庫與雲端 Server (ETag/Hash) 完全一致，無須重複傳輸。',
          payload: localPayload
        };
      }

      // If Server is newer, update local
      if (serverPayload.lastUpdated > localPayload.lastUpdated) {
        await saveLocalKnowledgePayload(serverPayload);
        lastServerSyncTimestamp = Date.now();
        return {
          status: 'success',
          message: `已從雲端同步最新的工程資料庫 (更新者: @${serverPayload.updatedBy})`,
          payload: serverPayload
        };
      }
    } else {
      // Server doesn't exist yet, seed it
      const seedHash = computeDataHash(localPayload.sheets);
      const seedPayload: KnowledgeDatabasePayload = {
        ...localPayload,
        lastUpdated: now,
        hash: seedHash
      };
      await setDoc(docRef, seedPayload);
      await saveLocalKnowledgePayload(seedPayload);
      lastServerSyncTimestamp = Date.now();

      return {
        status: 'success',
        message: '初始化雲端工程資料庫成功！',
        payload: seedPayload
      };
    }

    lastServerSyncTimestamp = Date.now();
    return {
      status: 'already_latest',
      message: '本地資料庫已為最新狀態。',
      payload: localPayload
    };

  } catch (err: any) {
    console.warn('Firestore Knowledge DB sync error (offline fallback mode active):', err);
    // Offline graceful handling
    return {
      status: 'success',
      message: '目前處於離線快取模式，已使用本地 IndexedDB/LocalStorage 數據。',
      payload: localPayload
    };
  }
}

// Direct Force Push to Cloud Firestore
export async function pushKnowledgeDatabaseToCloud(
  payload: KnowledgeDatabasePayload,
  user: string = 'whlee'
): Promise<{ status: 'success' | 'error'; message: string; payload?: KnowledgeDatabasePayload }> {
  try {
    const docRef = doc(db, 'shared_data', 'knowledge_database');
    const now = Date.now();
    const updatedHash = computeDataHash(payload.sheets);
    const newPayload: KnowledgeDatabasePayload = {
      version: (payload.version || 1) + 1,
      lastUpdated: now,
      updatedBy: user,
      hash: updatedHash,
      sheets: payload.sheets
    };

    await setDoc(docRef, newPayload);
    await saveLocalKnowledgePayload(newPayload);
    lastServerSyncTimestamp = Date.now();

    return {
      status: 'success',
      message: '已成功上傳最新工程數據庫至雲端！所有線上用戶已實時自動同步。',
      payload: newPayload
    };
  } catch (err: any) {
    console.error('Push to cloud error:', err);
    return {
      status: 'error',
      message: '上傳至雲端失敗：' + (err?.message || '未知錯誤')
    };
  }
}

// Direct Force Pull from Cloud Firestore
export async function pullKnowledgeDatabaseFromCloud(): Promise<{ status: 'success' | 'error' | 'not_found'; message: string; payload?: KnowledgeDatabasePayload }> {
  try {
    const docRef = doc(db, 'shared_data', 'knowledge_database');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const serverPayload = docSnap.data() as KnowledgeDatabasePayload;
      await saveLocalKnowledgePayload(serverPayload);
      lastServerSyncTimestamp = Date.now();
      return {
        status: 'success',
        message: `已成功從雲端下載最新工程數據庫！(更新者: @${serverPayload.updatedBy || '系統'})`,
        payload: serverPayload
      };
    } else {
      return {
        status: 'not_found',
        message: '雲端尚無數據紀錄，請點擊「上傳到雲端更新」。'
      };
    }
  } catch (err: any) {
    console.error('Pull from cloud error:', err);
    return {
      status: 'error',
      message: '從雲端下載失敗：' + (err?.message || '網路異常')
    };
  }
}

// Real-Time Subscription to Firestore shared_data/knowledge_database
export function subscribeKnowledgeDatabase(
  onUpdate: (payload: KnowledgeDatabasePayload, isRemoteUpdate: boolean) => void,
  currentUsername: string = 'whlee'
): () => void {
  try {
    const docRef = doc(db, 'shared_data', 'knowledge_database');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const serverPayload = docSnap.data() as KnowledgeDatabasePayload;
        if (serverPayload && serverPayload.sheets && Array.isArray(serverPayload.sheets)) {
          saveLocalKnowledgePayload(serverPayload);
          const isRemote = serverPayload.updatedBy !== currentUsername;
          onUpdate(serverPayload, isRemote);
        }
      }
    }, (error) => {
      console.warn('Real-time Knowledge DB subscription warning:', error);
    });
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to Knowledge DB:', err);
    return () => {};
  }
}

// Excel / CSV Importer (.xlsx / .csv parser using SheetJS)
export async function parseExcelToKnowledgeSheets(file: File): Promise<KnowledgeSheet[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const newSheets: KnowledgeSheet[] = [];

  workbook.SheetNames.forEach((sheetName, index) => {
    const worksheet = workbook.Sheets[sheetName];
    const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (!rawJson || rawJson.length === 0) return;

    // Detect headers
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(5, rawJson.length); i++) {
      const row = rawJson[i];
      if (Array.isArray(row) && row.some(cell => typeof cell === 'string' && (cell.includes('描述') || cell.includes('項目') || cell.includes('單價') || cell.includes('類')))) {
        headerRowIndex = i;
        break;
      }
    }

    const headers = (rawJson[headerRowIndex] || []).map((h: any) => String(h || '').trim());
    
    // Find key column indexes
    const colNoIndex = headers.findIndex(h => h.includes('序號') || h.includes('編號') || h === 'No' || h === 'NO');
    const colCatIndex = headers.findIndex(h => h.includes('大類') || h.includes('分類') || h.includes('類別'));
    const colDescIndex = headers.findIndex(h => h.includes('描述') || h.includes('名稱') || h.includes('項目'));
    const colUnitIndex = headers.findIndex(h => h.includes('單位') || h === 'Unit');
    const colInternalCostIndex = headers.findIndex(h => h.includes('內部') || h.includes('成本') || h.includes('Cost'));
    const colMarketPriceIndex = headers.findIndex(h => h.includes('街客') || h.includes('市價') || h.includes('單價') || h.includes('售價'));
    const colRemarksIndex = headers.findIndex(h => h.includes('備註') || h.includes('說明') || h.includes('Remarks'));

    const items: KnowledgeItem[] = [];

    for (let r = headerRowIndex + 1; r < rawJson.length; r++) {
      const row = rawJson[r];
      if (!row || !Array.isArray(row) || row.length === 0) continue;

      const desc = colDescIndex >= 0 ? String(row[colDescIndex] || '').trim() : String(row[1] || row[0] || '').trim();
      if (!desc) continue; // skip blank rows

      items.push({
        id: `parsed-${index}-${r}`,
        no: colNoIndex >= 0 ? String(row[colNoIndex] || r) : String(r),
        category: colCatIndex >= 0 ? String(row[colCatIndex] || '其他分類') : '一般項目',
        description: desc,
        unit: colUnitIndex >= 0 ? String(row[colUnitIndex] || '') : '',
        internalCost: colInternalCostIndex >= 0 ? String(row[colInternalCostIndex] || '') : '',
        marketPrice: colMarketPriceIndex >= 0 ? String(row[colMarketPriceIndex] || '') : '',
        remarks: colRemarksIndex >= 0 ? String(row[colRemarksIndex] || '') : ''
      });
    }

    newSheets.push({
      id: `sheet-excel-${index}-${Date.now()}`,
      title: sheetName || `工作表 ${index + 1}`,
      type: 'engineering',
      description: `匯入自 Excel 檔 ${file.name} (${items.length} 筆資料)`,
      items: items
    });
  });

  return newSheets;
}
