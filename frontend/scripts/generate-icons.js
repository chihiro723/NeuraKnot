// アイコン生成スクリプト
// このスクリプトを実行して必要なアイコンファイルを生成してください
// 実行方法: node scripts/generate-icons.js

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ico from 'png-to-ico';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ソース画像のパス（1024x1024のPNGを推奨）
const SOURCE_IMAGE = path.join(__dirname, '..', 'assets', 'icon-source.png');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// アイコンサイズの定義
const ICON_SIZES = [
  // Favicon
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  
  // Apple Touch Icons
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'apple-touch-icon-57x57.png', size: 57 },
  { name: 'apple-touch-icon-60x60.png', size: 60 },
  { name: 'apple-touch-icon-72x72.png', size: 72 },
  { name: 'apple-touch-icon-76x76.png', size: 76 },
  { name: 'apple-touch-icon-114x114.png', size: 114 },
  { name: 'apple-touch-icon-120x120.png', size: 120 },
  { name: 'apple-touch-icon-144x144.png', size: 144 },
  { name: 'apple-touch-icon-152x152.png', size: 152 },
  { name: 'apple-touch-icon-180x180.png', size: 180 },
  
  // Android Chrome Icons
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
  
  // MS Tile
  { name: 'mstile-150x150.png', size: 150 },
  
  // Maskable icon for PWA
  { name: 'maskable-icon-512x512.png', size: 512, padding: 0.1 },
  
  // Open Graph Image
  { name: 'og-image.png', size: { width: 1200, height: 630 } },
  
  // Shortcuts
  { name: 'shortcut-chat.png', size: 96 },
  { name: 'shortcut-friends.png', size: 96 },
];

async function generateIcons() {
  try {
    // publicディレクトリの確認
    await fs.mkdir(PUBLIC_DIR, { recursive: true });
    
    console.log('アイコン生成を開始します...');
    console.log(`ソース画像: ${SOURCE_IMAGE}`);
    console.log(`出力先: ${PUBLIC_DIR}`);
    
    // ソース画像の存在確認
    try {
      await fs.access(SOURCE_IMAGE);
    } catch (error) {
      console.error(`エラー: ソース画像が見つかりません: ${SOURCE_IMAGE}`);
      console.log('1024x1024のPNG画像を assets/icon-source.png として配置してください。');
      return;
    }
    
    // 各アイコンを生成
    for (const icon of ICON_SIZES) {
      const outputPath = path.join(PUBLIC_DIR, icon.name);
      
      if (typeof icon.size === 'number') {
        // 正方形のアイコン
        const size = icon.size;
        const padding = icon.padding ? Math.floor(size * icon.padding) : 0;
        
        await sharp(SOURCE_IMAGE)
          .resize(size - padding * 2, size - padding * 2)
          .extend({
            top: padding,
            bottom: padding,
            left: padding,
            right: padding,
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .png()
          .toFile(outputPath);
          
        console.log(`✓ ${icon.name} (${size}x${size})`);
      } else {
        // 長方形のアイコン（OG画像など）
        await sharp(SOURCE_IMAGE)
          .resize(icon.size.width, icon.size.height, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255 }
          })
          .png()
          .toFile(outputPath);
          
        console.log(`✓ ${icon.name} (${icon.size.width}x${icon.size.height})`);
      }
    }
    
    // favicon.icoの生成
    const faviconBuffer = await sharp(SOURCE_IMAGE)
      .resize(32, 32)
      .png()
      .toBuffer();
    
    const icoBuffer = await ico(faviconBuffer);
    await fs.writeFile(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer);
    console.log('✓ favicon.ico');
    
    // Safari Pinned Tab用のSVGは手動で作成する必要があります
    console.log('\n注意: safari-pinned-tab.svg は手動で作成してください。');
    console.log('モノクロのSVGファイルを作成し、public/safari-pinned-tab.svg として保存してください。');
    
    console.log('\nアイコン生成が完了しました！');
    
  } catch (error) {
    console.error('アイコン生成中にエラーが発生しました:', error);
  }
}

// 実行
generateIcons();