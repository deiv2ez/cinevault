import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Save, Film } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const CATEGORIES = ['Película', 'Serie', 'Documental', 'Libro', 'Cortometraje', 'Anime', 'Otro'];
const STATUSES = ['Visto', 'Visto muchas veces', 'Pendiente', 'Abandono', 'Favorito', 'En progreso'];
const GENRES = [
  'Acción', 'Animación', 'Aventura', 'Bélico', 'Biografía', 'Ciencia Ficción', 'Comedia',
  'Crimen', 'Documental', 'Drama', 'Familia', 'Fantasía', 'Historia', 'Misterio',
  'Musical', 'Romance', 'Suspense', 'Terror', 'Thriller', 'Western'
];
const HIGHLIGHTS = [
  // Estándar analítico
  'Atmósfera', 'Actuación', 'Banda sonora', 'Cinematografía', 'Diálogos', 'Dirección',
  'Efectos visuales', 'Guión', 'Originalidad', 'Personajes', 'Ritmo', 'Trama',
  // Legados personalizados (retrocompatibilidad CSV)
  'Girito final', 'Fotografía', 'Villano', 'Montaje', 'Escenografía', 'Efectos especiales',
  'Desarrollo de personajes', 'Mensaje', 'Humor', 'Emocional',
  'Lucha de clases', 'Doble lectura niño-adulto',
];

export default function MediaForm({ data, setData, onSubmit, isEdit, saving }) {
  const update = (key, value) => setData(prev => ({ ...prev, [key]: value }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(); }} className="space-y-6">
      <div className="flex gap-6">
        {/* Poster preview */}
        <div className="w-40 flex-shrink-0">
          <div className="aspect-[2/3] bg-muted rounded-xl overflow-hidden border border-border">
            {data.poster_url ? (
              <img src={data.poster_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Film className="w-10 h-10 text-muted-foreground/20" />
              </div>
            )}
          </div>
          <Input
            placeholder="URL del poster"
            value={data.poster_url || ''}
            onChange={e => update('poster_url', e.target.value)}
            className="mt-2 text-xs"
          />
        </div>

        {/* Main fields */}
        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Título Original</Label>
              <Input value={data.title || ''} onChange={e => update('title', e.target.value)} required />
            </div>
            <div>
              <Label className="text-xs">Título Alternativo</Label>
              <Input value={data.title_alt || ''} onChange={e => update('title_alt', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Año</Label>
              <Input
                type="number"
                value={data.year || ''}
                onChange={e => update('year', parseInt(e.target.value) || null)}
                className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                placeholder="ej. 1994"
              />
            </div>
            <div>
              <Label className="text-xs">Categoría</Label>
              <Select value={data.category || ''} onValueChange={v => update('category', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={data.status || ''} onValueChange={v => update('status', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Director</Label>
              <Input value={data.director || ''} onChange={e => update('director', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">País</Label>
              <Input value={data.country || ''} onChange={e => update('country', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Género 1</Label>
              <Select value={data.genre1 || ''} onValueChange={v => update('genre1', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Género 2</Label>
              <Select value={data.genre2 || ''} onValueChange={v => update('genre2', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Rating */}
      <div>
        <Label className="text-xs">Nota: {data.rating != null ? data.rating.toFixed(1) : '—'}</Label>
        <Slider
          value={[data.rating ?? 5]}
          onValueChange={([v]) => update('rating', v)}
          min={0}
          max={10}
          step={0.1}
          className="mt-2"
        />
      </div>

      {/* Vista en */}
      <div>
        <Label className="text-xs">Vista en (ej: 2020, Cine, Con amigos)</Label>
        <Input value={data.watched_at || ''} onChange={e => update('watched_at', e.target.value)} />
      </div>

      {/* Synopsis */}
      <div>
        <Label className="text-xs">Sinopsis</Label>
        <Textarea value={data.synopsis || ''} onChange={e => update('synopsis', e.target.value)} rows={3} />
      </div>

      {/* Comments */}
      <div>
        <Label className="text-xs">Comentarios / Mi Reseña</Label>
        <Textarea value={data.comments || ''} onChange={e => update('comments', e.target.value)} rows={4} />
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(n => {
          const currentVal = data[`highlight${n}`] || '';
          // If the saved value isn't in the list, add it so it renders correctly
          const options = currentVal && !HIGHLIGHTS.includes(currentVal)
            ? [currentVal, ...HIGHLIGHTS]
            : HIGHLIGHTS;
          return (
            <div key={n}>
              <Label className="text-xs">Aspecto a destacar {n}</Label>
              <Select value={currentVal} onValueChange={v => update(`highlight${n}`, v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {options.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>

      {/* Favorite Quote */}
      <div>
        <Label className="text-xs">Frase Favorita</Label>
        <Textarea value={data.favorite_quote || ''} onChange={e => update('favorite_quote', e.target.value)} rows={2} />
      </div>

      {/* Over/Underrated */}
      <div className="flex gap-8">
        <div className="flex items-center gap-2">
          <Switch checked={data.overrated || false} onCheckedChange={v => update('overrated', v)} />
          <Label className="text-xs">Sobrevalorada</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={data.underrated || false} onCheckedChange={v => update('underrated', v)} />
          <Label className="text-xs">Infravalorada</Label>
        </div>
      </div>

      <Button type="submit" disabled={saving} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        {saving ? 'Guardando...' : isEdit ? 'Actualizar Obra' : 'Guardar Obra'}
      </Button>
    </form>
  );
}