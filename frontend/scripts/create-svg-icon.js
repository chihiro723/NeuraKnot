// SVGアイコンを作成するスクリプト
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// NeuraKnotのブランドカラー
const BRAND_COLOR = '#6366f1';
const ACCENT_COLOR = '#8b5cf6';

// SVGアイコンのテンプレート
const SVG_ICON = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- 背景の円 -->
  <circle cx="512" cy="512" r="480" fill="${BRAND_COLOR}"/>
  
  <!-- ブリッジのアイコン -->
  <g transform="translate(512, 512)">
    <!-- 左側の柱 -->
    <rect x="-280" y="-200" width="80" height="400" rx="40" fill="white"/>
    
    <!-- 右側の柱 -->
    <rect x="200" y="-200" width="80" height="400" rx="40" fill="white"/>
    
    <!-- ブリッジの道路部分 -->
    <rect x="-300" y="40" width="600" height="60" rx="30" fill="white"/>
    
    <!-- ケーブル（左側） -->
    <path d="M -240 -160 Q -120 -40, 0 40" stroke="white" stroke-width="24" fill="none" stroke-linecap="round"/>
    <path d="M -240 -80 Q -80 0, 0 40" stroke="white" stroke-width="24" fill="none" stroke-linecap="round"/>
    <path d="M -240 0 Q -40 20, 0 40" stroke="white" stroke-width="24" fill="none" stroke-linecap="round"/>
    
    <!-- ケーブル（右側） -->
    <path d="M 240 -160 Q 120 -40, 0 40" stroke="white" stroke-width="24" fill="none" stroke-linecap="round"/>
    <path d="M 240 -80 Q 80 0, 0 40" stroke="white" stroke-width="24" fill="none" stroke-linecap="round"/>
    <path d="M 240 0 Q 40 20, 0 40" stroke="white" stroke-width="24" fill="none" stroke-linecap="round"/>
    
    <!-- 中央の接続点（人とAIの出会い） -->
    <circle cx="0" cy="40" r="60" fill="${ACCENT_COLOR}"/>
    <circle cx="0" cy="40" r="40" fill="white"/>
  </g>
</svg>`;

// Safari Pinned Tab用のモノクロSVG
const SAFARI_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g fill="black">
    <!-- 左側の柱 -->
    <rect x="2" y="4" width="2" height="8" rx="1"/>
    
    <!-- 右側の柱 -->
    <rect x="12" y="4" width="2" height="8" rx="1"/>
    
    <!-- ブリッジの道路部分 -->
    <rect x="1" y="9" width="14" height="2" rx="1"/>
    
    <!-- ケーブル（簡略化） -->
    <path d="M 3 5 Q 8 7, 8 9" stroke="black" stroke-width="0.5" fill="none"/>
    <path d="M 13 5 Q 8 7, 8 9" stroke="black" stroke-width="0.5" fill="none"/>
    
    <!-- 中央の点 -->
    <circle cx="8" cy="9" r="1.5"/>
  </g>
</svg>`;

async function createSVGIcons() {
  try {
    // ディレクトリの作成
    await fs.mkdir(ASSETS_DIR, { recursive: true });
    await fs.mkdir(PUBLIC_DIR, { recursive: true });
    
    console.log('SVGアイコンを作成します...');
    
    // メインアイコンの保存
    const mainIconPath = path.join(ASSETS_DIR, 'icon-source.svg');
    await fs.writeFile(mainIconPath, SVG_ICON);
    console.log(`✓ メインアイコンを作成: ${mainIconPath}`);
    
    // Safari Pinned Tab用アイコンの保存
    const safariIconPath = path.join(PUBLIC_DIR, 'safari-pinned-tab.svg');
    await fs.writeFile(safariIconPath, SAFARI_SVG);
    console.log(`✓ Safari用アイコンを作成: ${safariIconPath}`);
    
    console.log('\nSVGアイコンの作成が完了しました！');
    console.log('次のステップ:');
    console.log('1. npm install sharp png-to-ico');
    console.log('2. node scripts/convert-svg-to-png.js');
    console.log('3. node scripts/generate-icons.js');
    
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

createSVGIcons();