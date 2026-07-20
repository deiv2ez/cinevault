import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Download, Loader2, FileText, CheckCircle2, Key, Eye, EyeOff, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Papa from 'papaparse';
import ImportResultModal from '@/components/settings/ImportResultModal';
import PosterEnrichment from '@/components/settings/PosterEnrichment';
import DeduplicateLibrary from '@/components/settings/DeduplicateLibrary';



export default function Settings() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [tmdbKey, setTmdbKey] = useState(() => localStorage.getItem('tmdb_api_key') || '');
  const [showKey, setShowKey] = useState(false);
  const fileRef = useRef();
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ['media-items'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 1000),
  });

  const saveTmdbKey = () => {
    localStorage.setItem('tmdb_api_key', tmdbKey);
    toast.success('API Key guardada localmente');
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    const isXLSX = file.name.toLowerCase().match(/\.xlsx?$/);

    if (isXLSX) {
      // For XLSX: use AI extraction (PapaParse doesn't handle binary XLSX)
      handleXLSXImport(file);
      return;
    }

    // CSV: use PapaParse — robust, handles any delimiter, multiline fields, BOM
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      delimitersToGuess: [';', ',', '\t', '|'],
      complete: async (results) => {
        const { data: rows, errors: parseErrors } = results;
        const allErrors = [];
        let successCount = 0;
        const totalRows = rows.length;

        // Add PapaParse structural errors
        parseErrors.forEach(e => {
          allErrors.push({ row: (e.row || 0) + 2, field: null, message: `Error de parseo: ${e.message}`, value: e.code });
        });

        // Map each row explicitly from Spanish headers — row by row insertion
        for (let idx = 0; idx < rows.length; idx++) {
          const row = rows[idx];
          const rowNum = idx + 2;

          // Explicit Spanish → entity field mapping
          const rawTitle = row['Título'] || row['Titulo'] || row['title'] || row['TÍTULO'] || '';
          if (!rawTitle.trim()) {
            allErrors.push({ row: rowNum, field: 'Título', message: 'Fila sin título — omitida', value: '' });
            continue;
          }

          const rawYear = row['Año'] || row['Anio'] || row['year'] || row['AÑO'] || '';
          const parsedYear = rawYear ? parseInt(String(rawYear).replace(/[^\d]/g, '')) : null;
          if (rawYear && isNaN(parsedYear)) {
            allErrors.push({ row: rowNum, field: 'Año', message: `Esperaba un número pero recibió "${rawYear}"`, value: rawYear });
          }

          const rawNota = row['Nota'] || row['nota'] || row['rating'] || row['Puntuación'] || '';
          const parsedRating = rawNota ? parseFloat(String(rawNota).replace(',', '.')) : undefined;
          if (rawNota && isNaN(parsedRating)) {
            allErrors.push({ row: rowNum, field: 'Nota', message: `Nota inválida "${rawNota}" en fila ${rowNum}`, value: rawNota });
          }

          const rawStatus = row['Status'] || row['Estado'] || row['status'] || '';
          const status = rawStatus.trim() || 'Pendiente';

          const record = {
            title: rawTitle.trim(),
            year: (!isNaN(parsedYear) && parsedYear) ? parsedYear : undefined,
            rating: (!isNaN(parsedRating) && parsedRating != null) ? parsedRating : undefined,
            category: (row['Categoría'] || row['Categoria'] || row['category'] || '').trim() || undefined,
            director: (row['Director'] || row['director'] || '').trim() || undefined,
            genre1: (row['Género'] || row['Genero'] || row['genre1'] || row['Género 1'] || row['Genero 1'] || '').trim() || undefined,
            genre2: (row['Género 2'] || row['Genero 2'] || row['genre2'] || '').trim() || undefined,
            status,
            comments: (row['Comentarios'] || row['comments'] || '').trim() || undefined,
            highlight1: (row['Aspecto a destacar 1'] || row['highlight1'] || row['Destacado 1'] || '').trim() || undefined,
            highlight2: (row['Aspecto a destacar 2'] || row['highlight2'] || row['Destacado 2'] || '').trim() || undefined,
            highlight3: (row['Aspecto a destacar 3'] || row['highlight3'] || row['Destacado 3'] || '').trim() || undefined,
            favorite_quote: (row['Frase favorita'] || row['favorite_quote'] || row['Frase Favorita'] || '').trim() || undefined,
            watched_at: (row['Vista en'] || row['watched_at'] || row['Visto en'] || '').trim() || undefined,
            country: (row['País'] || row['Pais'] || row['country'] || '').trim() || undefined,
            synopsis: (row['Sinopsis'] || row['synopsis'] || '').trim() || undefined,
            poster_url: (row['poster_url'] || row['Poster'] || row['poster'] || '').trim() || undefined,
          };

          // Remove undefined keys
          Object.keys(record).forEach(k => record[k] === undefined && delete record[k]);

          try {
            await base44.entities.MediaItem.create(record);
            successCount++;
          } catch (err) {
            allErrors.push({
              row: rowNum,
              field: null,
              message: `Error al guardar "${rawTitle.trim()}": ${err?.message || 'error desconocido'}`,
              value: rawTitle.trim(),
            });
          }
        }

        queryClient.invalidateQueries({ queryKey: ['media-items'] });
        setImportResult({ successCount, errors: allErrors, totalRows });
        setShowResultModal(true);
        setImporting(false);
        if (fileRef.current) fileRef.current.value = '';
      },
      error: (err) => {
        toast.error('Error al leer el archivo: ' + err.message);
        setImporting(false);
        if (fileRef.current) fileRef.current.value = '';
      }
    });
  };

  const handleXLSXImport = async (file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' }, title_alt: { type: 'string' },
                year: { type: 'number' }, rating: { type: 'number' },
                category: { type: 'string' }, director: { type: 'string' },
                genre1: { type: 'string' }, genre2: { type: 'string' },
                status: { type: 'string' }, comments: { type: 'string' },
                highlight1: { type: 'string' }, highlight2: { type: 'string' }, highlight3: { type: 'string' },
                favorite_quote: { type: 'string' }, watched_at: { type: 'string' },
                country: { type: 'string' }, synopsis: { type: 'string' },
                poster_url: { type: 'string' }, overrated: { type: 'boolean' }, underrated: { type: 'boolean' },
              }
            }
          }
        }
      }
    });

    if (result.status === 'success' && result.output?.items) {
      const records = result.output.items.filter(i => i.title);
      for (let i = 0; i < records.length; i += 20) {
        await base44.entities.MediaItem.bulkCreate(records.slice(i, i + 20));
      }
      queryClient.invalidateQueries({ queryKey: ['media-items'] });
      setImportResult({ successCount: records.length, errors: [], totalRows: result.output.items.length });
    } else {
      setImportResult({ successCount: 0, errors: [{ row: 0, field: null, message: result.details || 'formato no reconocido', value: '' }], totalRows: 0 });
    }
    setShowResultModal(true);
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleExport = async () => {
    setExporting(true);
    const allItems = await base44.entities.MediaItem.list('-created_date', 2000);

    const headers = [
      'title', 'title_alt', 'year', 'rating', 'category', 'director',
      'genre1', 'genre2', 'status', 'comments', 'highlight1', 'highlight2',
      'highlight3', 'favorite_quote', 'watched_at', 'country', 'synopsis',
      'poster_url', 'overrated', 'underrated',
    ];

    const sep = ';';
    const csvRows = ['\uFEFF' + headers.join(sep)]; // BOM for Excel
    allItems.forEach(item => {
      const row = headers.map(h => {
        const val = item[h];
        if (val == null) return '';
        const str = String(val);
        return str.includes(sep) || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"` : str;
      });
      csvRows.push(row.join(sep));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cinevault_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
    toast.success(`${allItems.length} obras exportadas`);
  };

  return (
    <div className="p-6 lg:p-8 max-w-[800px] mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Ajustes</h1>
        <p className="text-sm text-muted-foreground mt-1">Importa, exporta y configura integraciones externas</p>
      </div>

      {/* TMDB API Key */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-500" />
            API Key de TMDB
          </CardTitle>
          <CardDescription>
            Necesaria para enriquecer pósters y consultar proveedores de streaming. Obtén tu clave gratuita en{' '}
            <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" className="text-primary underline">themoviedb.org</a>.
            Se guarda solo en tu navegador local.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="Introduce tu API Key de TMDB..."
                value={tmdbKey}
                onChange={e => setTmdbKey(e.target.value)}
                className="pr-10"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button variant="outline" onClick={saveTmdbKey}>Guardar</Button>
          </div>
        </CardContent>
      </Card>

      {/* Import */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Importar CSV / Excel
          </CardTitle>
          <CardDescription>
            Sube tu archivo .csv o .xlsx. Usa PapaParse para CSV (autodetecta ; o , y maneja reseñas multilínea).
            El sistema muestra un log detallado de errores fila a fila.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleImport} className="hidden" />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
              {importing
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
                : <><FileText className="w-4 h-4 mr-2" /> Seleccionar archivo</>}
            </Button>
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Columnas reconocidas (en español o inglés):</p>
              <p>título · año · nota · categoría · director · género 1/2 · estado · comentarios · destacado 1/2/3 · frase favorita · visto en · país · sinopsis · poster_url · sobrevalorada · infravalorada</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Poster enrichment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-chart-2" />
            Enriquecimiento de Pósters
          </CardTitle>
          <CardDescription>
            Busca y descarga automáticamente los pósters desde TMDB para todas las obras sin imagen.
            Rate limit: ~3 req/seg para no saturar la API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PosterEnrichment items={items} tmdbKey={tmdbKey} />
        </CardContent>
      </Card>

      {/* Deduplication */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Copy className="w-5 h-5 text-destructive" />
            Eliminar Duplicados
          </CardTitle>
          <CardDescription>
            Detecta obras con el mismo título, director y año. Conserva el registro más completo y elimina los sobrantes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeduplicateLibrary />
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Exportar Biblioteca
          </CardTitle>
          <CardDescription>
            Descarga toda tu biblioteca como CSV con separador ; y BOM UTF-8 (compatible con Excel español).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Exportando...</>
              : <><Download className="w-4 h-4 mr-2" /> Descargar CSV</>}
          </Button>
        </CardContent>
      </Card>

      {/* Import result modal */}
      <ImportResultModal
        open={showResultModal}
        onClose={() => setShowResultModal(false)}
        result={importResult}
      />
    </div>
  );
}