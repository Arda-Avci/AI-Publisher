/**
 * SchedulePublishPanel - Social Media Post Scheduler Interface
 * Premium glassmorphism/cyberpunk design
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { Language, Platform } from '../types.js';

interface PublishSchedule {
  id: string;
  videoId: number;
  videoTitle: string;
  platforms: Platform[];
  scheduledTime: string;
  status: 'awaiting' | 'publishing' | 'published' | 'failed';
  errorMessage?: string;
  createdAt: string;
}

interface SchedulePublishPanelProps {
  language: Language;
  t: (key: string, params?: Record<string, unknown>) => string;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function SchedulePublishPanel({ language, t, onShowToast }: SchedulePublishPanelProps) {
  const [schedules, setSchedules] = useState<PublishSchedule[]>([]);
  const [availableVideos, setAvailableVideos] = useState<{ id: number; title: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Schedule Modal Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<number | ''>('');
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [targetPlatforms, setTargetPlatforms] = useState<Platform[]>(['youtube']);

  // Fetch publish schedules from backend
  const fetchSchedules = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await fetch('/api/v1/schedule-publish');
      const d = await r.json();
      if (Array.isArray(d)) {
        setSchedules(d);
      } else if (d.success && Array.isArray(d.schedules)) {
        setSchedules(d.schedules);
      }
    } catch (err) {
      console.error('Failed to fetch schedules:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch completed videos/jobs that can be scheduled
  const fetchAvailableVideos = useCallback(async () => {
    try {
      const r = await fetch('/api/v1/jobs');
      const d = await r.json();
      const list = Array.isArray(d) ? d : d.jobs || [];
      // Filter only completed jobs that have final_filename
      const completed = list
        .filter((j: any) => j.status === 'completed' || j.final_filename)
        .map((j: any) => ({
          id: j.id,
          title: j.yt_title || j.master_prompt.substring(0, 40) || `Project #${j.id}`,
        }));
      setAvailableVideos(completed);
      if (completed.length > 0) {
        setSelectedVideoId(completed[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch available videos:', err);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
    fetchAvailableVideos();
  }, [fetchSchedules, fetchAvailableVideos]);

  // Create new schedule publish task
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVideoId) {
      onShowToast?.(
        language === 'tr'
          ? 'Lütfen planlanacak bir video seçin.'
          : 'Please select a video to schedule.',
        'error',
      );
      return;
    }
    if (!scheduledDateTime) {
      onShowToast?.(
        language === 'tr'
          ? 'Lütfen bir yayınlama zamanı belirleyin.'
          : 'Please select a scheduled date and time.',
        'error',
      );
      return;
    }
    if (targetPlatforms.length === 0) {
      onShowToast?.(
        language === 'tr'
          ? 'En az bir platform seçmelisiniz.'
          : 'You must select at least one platform.',
        'error',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const r = await fetch('/api/v1/schedule-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: Number(selectedVideoId),
          platforms: targetPlatforms,
          scheduledTime: new Date(scheduledDateTime).toISOString(),
        }),
      });
      const d = await r.json();
      if (r.ok && (d.success || d.schedule)) {
        onShowToast?.(
          language === 'tr'
            ? 'Paylaşım görevi başarıyla zamanlandı.'
            : 'Post successfully scheduled.',
          'success',
        );
        setIsModalOpen(false);
        fetchSchedules();
      } else {
        onShowToast?.(d.error || 'Failed to create schedule', 'error');
      }
    } catch (err) {
      onShowToast?.(
        language === 'tr' ? 'İletişim hatası oluştu.' : 'Connection error occurred.',
        'error',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete/Cancel a schedule publish
  const handleDeleteSchedule = async (id: string) => {
    if (
      !confirm(
        language === 'tr'
          ? 'Bu paylaşım planını silmek istediğinize emin misiniz?'
          : 'Are you sure you want to delete this schedule?',
      )
    ) {
      return;
    }

    try {
      const r = await fetch(`/api/v1/schedule-publish/${id}`, {
        method: 'DELETE',
      });
      if (r.ok) {
        onShowToast?.(language === 'tr' ? 'Planlama silindi.' : 'Schedule deleted.', 'success');
        fetchSchedules();
      } else {
        onShowToast?.('Failed to delete', 'error');
      }
    } catch (err) {
      onShowToast?.('Error deleting schedule', 'error');
    }
  };

  const togglePlatform = (p: Platform) => {
    setTargetPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        gap: '12px',
        padding: '12px',
        background: 'rgba(10, 10, 20, 0.6)',
        borderRadius: '12px',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
        overflow: 'hidden',
      }}
    >
      {/* Üst Kısım: Başlık & Yeni Planlama Butonu */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px',
          background: 'rgba(139, 92, 246, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(139, 92, 246, 0.3)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#A78BFA' }}>
            📅{' '}
            {t('schedule_title') ||
              (language === 'tr' ? 'Sosyal Medya Yayın Planlayıcı' : 'Social Media Post Scheduler')}
          </h3>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
            {language === 'tr'
              ? 'Videolarınızı planlanan zamanlarda otomatik olarak YouTube, TikTok, X (Twitter) ve Facebook/Meta üzerinde yayınlayın.'
              : 'Automatically post your videos to YouTube, TikTok, X (Twitter), and Facebook/Meta at scheduled times.'}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            padding: '8px 16px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(99, 102, 241, 0.8))',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <span>➕</span> {language === 'tr' ? 'Yeni Paylaşım Planla' : 'Schedule New Post'}
        </button>
      </div>

      {/* Ana Liste */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                color: '#9CA3AF',
              }}
            >
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>
                {language === 'tr' ? 'Video Başlığı' : 'Video Title'}
              </th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>
                {language === 'tr' ? 'Platformlar' : 'Platforms'}
              </th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>
                {language === 'tr' ? 'Planlanan Zaman' : 'Scheduled Time'}
              </th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>
                {language === 'tr' ? 'Durum' : 'Status'}
              </th>
              <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>
                {language === 'tr' ? 'İşlemler' : 'Actions'}
              </th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((item) => (
              <tr
                key={item.id}
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <td style={{ padding: '12px 16px', fontWeight: 500, color: '#F3F4F6' }}>
                  {item.videoTitle}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {item.platforms.map((p) => (
                      <span
                        key={p}
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          fontWeight: 600,
                          background: 'rgba(139, 92, 246, 0.15)',
                          color: '#C4B5FD',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: '#D1D5DB' }}>
                  {new Date(item.scheduledTime).toLocaleString(
                    language === 'tr' ? 'tr-TR' : 'en-US',
                  )}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      background:
                        item.status === 'published'
                          ? 'rgba(16, 185, 129, 0.2)'
                          : item.status === 'failed'
                            ? 'rgba(239, 68, 68, 0.2)'
                            : item.status === 'publishing'
                              ? 'rgba(59, 130, 246, 0.2)'
                              : 'rgba(245, 158, 11, 0.2)',
                      color:
                        item.status === 'published'
                          ? '#34D399'
                          : item.status === 'failed'
                            ? '#F87171'
                            : item.status === 'publishing'
                              ? '#60A5FA'
                              : '#FBBF24',
                    }}
                  >
                    {item.status}
                  </span>
                  {item.errorMessage && (
                    <div style={{ fontSize: '9px', color: '#F87171', marginTop: '2px' }}>
                      {item.errorMessage}
                    </div>
                  )}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button
                    onClick={() => handleDeleteSchedule(item.id)}
                    style={{
                      padding: '4px 8px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid #EF4444',
                      borderRadius: '4px',
                      color: '#F87171',
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)')
                    }
                  >
                    {language === 'tr' ? 'İptal Et' : 'Cancel'}
                  </button>
                </td>
              </tr>
            ))}

            {schedules.length === 0 && !isLoading && (
              <tr>
                <td
                  colSpan={5}
                  style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}
                >
                  {language === 'tr'
                    ? 'Planlanmış yayın bulunmamaktadır.'
                    : 'No scheduled publications found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New Schedule Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(30, 30, 60, 0.95), rgba(15, 15, 35, 0.98))',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              width: '400px',
              boxShadow: '0 0 40px rgba(139, 92, 246, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 600, color: '#E5E7EB' }}
            >
              {language === 'tr' ? 'Yeni Paylaşım Planla' : 'Schedule New Post'}
            </h3>

            <form
              onSubmit={handleCreateSchedule}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              {/* Video Seçimi */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#D1D5DB', fontWeight: 600 }}>
                  {language === 'tr' ? 'Yayınlanacak Video' : 'Video to Publish'}
                </label>
                <select
                  value={selectedVideoId}
                  onChange={(e) => setSelectedVideoId(Number(e.target.value))}
                  required
                  style={{
                    padding: '8px 10px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '12px',
                    outline: 'none',
                    width: '100%',
                  }}
                >
                  {availableVideos.map((vid) => (
                    <option key={vid.id} value={vid.id}>
                      {vid.title}
                    </option>
                  ))}
                  {availableVideos.length === 0 && (
                    <option value="">
                      {language === 'tr'
                        ? 'Tamamlanmış video bulunamadı.'
                        : 'No completed videos found.'}
                    </option>
                  )}
                </select>
              </div>

              {/* Tarih Saat Seçici */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#D1D5DB', fontWeight: 600 }}>
                  {language === 'tr' ? 'Yayınlanma Tarihi ve Saati' : 'Publish Date & Time'}
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  required
                  style={{
                    padding: '8px 10px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '12px',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Platform Seçimi */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#D1D5DB', fontWeight: 600 }}>
                  {language === 'tr' ? 'Yayınlanacak Platformlar' : 'Target Platforms'}
                </label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                  {(['youtube', 'tiktok', 'x', 'meta'] as Platform[]).map((p) => {
                    const isSelected = targetPlatforms.includes(p);
                    return (
                      <label
                        key={p}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          color: '#E5E7EB',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePlatform(p)}
                          style={{
                            accentColor: '#8B5CF6',
                            cursor: 'pointer',
                          }}
                        />
                        <span
                          style={{
                            textTransform: 'uppercase',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                          }}
                        >
                          {p}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Alt Butonlar */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'flex-end',
                  marginTop: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#9CA3AF',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {language === 'tr' ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || availableVideos.length === 0}
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor:
                      isSubmitting || availableVideos.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting || availableVideos.length === 0 ? 0.5 : 1,
                  }}
                >
                  {isSubmitting
                    ? language === 'tr'
                      ? 'Planlanıyor...'
                      : 'Scheduling...'
                    : language === 'tr'
                      ? 'Planla'
                      : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
