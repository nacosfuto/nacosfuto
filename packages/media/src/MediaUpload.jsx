import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  X, 
  Check, 
  AlertCircle, 
  Camera, 
  RefreshCw, 
  Trash2, 
  Image as ImageIcon 
} from 'lucide-react';
import { uploadMedia, deleteMedia, replaceMedia, getOptimizedImageUrl, CLOUDINARY_FOLDERS } from './cloudinary.js';

/**
 * Universal MediaUpload Component for NACOS Platform
 * Compatible with Student, Executive, and Admin Dashboards
 */
export const MediaUpload = ({
  currentImageUrl = '',
  currentPublicId = '',
  folder = CLOUDINARY_FOLDERS.GENERAL,
  publicId = '',
  tags = ['nacos'],
  label = 'Upload Image',
  helperText = 'JPG, PNG, or WebP up to 5MB',
  maxSizeBytes = 5 * 1024 * 1024,
  aspectRatio = 'square', // 'square', 'portrait', 'landscape', 'banner'
  previewPreset = 'thumbnail',
  onUploadSuccess,
  onDeleteSuccess,
  onError,
  className = '',
  disabled = false
}) => {
  const [preview, setPreview] = useState(currentImageUrl || '');
  const [activePublicId, setActivePublicId] = useState(currentPublicId || '');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (currentImageUrl) {
      setPreview(currentImageUrl);
    }
    if (currentPublicId) {
      setActivePublicId(currentPublicId);
    }
  }, [currentImageUrl, currentPublicId]);

  const aspectClasses = {
    square: 'aspect-square max-w-[180px]',
    portrait: 'aspect-[3/4] max-w-[200px]',
    landscape: 'aspect-[16/10] max-w-[320px]',
    banner: 'aspect-[21/9] max-w-[480px]'
  }[aspectRatio] || 'aspect-square max-w-[180px]';

  const clearStatus = (delay = 4000) => {
    setTimeout(() => {
      setStatusMessage(null);
    }, delay);
  };

  const handleFile = async (file) => {
    if (!file || disabled) return;

    setStatusMessage(null);
    setProgress(0);
    setIsUploading(true);

    // Immediate local preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    try {
      let result;
      if (activePublicId) {
        // Safe replacement: upload new -> verify -> delete old
        result = await replaceMedia(activePublicId, file, {
          folder,
          publicId: publicId || undefined,
          tags,
          maxSizeBytes,
          onProgress: (pct) => setProgress(pct)
        });
      } else {
        result = await uploadMedia(file, {
          folder,
          publicId: publicId || undefined,
          tags,
          maxSizeBytes,
          onProgress: (pct) => setProgress(pct)
        });
      }

      setIsUploading(false);

      if (result.success) {
        setActivePublicId(result.publicId);
        setPreview(result.secureUrl || result.url);
        setStatusMessage({ type: 'success', text: 'Media uploaded successfully!' });
        clearStatus();

        if (onUploadSuccess) {
          const finalUrl = result.secureUrl || result.url;
          const finalPublicId = result.publicId;
          onUploadSuccess({
            url: finalUrl,
            secure_url: finalUrl,
            secureUrl: finalUrl,
            publicId: finalPublicId,
            public_id: finalPublicId,
            format: result.format,
            bytes: result.bytes,
            width: result.width,
            height: result.height
          });
        }
      } else {
        setStatusMessage({ type: 'error', text: result.error || 'Upload failed. Please try again.' });
        if (onError) onError(result.error);
      }
    } catch (err) {
      setIsUploading(false);
      const errMsg = err.message || 'Network error during media upload.';
      setStatusMessage({ type: 'error', text: errMsg });
      if (onError) onError(errMsg);
    }
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = async (e) => {
    e.stopPropagation();
    if (disabled || isUploading) return;

    if (activePublicId) {
      try {
        await deleteMedia(activePublicId);
      } catch (err) {
        console.warn('Could not delete remote asset:', err);
      }
    }

    setPreview('');
    setActivePublicId('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setStatusMessage({ type: 'success', text: 'Media removed.' });
    clearStatus(2500);

    if (onDeleteSuccess) onDeleteSuccess();
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-gray-700 dark:text-green-200">
          {label}
        </label>
      )}

      {/* Upload Box / Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-all cursor-pointer ${
          isDragOver 
            ? 'border-[#138601] bg-[#138601]/10' 
            : 'border-gray-300 dark:border-[#138601]/40 hover:border-[#138601] bg-gray-50/70 dark:bg-[#041801]/60'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {preview ? (
          <div className="relative flex flex-col items-center group w-full">
            <div className={`relative overflow-hidden rounded-lg shadow-sm border border-gray-200 dark:border-[#138601]/30 w-full ${aspectClasses}`}>
              <img
                src={getOptimizedImageUrl(preview, { preset: previewPreset })}
                alt="Media preview"
                className="w-full h-full object-cover object-center"
              />

              {/* Hover overlay with Change & Remove actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                <button
                  type="button"
                  title="Replace Image"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="p-2 rounded-full bg-[#138601] hover:bg-[#0f6c01] text-white shadow transition-transform hover:scale-105"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Remove Image"
                  onClick={handleRemove}
                  className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white shadow transition-transform hover:scale-105"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-[11px] font-medium text-gray-500 dark:text-green-200/70">
                Click or drop to replace
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 px-2 space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#138601]/15 dark:bg-[#138601]/30 text-[#138601] dark:text-[#4bd043] flex items-center justify-center mx-auto">
              {isUploading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800 dark:text-white">
                Drop your image here, or <span className="text-[#138601] dark:text-[#4bd043] underline">browse</span>
              </p>
              <p className="text-[11px] text-gray-500 dark:text-green-200/70 mt-0.5">
                {helperText}
              </p>
            </div>
          </div>
        )}

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="w-full mt-3 space-y-1">
            <div className="flex justify-between text-[10px] font-medium text-gray-600 dark:text-green-200">
              <span>Uploading image...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 dark:bg-[#083002] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#138601] transition-all duration-200 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Feedback Messages */}
      {statusMessage && (
        <div
          className={`flex items-center gap-1.5 p-2 rounded text-xs font-medium ${
            statusMessage.type === 'success'
              ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/40'
              : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0 text-[#138601] dark:text-[#4bd043]" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
};

export default MediaUpload;
