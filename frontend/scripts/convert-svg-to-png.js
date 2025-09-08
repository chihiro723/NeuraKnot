// SVGをPNGに変換するスクリプト
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SVG_PATH = path.join(__dirname, '..', 'assets', 'icon-source.svg');
const PNG_PATH = path.join(__dirname, '..', 'assets', 'icon-source.png');

async function convertSVGtoPNG() {
  try {
    console.log('SVGからPNGへの変換を開始します...');
    
    // SVGファイルの存在確認
    try {
      await fs.access(SVG_PATH);
    } catch (error) {
      console.error(`エラー: SVGファイルが見つかりません: ${SVG_PATH}`);
      console.log('先に node scripts/create-svg-icon.js を実行してください。');
      return;
    }
    
    // SVGを読み込んでPNGに変換（1024x1024）
    await sharp(SVG_PATH)
      .resize(1024, 1024)
      .png()
      .toFile(PNG_PATH);
    
    console.log(`✓ PNG画像を作成: ${PNG_PATH}`);
    console.log('\n変換が完了しました！');
    console.log('次のステップ: node scripts/generate-icons.js');
    
  } catch (error) {
    console.error('変換中にエラーが発生しました:', error);
  }
}

convertSVGtoPNG();