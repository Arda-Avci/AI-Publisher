import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Download, Play, Loader, AlertCircle, Trash2, FolderOpen, Settings, Clock, CheckCircle, AlertTriangle, X } from 'lucide-react';

interface LoRAModel {
  id: string;
  name: string;
  base_model: string;
  status: 'ready' | 'training' | 'error' | 'pending';
  epochs_completed: number;
  total_epochs: number;
  created_at: string;
  file_size?: string;
  sample_count: number;
}

interface TrainingConfig {
  model_name: string;
  base_model: string;
  epochs: number;
  learning_rate: number;
  batch_size: number;
  resolution: number;
}

export function LoRAPanel({ language }: { language: 'tr' | 'en' }) {
  const isTr = language === 'tr';
  const [models, setModels] = useState<LoRAModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [training, setTraining] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<TrainingConfig>({
    model_name: '',
    base_model: 'stable-diffusion-xl-base-1.0',
    epochs: 10,
    learning_rate: 0.0001,
    batch_size: 4,
    resolution: 1024,
  });
  const [dragOver, setDragOver] = useState(false);
  const [, setUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = useCallback((tr: string, en: string) => isTr ? tr : en, [isTr]);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/lora/models');
      const data = await res.json();
      if (data.status === 'success') {
        setModels(data.data || []);
      } else {
        setError(data.error || t('Modeller yüklenemedi', 'Failed to load models'));
      }
    } catch (err: any) {
      setError(err.message || t('Bağlantı hatası', 'Connection error'));
    }
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addImages(files);
  };

  const addImages = (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setError(t('Yalnızca görsel dosyaları yükleyebilirsiniz', 'Only image files can be uploaded'));
      return;
    }
    setUploadedImages(prev => [...prev, ...imageFiles]);
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadPreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addImages(Array.from(e.dataTransfer.files));
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    setUploadPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const startTraining = async () => {
    if (!config.model_name.trim()) {
      setError(t('Model adı gerekli', 'Model name is required'));
      return;
    }
    if (uploadedImages.length < 5) {
      setError(t('En az 5 görsel gerekli', 'At least 5 images are required'));
      return;
    }

    setError('');
    setTraining(true);
    setTrainingLogs([]);

    try {
      const formData = new FormData();
      formData.append('config', JSON.stringify(config));
      uploadedImages.forEach((_img, _i) => {
        formData.append(`images`, img, img.name);
      });

      const res = await fetch('/api/v1/lora/train', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.status === 'success') {
        setTrainingLogs(data.logs || []);
        fetchModels();
        setUploadedImages([]);
        setUploadPreviews([]);
        setShowConfig(false);
      } else {
        setError(data.error || t('Eğitimin başlatılamadı', 'Failed to start training'));
      }
    } catch (err: any) {
      setError(err.message || t('Eğitimin başlatılamadı', 'Failed to start training'));
    }
    setTraining(false);
  };

  const downloadModel = async (modelId: string) => {
    try {
      const res = await fetch(`/api/v1/lora/models/${modelId}/download`);
      if (!res.ok) throw new Error(t('İndirme hatası', 'Download error'));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lora-${modelId}.safetensors`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || t('İndirme hatası', 'Download error'));
    }
  };

  const deleteModel = async (modelId: string) => {
    if (!confirm(t('Bu modeli silmek istediğinize emin misiniz?', 'Are you sure you want to delete this model?'))) return;
    try {
      await fetch(`/api/v1/lora/models/${modelId}`, { method: 'DELETE' });
      fetchModels();
    } catch (err: any) {
      setError(err.message || t('Silme hatası', 'Delete error'));
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'ready': return <CheckCircle size={14} color="hsl(142,60%,50%)" />;
      case 'training': return <Loader size={14} className="spin" color="hsl(38,90%,50%)" />;
      case 'error': return <AlertTriangle size={14} color="hsl(0,70%,50%)" />;
      default: return <Clock size={14} color="var(--text-muted)" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'ready': return { label: t('Hazır', 'Ready'), color: 'hsl(142,60%,50%)', bg: 'hsla(142,60%,50%,0.12)' };
      case 'training': return { label: t('Eğitiliyor', 'Training'), color: 'hsl(38,90%,50%)', bg: 'hsla(38,90%,50%,0.12)' };
      case 'error': return { label: t('Hata', 'Error'), color: 'hsl(0,70%,50%)', bg: 'hsla(0,70%,50%,0.12)' };
      default: return { label: t('Beklemede', 'Pending'), color: 'var(--text-muted)', bg: 'transparent' };
    }
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return d; }
  };

  const s: Record<string, React.CSSProperties> = {
    panel: {
      flex: 1,
      padding: '24px',
      overflowY: 'auto',
      position: 'relative',
      zIndex: 1,
      maxWidth: 960,
      margin: '0 auto',
    },
    card: {
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 24,
      marginBottom: 20,
    },
    label: {
      display: 'block',
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text-muted)',
      marginBottom: 6,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.04em',
    },
    input: {
      width: '100%',
      background: 'var(--bg-primary)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 13,
      color: 'var(--text-primary)',
      outline: 'none',
      fontFamily: 'var(--font-sans)',
      boxSizing: 'border-box' as const,
    },
    select: {
      background: 'var(--bg-primary)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 13,
      color: 'var(--text-primary)',
      outline: 'none',
      cursor: 'pointer',
    },
    btn: {
      padding: '10px 24px',
      borderRadius: 8,
      border: 'none',
      cursor: 'pointer',
      fontSize: 13,
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      transition: 'all 0.2s',
    },
    btnPrimary: {
      background: 'linear-gradient(135deg, #7F00FF, #FF007F)',
      color: 'white',
    },
    btnSecondary: {
      background: 'var(--bg-primary)',
      border: '1px solid var(--border)',
      color: 'var(--text-primary)',
    },
    btnDanger: {
      background: 'transparent',
      border: '1px solid hsla(0,70%,50%,0.3)',
      color: 'hsl(0,70%,60%)',
      padding: '6px 12px',
      fontSize: 11,
    },
    chip: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 10px',
      borderRadius: 6,
      fontSize: 11,
      background: 'hsla(var(--primary),0.08)',
      color: 'hsl(var(--primary))',
      border: '1px solid hsla(var(--primary),0.2)',
    },
    grid2: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16,
    },
    imageGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
      gap: 10,
    },
    imageItem: {
      position: 'relative' as const,
      borderRadius: 8,
      overflow: 'hidden',
      border: '1px solid var(--border)',
      aspectRatio: '1',
    },
  };

  return (
    <div style={s.panel} role="region" aria-label={t('LoRA Model Yönetimi', 'LoRA Model Management')}>
      {/* Header Card */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #7F00FF, #FF007F)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Settings size={16} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              {t('LoRA Model Yönetimi', 'LoRA Model Management')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {t('Özel LoRA modelleri eğitin ve yönetin', 'Train and manage custom LoRA models')}
            </div>
          </div>
        </div>

        {/* Training Section */}
        {!showConfig ? (
          <button
            style={{ ...s.btn, ...s.btnPrimary, width: '100%', justifyContent: 'center' }}
            onClick={() => setShowConfig(true)}
          >
            <Upload size={14} />
            {t('Yeni Model Eğitimi Başlat', 'Start New Model Training')}
          </button>
        ) : (
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 20, background: 'var(--bg-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {t('Yeni LoRA Modeli Eğit', 'Train New LoRA Model')}
              </div>
              <button
                style={{ ...s.btn, padding: '6px 12px', background: 'transparent', color: 'var(--text-muted)' }}
                onClick={() => setShowConfig(false)}
                aria-label={t('Kapat', 'Close')}
              >
                <X size={14} />
              </button>
            </div>

            <div style={s.grid2}>
              <div>
                <label style={s.label}>{t('MODEL ADI', 'MODEL NAME')}</label>
                <input
                  style={s.input}
                  value={config.model_name}
                  onChange={e => setConfig({ ...config, model_name: e.target.value })}
                  placeholder={t('Örn: kahraman-stili-v1', 'E.g: hero-style-v1')}
                />
              </div>
              <div>
                <label style={s.label}>{t('TEMEL MODEL', 'BASE MODEL')}</label>
                <select
                  style={{ ...s.select, width: '100%' }}
                  value={config.base_model}
                  onChange={e => setConfig({ ...config, base_model: e.target.value })}
                >
                  <option value="stable-diffusion-xl-base-1.0">SDXL 1.0</option>
                  <option value="stable-diffusion-2-1">SD 2.1</option>
                  <option value="stable-diffusion-v1-5">SD 1.5</option>
                </select>
              </div>
              <div>
                <label style={s.label}>{t('EPOCH SAYISI', 'EPOCHS')}</label>
                <input
                  style={s.input}
                  type="number"
                  min={1}
                  max={100}
                  value={config.epochs}
                  onChange={e => setConfig({ ...config, epochs: parseInt(e.target.value) || 10 })}
                />
              </div>
              <div>
                <label style={s.label}>{t('ÖĞRENME HIZI', 'LEARNING RATE')}</label>
                <input
                  style={s.input}
                  type="number"
                  step="0.00001"
                  value={config.learning_rate}
                  onChange={e => setConfig({ ...config, learning_rate: parseFloat(e.target.value) || 0.0001 })}
                />
              </div>
              <div>
                <label style={s.label}>{t('BATCH BOYUTU', 'BATCH SIZE')}</label>
                <input
                  style={s.input}
                  type="number"
                  min={1}
                  max={32}
                  value={config.batch_size}
                  onChange={e => setConfig({ ...config, batch_size: parseInt(e.target.value) || 4 })}
                />
              </div>
              <div>
                <label style={s.label}>{t('ÇÖZÜNÜRLÜK', 'RESOLUTION')}</label>
                <select
                  style={{ ...s.select, width: '100%' }}
                  value={config.resolution}
                  onChange={e => setConfig({ ...config, resolution: parseInt(e.target.value) })}
                >
                  <option value={512}>512x512</option>
                  <option value={768}>768x768</option>
                  <option value={1024}>1024x1024</option>
                </select>
              </div>
            </div>

            {/* Image Upload */}
            <div style={{ marginTop: 16 }}>
              <label style={s.label}>{t('EĞİTİM GÖRSELLERİ (EN AZ 5)', 'TRAINING IMAGES (MIN 5)')}</label>
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={e => { e.preventDefault(); setDragOver(false); }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: 24,
                  border: `2px dashed ${dragOver ? 'hsl(var(--primary))' : 'var(--border)'}`,
                  borderRadius: 8,
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragOver ? 'hsla(var(--primary),0.05)' : 'var(--bg-surface)',
                  transition: 'all 0.15s',
                }}
                role="button"
                aria-label={t('Görselleri sürükleyin veya tıklayın', 'Drag images or click to browse')}
              >
                <Upload size={20} style={{ color: 'var(--text-muted)', marginBottom: 6 }} />
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {t('Görselleri sürükleyin veya tıklayın', 'Drag & drop images or click to browse')}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
              </div>
            </div>

            {/* Image Previews */}
            {uploadPreviews.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                  {uploadPreviews.length} {t('görsel yüklendi', 'images uploaded')}
                </div>
                <div style={s.imageGrid}>
                  {uploadPreviews.map((preview, i) => (
                    <div key={i} style={s.imageItem}>
                      <img src={preview} alt={`${t('Yüklenen', 'Uploaded')} ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.7)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        aria-label={t('Görseli kaldır', 'Remove image')}
                      >
                        <X size={12} color="white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Start Training Button */}
            <button
              style={{ ...s.btn, ...s.btnPrimary, width: '100%', justifyContent: 'center', marginTop: 16 }}
              onClick={startTraining}
              disabled={training || uploadedImages.length < 5}
            >
              {training ? (
                <><Loader size={14} className="spin" /> {t('Eğitim Başlatılıyor...', 'Starting Training...')}</>
              ) : (
                <><Play size={14} /> {t('Eğitimi Başlat', 'Start Training')}</>
              )}
            </button>

            {/* Training Logs */}
            {trainingLogs.length > 0 && (
              <div style={{ marginTop: 12, maxHeight: 150, overflowY: 'auto', padding: 12, background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                {trainingLogs.map((log, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{ padding: '10px 14px', background: 'hsla(0,70%,50%,0.1)', border: '1px solid hsla(0,70%,50%,0.2)', borderRadius: 8, fontSize: 12, color: 'hsl(0,70%,60%)', marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}
            role="alert"
          >
            <AlertCircle size={14} />
            {error}
          </div>
        )}
      </div>

      {/* Models List */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            {t('Eğitilmiş Modeller', 'Trained Models')}
          </div>
          <button
            style={{ ...s.btn, ...s.btnSecondary, fontSize: 11, padding: '6px 12px' }}
            onClick={fetchModels}
            disabled={loading}
          >
            {loading ? <Loader size={12} className="spin" /> : <FolderOpen size={12} />}
            {t('Yenile', 'Refresh')}
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
            <Loader size={16} className="spin" />
          </div>
        ) : models.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            {t('Henüz model eğitimi yapılmadı.', 'No models trained yet.')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {models.map(model => {
              const isSelected = selectedModel === model.id;
              const sl = statusLabel(model.status);
              return (
                <div
                  key={model.id}
                  style={{
                    border: isSelected ? '2px solid hsl(var(--primary))' : '1px solid var(--border)',
                    borderRadius: 10,
                    overflow: 'hidden',
                    background: isSelected ? 'hsla(var(--primary),0.05)' : 'var(--bg-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onClick={() => setSelectedModel(isSelected ? null : model.id)}
                  role="button"
                  aria-expanded={isSelected}
                  aria-label={`${model.name} - ${sl.label}`}
                >
                  <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {statusIcon(model.status)}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {model.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {model.base_model} · {model.epochs_completed}/{model.total_epochs} epochs
                          {model.file_size && ` · ${model.file_size}`}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 10,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: sl.bg,
                        color: sl.color,
                      }}>
                        {sl.label}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {formatDate(model.created_at)}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      {model.status === 'ready' && (
                        <button
                          style={{ ...s.btn, ...s.btnSecondary, fontSize: 11, padding: '6px 12px' }}
                          onClick={(e) => { e.stopPropagation(); downloadModel(model.id); }}
                          aria-label={t('İndir', 'Download')}
                        >
                          <Download size={12} />
                          {t('İndir', 'Download')}
                        </button>
                      )}
                      <button
                        style={{ ...s.btn, ...s.btnDanger }}
                        onClick={(e) => { e.stopPropagation(); deleteModel(model.id); }}
                        aria-label={t('Sil', 'Delete')}
                      >
                        <Trash2 size={12} />
                        {t('Sil', 'Delete')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
