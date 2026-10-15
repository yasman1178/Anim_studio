'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  HardDrive,
  Trash2,
  Play,
  Pause,
  Download,
  FolderOpen,
  Film,
  Music,
  Mic,
  FileCode,
  X,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import {
  getAllMediaAssets,
  deleteMediaAsset,
  clearAllMediaAssets,
  getStorageStats,
  formatBytes,
  createAssetUrl,
  StoredMediaAsset,
  MediaType,
} from '@/lib/project-storage';

interface StorageManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVideoForProject?: (videoUrl: string, fileName: string) => void;
  onSelectAudioForProject?: (audioUrl: string, fileName: string) => void;
}

export default function StorageManager({
  isOpen,
  onClose,
  onSelectVideoForProject,
  onSelectAudioForProject,
}: StorageManagerProps) {
  const [assets, setAssets] = useState<StoredMediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ totalBytes: number; count: number; quotaBytes?: number }>({
    totalBytes: 0,
    count: 0,
  });
  const [filterType, setFilterType] = useState<'all' | MediaType>('all');
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Stop active preview
  const stopPreview = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewAssetId(null);
    setIsPlaying(false);
  }, [previewUrl]);

  // Load assets & stats
  const refreshStorage = useCallback(async () => {
    setLoading(true);
    try {
      const [allItems, allStats] = await Promise.all([
        getAllMediaAssets(),
        getStorageStats(),
      ]);
      setAssets(allItems);
      setStats({
        totalBytes: allStats.totalBytes,
        count: allStats.count,
        quotaBytes: allStats.quotaBytes,
      });
    } catch (err) {
      console.error('Failed to refresh storage:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;
    Promise.all([getAllMediaAssets(), getStorageStats()]).then(([allItems, allStats]) => {
      if (!isCancelled) {
        setAssets(allItems);
        setStats({
          totalBytes: allStats.totalBytes,
          count: allStats.count,
          quotaBytes: allStats.quotaBytes,
        });
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  // Listen to window event for real-time updates
  useEffect(() => {
    const handleStorageUpdate = () => {
      if (isOpen) {
        refreshStorage();
      }
    };
    window.addEventListener('animedub:storage_updated', handleStorageUpdate);
    return () => {
      window.removeEventListener('animedub:storage_updated', handleStorageUpdate);
    };
  }, [isOpen, refreshStorage]);

  // Start or toggle preview for an asset
  const handleTogglePreview = (asset: StoredMediaAsset) => {
    if (previewAssetId === asset.id) {
      // Toggle play/pause
      if (asset.type === 'full_video' && videoPreviewRef.current) {
        if (isPlaying) {
          videoPreviewRef.current.pause();
          setIsPlaying(false);
        } else {
          videoPreviewRef.current.play();
          setIsPlaying(true);
        }
      } else if (audioPreviewRef.current) {
        if (isPlaying) {
          audioPreviewRef.current.pause();
          setIsPlaying(false);
        } else {
          audioPreviewRef.current.play();
          setIsPlaying(true);
        }
      }
      return;
    }

    // New asset preview
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const newUrl = createAssetUrl(asset);
    setPreviewUrl(newUrl);
    setPreviewAssetId(asset.id);
    setIsPlaying(true);
  };

  // Delete an individual asset
  const handleDeleteItem = async (asset: StoredMediaAsset) => {
    if (previewAssetId === asset.id) {
      stopPreview();
    }
    await deleteMediaAsset(asset.id);
    setActionNotice(`تم حذف «${asset.name}» وتحرير ${formatBytes(asset.size)}`);
    setTimeout(() => setActionNotice(null), 3000);
    await refreshStorage();
  };

  // Clear all assets
  const handleClearAll = async () => {
    stopPreview();
    await clearAllMediaAssets();
    setShowClearConfirm(false);
    setActionNotice('تم تفريغ ذاكرة الموقع بالكامل بنجاح!');
    setTimeout(() => setActionNotice(null), 3000);
    await refreshStorage();
  };

  // Load asset into active project
  const handleLoadIntoProject = (asset: StoredMediaAsset) => {
    const url = createAssetUrl(asset);
    if (asset.type === 'full_video') {
      if (onSelectVideoForProject) {
        onSelectVideoForProject(url, asset.name);
        setActionNotice(`تم تفعيل فيديو «${asset.name}» في ساحة العمل!`);
        setTimeout(() => setActionNotice(null), 3000);
        onClose();
      }
    } else if (onSelectAudioForProject) {
      onSelectAudioForProject(url, asset.name);
      setActionNotice(`تم تفعيل مسار الصوت «${asset.name}» في المشروع!`);
      setTimeout(() => setActionNotice(null), 3000);
      onClose();
    }
  };

  // Download stored asset to user computer
  const handleDownloadAsset = (asset: StoredMediaAsset) => {
    const url = createAssetUrl(asset);
    const a = document.createElement('a');
    a.href = url;
    a.download = asset.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Filtered items
  const filteredAssets = assets.filter((item) => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  const getAssetIcon = (type: MediaType) => {
    switch (type) {
      case 'full_video':
        return <Film className="w-4 h-4 text-rose-400" />;
      case 'isolated_vocal':
        return <Mic className="w-4 h-4 text-emerald-400" />;
      case 'isolated_instrumental':
        return <Music className="w-4 h-4 text-cyan-400" />;
      case 'tts_audio':
        return <Mic className="w-4 h-4 text-amber-400" />;
      case 'project_json':
        return <FileCode className="w-4 h-4 text-purple-400" />;
      default:
        return <HardDrive className="w-4 h-4 text-slate-400" />;
    }
  };

  const getAssetTypeLabel = (type: MediaType) => {
    switch (type) {
      case 'full_video':
        return 'فيديو كامل';
      case 'isolated_vocal':
        return 'صوت كلام أصلي';
      case 'isolated_instrumental':
        return 'موسيقى معزولة';
      case 'tts_audio':
        return 'دبلجة مصرية';
      case 'project_json':
        return 'ملف مشروع JSON';
      default:
        return 'ملف';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg sm:max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-blue-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <HardDrive className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white">ذاكرة الموقع وإدارة الملفات</h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3 h-3" /> IndexedDB
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                تخزين كامل ملفات الفيديو ومسارات الصوت محلياً على جهازك
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={refreshStorage}
              disabled={loading}
              title="تحديث القائمة"
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                stopPreview();
                onClose();
              }}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Notice */}
        {actionNotice && (
          <div className="px-3 sm:px-6 py-2 bg-rose-500/10 border-b border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Storage Stats Bar */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-3 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs">
            <div>
              <span className="text-slate-400">المساحة: </span>
              <span className="font-mono font-bold text-white text-xs sm:text-sm">{formatBytes(stats.totalBytes)}</span>
            </div>
            <span className="text-slate-600">·</span>
            <div>
              <span className="text-slate-400">الملفات: </span>
              <span className="font-mono font-bold text-cyan-400">{stats.count}</span>
            </div>
            {stats.quotaBytes && (
              <>
                <span className="text-slate-600">·</span>
                <div>
                  <span className="text-slate-400">سعة المتصفح المتاحة: </span>
                  <span className="font-mono text-slate-300">{formatBytes(stats.quotaBytes)}</span>
                </div>
              </>
            )}
          </div>

          {/* Clear All Trigger */}
          {assets.length > 0 && (
            <div>
              {!showClearConfirm ? (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-800/40 rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>تفريغ الذاكرة بالكامل ({formatBytes(stats.totalBytes)})</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-rose-950/80 border border-rose-600/50 p-1.5 rounded-lg">
                  <span className="text-[11px] text-rose-200">متأكد من مسح كافة الملفات؟</span>
                  <button
                    onClick={handleClearAll}
                    className="px-2.5 py-1 text-[11px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded transition"
                  >
                    نعم، احذف الكل
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-2 py-1 text-[11px] text-slate-300 hover:text-white rounded transition"
                  >
                    إلغاء
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filter Navigation */}
        <div className="px-6 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: 'all', label: 'كافة الملفات', count: assets.length },
            { id: 'full_video', label: 'فيديوهات كاملة', count: assets.filter((a) => a.type === 'full_video').length },
            { id: 'isolated_instrumental', label: 'موسيقى معزولة', count: assets.filter((a) => a.type === 'isolated_instrumental').length },
            { id: 'isolated_vocal', label: 'أصوات مفصولة', count: assets.filter((a) => a.type === 'isolated_vocal').length },
            { id: 'tts_audio', label: 'دبلجة مصرية', count: assets.filter((a) => a.type === 'tts_audio').length },
            { id: 'project_json', label: 'مشاريع JSON', count: assets.filter((a) => a.type === 'project_json').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as 'all' | MediaType)}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition whitespace-nowrap ${
                filterType === tab.id
                  ? 'bg-rose-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${filterType === tab.id ? 'bg-rose-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Stored Files Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-[300px]">
          {filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-500">
                <FolderOpen className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-300">لا توجد ملفات مخزنة في هذا القسم</p>
                <p className="text-xs text-slate-500 max-w-sm">
                  بمجرد رفع فيديو كامل من التبويب الأول أو إجراء عملية فصل الصوت وتوليد الدبلجة، سيتم حفظ النسخ الأصلية تلقائياً هنا في ذاكرة المتصفح.
                </p>
              </div>
            </div>
          ) : (
            filteredAssets.map((asset) => {
              const isCurrentlyPreviewed = previewAssetId === asset.id;
              return (
                <div
                  key={asset.id}
                  className={`p-3.5 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isCurrentlyPreviewed
                      ? 'bg-slate-800/90 border-rose-500/50 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* File Info */}
                  <div className="flex items-start md:items-center gap-3 flex-1 min-w-0">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                      {getAssetIcon(asset.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-white truncate max-w-[280px]" title={asset.name}>
                          {asset.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                          {getAssetTypeLabel(asset.type)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                        <span className="font-mono text-cyan-400 font-medium">{formatBytes(asset.size)}</span>
                        <span className="text-slate-600">·</span>
                        <span>{new Date(asset.createdAt).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                        {asset.metadata?.duration && (
                          <>
                            <span className="text-slate-600">·</span>
                            <span className="font-mono text-amber-400">{asset.metadata.duration.toFixed(1)} ثانية</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Inline Audio/Video Preview Player */}
                  {isCurrentlyPreviewed && previewUrl && (
                    <div className="w-full md:w-64 bg-slate-900 p-2 rounded-lg border border-slate-700 flex items-center justify-center shrink-0">
                      {asset.type === 'full_video' ? (
                        <video
                          ref={videoPreviewRef}
                          src={previewUrl}
                          controls
                          autoPlay
                          className="w-full max-h-24 rounded bg-black object-contain"
                          onEnded={() => setIsPlaying(false)}
                        />
                      ) : (
                        <audio
                          ref={audioPreviewRef}
                          src={previewUrl}
                          controls
                          autoPlay
                          className="w-full h-8"
                          onEnded={() => setIsPlaying(false)}
                        />
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                    {/* Preview Toggle */}
                    <button
                      onClick={() => handleTogglePreview(asset)}
                      title={isCurrentlyPreviewed ? 'إيقاف المعاينة' : 'تشغيل معاينة'}
                      className={`p-2 rounded-lg border text-xs flex items-center gap-1 transition ${
                        isCurrentlyPreviewed
                          ? 'bg-rose-600 border-rose-500 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {isCurrentlyPreviewed && isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{isCurrentlyPreviewed ? 'إيقاف' : 'معاينة'}</span>
                    </button>

                    {/* Load into project */}
                    {(asset.type === 'full_video' || asset.type === 'isolated_instrumental' || asset.type === 'isolated_vocal') && (
                      <button
                        onClick={() => handleLoadIntoProject(asset)}
                        title="تفعيل هذا الملف في ساحة العمل الحالية"
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 hover:text-white text-xs flex items-center gap-1 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">تحميل للمشروع</span>
                      </button>
                    )}

                    {/* Download */}
                    <button
                      onClick={() => handleDownloadAsset(asset)}
                      title="تنزيل الملف إلى جهازك"
                      className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteItem(asset)}
                      title="حذف هذا الملف من الذاكرة"
                      className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>الذاكرة محلية 100% داخل المتصفح، لا يتم رفع أي بايت لأي جهة خارجية.</span>
          </div>
          <button
            onClick={() => {
              stopPreview();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition text-xs font-medium"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
