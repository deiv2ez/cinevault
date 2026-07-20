import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import TmdbSearch from '@/components/add/TmdbSearch';
import MediaForm from '@/components/add/MediaForm';

const emptyForm = {
  title: '', title_alt: '', year: null, rating: 5, category: '', director: '',
  genre1: '', genre2: '', status: '', comments: '', highlight1: '', highlight2: '',
  highlight3: '', favorite_quote: '', watched_at: '', country: '', synopsis: '',
  poster_url: '', tmdb_id: '', overrated: false, underrated: false
};

export default function AddNew() {
  const [data, setData] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('edit');
    if (id) {
      setIsEdit(true);
      setEditId(id);
      base44.entities.MediaItem.list().then(items => {
        const item = items.find(i => i.id === id);
        if (item) {
          const cleaned = {};
          Object.keys(emptyForm).forEach(key => {
            cleaned[key] = item[key] ?? emptyForm[key];
          });
          setData(cleaned);
        }
      });
    }
  }, []);

  const handleTmdbSelect = (result) => {
    setData(prev => ({
      ...prev,
      title: result.title || prev.title,
      year: result.year || prev.year,
      director: result.director || prev.director,
      genre1: result.genre1 || prev.genre1,
      genre2: result.genre2 || prev.genre2,
      country: result.country || prev.country,
      synopsis: result.synopsis || prev.synopsis,
      poster_url: result.poster_url || prev.poster_url,
      tmdb_id: result.tmdb_id || prev.tmdb_id,
    }));
  };

  const handleSubmit = async () => {
    if (!data.title.trim()) return;
    setSaving(true);
    const payload = { ...data };
    // Clean empty strings to null
    Object.keys(payload).forEach(k => {
      if (payload[k] === '') payload[k] = undefined;
    });

    if (isEdit && editId) {
      await base44.entities.MediaItem.update(editId, payload);
      toast.success('Obra actualizada');
    } else {
      await base44.entities.MediaItem.create(payload);
      toast.success('Obra añadida a tu biblioteca');
    }
    queryClient.invalidateQueries({ queryKey: ['media-items'] });
    setSaving(false);
    if (!isEdit) setData({ ...emptyForm });
    else navigate('/library');
  };

  return (
    <div className="p-6 lg:p-8 max-w-[900px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {isEdit ? 'Editar Obra' : 'Añadir Nueva Obra'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEdit ? 'Modifica los datos de esta obra' : 'Busca en TMDB o rellena manualmente'}
        </p>
      </div>

      {/* TMDB Search */}
      {!isEdit && (
        <div className="mb-8 p-5 bg-card rounded-xl border border-border">
          <h2 className="text-sm font-semibold text-foreground mb-3">Búsqueda Automática</h2>
          <TmdbSearch onSelect={handleTmdbSelect} />
        </div>
      )}

      {/* Form */}
      <div className="bg-card rounded-xl border border-border p-6">
        <MediaForm
          data={data}
          setData={setData}
          onSubmit={handleSubmit}
          isEdit={isEdit}
          saving={saving}
        />
      </div>
    </div>
  );
}