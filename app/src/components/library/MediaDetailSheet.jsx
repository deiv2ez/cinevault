import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Film, Quote, Pencil, Trash2, MapPin, Calendar, Share2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import ShareCard from '@/components/library/ShareCard';

export default function MediaDetailSheet({ item, open, onClose }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showShare, setShowShare] = useState(false);

  if (!item) return null;

  const handleDelete = async () => {
    await base44.entities.MediaItem.delete(item.id);
    queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey?.[0] === 'string' && q.queryKey[0].startsWith('media-items') });
    onClose();
  };

  return (
    <>
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Poster header */}
        {item.poster_url ? (
          <div className="relative h-72 overflow-hidden">
            <img src={item.poster_url} alt={item.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
            <div className="absolute bottom-4 left-5 right-5">
              <h2 className="text-xl font-bold text-foreground">{item.title}</h2>
              {item.title_alt && <p className="text-sm text-muted-foreground">{item.title_alt}</p>}
            </div>
          </div>
        ) : (
          <SheetHeader className="p-5 pb-0">
            <SheetTitle className="text-xl">{item.title}</SheetTitle>
          </SheetHeader>
        )}

        <div className="p-5 space-y-5">
          {/* Meta row */}
          <div className="flex items-center gap-3 flex-wrap">
            {item.rating != null && (
              <div className="flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="font-bold">{item.rating.toFixed(1)}</span>
              </div>
            )}
            {item.year && <Badge variant="outline">{item.year}</Badge>}
            {item.category && <Badge variant="secondary">{item.category}</Badge>}
            {item.status && <Badge variant="outline" className="border-primary/30 text-primary">{item.status}</Badge>}
          </div>

          {/* Director & Country */}
          <div className="space-y-1.5">
            {item.director && (
              <p className="text-sm"><span className="text-muted-foreground">Director:</span> <span className="font-medium">{item.director}</span></p>
            )}
            {item.country && (
              <p className="text-sm flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                {item.country}
              </p>
            )}
            {item.watched_at && (
              <p className="text-sm flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                Vista en: {item.watched_at}
              </p>
            )}
          </div>

          {/* Genres */}
          {(item.genre1 || item.genre2) && (
            <div className="flex gap-2">
              {item.genre1 && <Badge variant="outline">{item.genre1}</Badge>}
              {item.genre2 && <Badge variant="outline">{item.genre2}</Badge>}
            </div>
          )}

          {/* Synopsis */}
          {item.synopsis && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Sinopsis</h4>
              <p className="text-sm text-foreground/90 leading-relaxed">{item.synopsis}</p>
            </div>
          )}

          {/* Comments */}
          {item.comments && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Mi Reseña</h4>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{item.comments}</p>
            </div>
          )}

          {/* Highlights */}
          {(item.highlight1 || item.highlight2 || item.highlight3) && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Aspectos Destacados</h4>
              <div className="flex gap-2 flex-wrap">
                {[item.highlight1, item.highlight2, item.highlight3].filter(Boolean).map(h => (
                  <Badge key={h} className="bg-primary/10 text-primary border-0">{h}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Favorite Quote */}
          {item.favorite_quote && (
            <div className="bg-muted/50 rounded-lg p-4 border-l-2 border-primary">
              <Quote className="w-4 h-4 text-primary mb-1" />
              <p className="text-sm italic text-foreground/80">"{item.favorite_quote}"</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                navigate(`/add?edit=${item.id}`);
              }}
            >
              <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShare(true)}
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5" /> Compartir
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar esta obra?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminará "{item.title}" de tu biblioteca permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SheetContent>
    </Sheet>
    <ShareCard item={item} open={showShare} onClose={() => setShowShare(false)} />
    </>
  );
}