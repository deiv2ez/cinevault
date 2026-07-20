import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function ImportResultModal({ open, onClose, result }) {
  const [showErrors, setShowErrors] = useState(false);

  if (!result) return null;

  const { successCount, errors, totalRows } = result;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {errors.length === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-primary" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            )}
            Resultados de la Importación
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{totalRows}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Filas leídas</p>
            </div>
            <div className="bg-primary/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-primary">{successCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Importadas</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${errors.length > 0 ? 'bg-amber-500/10' : 'bg-muted/50'}`}>
              <p className={`text-2xl font-bold ${errors.length > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                {errors.length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Errores</p>
            </div>
          </div>

          {/* Success message */}
          {successCount > 0 && (
            <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">{successCount} obras</span> importadas correctamente en tu biblioteca.
              </p>
            </div>
          )}

          {/* Error log */}
          {errors.length > 0 && (
            <div>
              <button
                onClick={() => setShowErrors(!showErrors)}
                className="flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
              >
                {showErrors ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Ver log de errores ({errors.length} filas con problemas)
              </button>

              {showErrors && (
                <div className="mt-2 max-h-52 overflow-y-auto space-y-1.5 pr-1">
                  {errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-2.5 bg-muted/40 rounded-lg border border-border">
                      <Badge variant="outline" className="text-[10px] flex-shrink-0 mt-0.5">
                        Fila {err.row}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-xs text-foreground font-medium">{err.field ? `Campo "${err.field}"` : 'Error general'}</p>
                        <p className="text-xs text-muted-foreground">{err.message}</p>
                        {err.value && (
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                            Valor recibido: <code className="bg-muted px-1 rounded">{String(err.value).slice(0, 60)}</code>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button onClick={onClose} className="w-full">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}