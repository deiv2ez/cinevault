import React, { useRef, useState } from 'react';
import { Share2, Download, X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import html2canvas from 'html2canvas';

export default function ShareCard({ item, open, onClose }) {
  const cardRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  if (!item) return null;

  const handleExport = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    const canvas = await html2canvas(cardRef.current, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
    });
    const link = document.createElement('a');
    link.download = `${item.title.replace(/\s+/g, '_')}_review.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setExporting(false);
  };

  const highlights = [item.highlight1, item.highlight2, item.highlight3].filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-transparent border-0 shadow-none">
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Preview */}
          <div
            ref={cardRef}
            className="relative w-full"
            style={{ fontFamily: 'Inter, sans-serif', background: '#0a0a0a' }}
          >
            {/* Background blurred poster */}
            {item.poster_url && (
              <div className="absolute inset-0">
                <img
                  src={item.poster_url}
                  alt=""
                  className="w-full h-full object-cover opacity-20"
                  style={{ filter: 'blur(20px)', transform: 'scale(1.1)' }}
                  crossOrigin="anonymous"
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.60) 100%)' }} />
              </div>
            )}

            <div className="relative p-8 flex gap-6 min-h-[280px]">
              {/* Poster */}
              {item.poster_url && (
                <img
                  src={item.poster_url}
                  alt={item.title}
                  className="w-28 flex-shrink-0 rounded-xl shadow-2xl object-cover"
                  style={{ aspectRatio: '2/3' }}
                  crossOrigin="anonymous"
                />
              )}

              <div className="flex-1 flex flex-col justify-between gap-4 py-1">
                {/* Title */}
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '6px' }}>
                    {item.category} · {item.year}
                  </p>
                  <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '800', lineHeight: '1.2', marginBottom: '4px' }}>
                    {item.title}
                  </h2>
                  {item.director && (
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>{item.director}</p>
                  )}
                </div>

                {/* Rating */}
                {item.rating != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '12px',
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span style={{ color: '#F59E0B', fontSize: '18px' }}>★</span>
                      <span style={{ color: 'white', fontSize: '24px', fontWeight: '800' }}>{item.rating.toFixed(1)}</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>/10</span>
                    </div>
                  </div>
                )}

                {/* Highlights */}
                {highlights.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {highlights.map(h => (
                      <span key={h} style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '999px',
                        padding: '3px 10px',
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.8)'
                      }}>
                        {h}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quote */}
            {item.favorite_quote && (
              <div style={{
                borderTop: '1px solid rgba(255,255,255,0.08)',
                padding: '20px 32px',
                background: 'rgba(255,255,255,0.03)'
              }}>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontStyle: 'italic', lineHeight: '1.6' }}>
                  "{item.favorite_quote}"
                </p>
              </div>
            )}

            {/* Footer */}
            <div style={{
              padding: '10px 32px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid rgba(255,255,255,0.06)'
            }}>
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase' }}>CineVault</span>
              {item.status && (
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px' }}>{item.status}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 flex justify-end gap-2 bg-card">
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4 mr-1.5" /> Cerrar
            </Button>
            <Button size="sm" onClick={handleExport} disabled={exporting}>
              <Download className="w-4 h-4 mr-1.5" />
              {exporting ? 'Exportando...' : 'Descargar imagen'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}