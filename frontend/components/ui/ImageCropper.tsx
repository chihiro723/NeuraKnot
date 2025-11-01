"use client";

import { useState, useRef, useCallback } from "react";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "./button";

interface ImageCropperProps {
  src: string;
  onCropComplete: (croppedImageBlob: Blob) => void;
  onCancel: () => void;
}

export function ImageCropper({
  src,
  onCropComplete,
  onCancel,
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 画像が読み込まれたときに、中央に正方形のクロップ領域を設定
  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      const size = Math.min(width, height);
      const x = (width - size) / 2;
      const y = (height - size) / 2;

      setCrop({
        unit: "px",
        x: x,
        y: y,
        width: size,
        height: size,
      });
    },
    []
  );

  const handleCropChange = useCallback((c: Crop) => {
    setCrop(c);
  }, []);

  const handleCropComplete = useCallback((c: PixelCrop) => {
    setCompletedCrop(c);
  }, []);

  const getCroppedImg = async (): Promise<Blob | null> => {
    if (!completedCrop || !imgRef.current) {
      return null;
    }

    const image = imgRef.current;
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const targetSize = 512; // 出力サイズを512x512に固定
    canvas.width = targetSize;
    canvas.height = targetSize;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    // アンチエイリアシングを有効化
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // 画像をトリミング＆リサイズして描画
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      targetSize,
      targetSize
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        "image/jpeg",
        0.95 // 品質95%
      );
    });
  };

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg();
      if (croppedBlob) {
        onCropComplete(croppedBlob);
      }
    } catch (error) {
      console.error("Failed to crop image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex fixed inset-0 z-50 justify-center items-center p-4 bg-black/80">
      <div className="overflow-hidden w-full max-w-3xl bg-white rounded-2xl shadow-2xl dark:bg-gray-900">
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            画像をトリミング
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ドラッグして表示範囲を調整してください
          </p>
        </div>

        {/* トリミングエリア */}
        <div className="p-6 flex justify-center items-center bg-gray-100 dark:bg-gray-800 min-h-[500px]">
          <ReactCrop
            crop={crop}
            onChange={handleCropChange}
            onComplete={handleCropComplete}
            aspect={1}
            circularCrop
            minWidth={50}
            minHeight={50}
          >
            <img
              ref={imgRef}
              src={src}
              alt="Crop preview"
              onLoad={onImageLoad}
              style={{
                maxWidth: "600px",
                maxHeight: "600px",
                width: "auto",
                height: "auto",
                display: "block",
              }}
            />
          </ReactCrop>
        </div>

        {/* アクション */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSave}
              disabled={isProcessing}
              className="bg-green-500 hover:bg-green-600"
            >
              {isProcessing ? "処理中..." : "切り取り"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
