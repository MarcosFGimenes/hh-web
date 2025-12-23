"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Toast } from '@/components/Toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import type { ServiceOrder } from '@/types/os';

type OrderWithEdit = ServiceOrder;
type ParsedOrder = {
  osCode: string;
  tag: string;
  machineName: string;
  description: string;
};

type TesseractGlobal = {
  recognize: (
    image: File | string,
    lang: string,
    options?: { tessedit_pageseg_mode?: string }
  ) => Promise<{ data: { text: string } }>;
};

export default function FolderServiceOrdersPage() {
  const params = useParams<{ folderId: string }>();
  const folderId = params.folderId;
  const { idToken } = useAdminAuth();

  const [orders, setOrders] = useState<OrderWithEdit[]>([]);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState({
    osCode: '',
    tag: '',
    machineName: '',
    description: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState({
    osCode: '',
    tag: '',
    machineName: '',
    description: '',
  });
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [parsedOrders, setParsedOrders] = useState<ParsedOrder[]>([]);
  const [importingOcr, setImportingOcr] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const tesseractPromiseRef = useRef<Promise<TesseractGlobal> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const adminFetch = async (input: string, init?: RequestInit) => {
    if (!idToken) throw new Error('Token do administrador indisponível.');
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${idToken}`);
    headers.set('Content-Type', 'application/json');
    return fetch(input, { ...init, headers });
  };

  const loadOrders = async () => {
    if (!idToken || !folderId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await adminFetch(`/api/admin/folders/${folderId}/os`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao listar O.S.');
      setOrders(data.orders);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro inesperado ao carregar O.S.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idToken, folderId]);

  useEffect(() => {
    if (error || success || importError || importSuccess) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
        setImportError(null);
        setImportSuccess(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [error, success, importError, importSuccess]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((order) =>
      [order.osCode, order.tag, order.machineName, order.description].some((field) =>
        field.toLowerCase().includes(term)
      )
    );
  }, [orders, search]);

  const updateCreating = (key: keyof typeof creating, value: string) => {
    setCreating((prev) => ({ ...prev, [key]: value }));
  };

  const updateEditing = (key: keyof typeof editing, value: string) => {
    setEditing((prev) => ({ ...prev, [key]: value }));
  };

  const validateOrderPayload = (payload: typeof creating) =>
    payload.osCode.trim() && payload.tag.trim() && payload.machineName.trim() && payload.description.trim();

  const loadTesseract = async () => {
    if (typeof window === 'undefined') throw new Error('Ambiente inválido para OCR.');
    if (!tesseractPromiseRef.current) {
      tesseractPromiseRef.current = new Promise<TesseractGlobal>((resolve, reject) => {
        const existing = (window as unknown as { Tesseract?: TesseractGlobal }).Tesseract;
        if (existing) {
          resolve(existing);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
        script.async = true;
        script.onload = () => {
          const tesseract = (window as unknown as { Tesseract?: TesseractGlobal }).Tesseract;
          if (tesseract) resolve(tesseract);
          else reject(new Error('Biblioteca Tesseract não disponível.'));
        };
        script.onerror = () => reject(new Error('Falha ao carregar Tesseract.js.'));
        document.body.appendChild(script);
      });
    }
    return tesseractPromiseRef.current;
  };

  const parseLinesToOrders = (text: string): ParsedOrder[] => {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[\t;|]| {2,}/).map((part) => part.trim()).filter(Boolean);
        if (parts.length >= 3) {
          const [osCode, tag, machineName, ...rest] = parts;
          const description = rest.length ? rest.join(' ') : '';
          return {
            osCode: osCode || '',
            tag: tag || '',
            machineName: machineName || '',
            description: description || line,
          };
        }
        return { osCode: '', tag: '', machineName: '', description: line };
      });
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateOrderPayload(creating)) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      const response = await adminFetch(`/api/admin/folders/${folderId}/os`, {
        method: 'POST',
        body: JSON.stringify(creating),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao criar O.S.');
      setOrders((prev) => [data.order, ...prev]);
      setCreating({ osCode: '', tag: '', machineName: '', description: '' });
      setSuccess('O.S. criada com sucesso.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar O.S.';
      setError(message);
    }
  };

  const handleImportFile = async (file: File) => {
    setImportingOcr(true);
    setImportError(null);
    setOcrProgress('Processando imagem...');
    setParsedOrders([]);
    setOcrText('');
    try {
      const tesseract = await loadTesseract();
      setOcrProgress('Lendo texto (OCR)...');
      const result = await tesseract.recognize(file, 'por+eng');
      const text = result?.data?.text || '';
      setOcrText(text);
      const parsed = parseLinesToOrders(text);
      if (!parsed.length) {
        setImportError('Nenhuma linha identificada na imagem. Verifique a nitidez ou refaça a foto.');
      }
      setParsedOrders(parsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao executar OCR. Tente novamente.';
      setImportError(message);
    } finally {
      setImportingOcr(false);
      setOcrProgress(null);
    }
  };

  const handleBulkImport = async () => {
    if (!parsedOrders.length) {
      setImportError('Nada para importar. Realize o OCR primeiro.');
      return;
    }

    const hasMissing = parsedOrders.some(
      (order) => !order.osCode.trim() || !order.tag.trim() || !order.machineName.trim() || !order.description.trim()
    );
    if (hasMissing) {
      setImportError('Preencha código, TAG, equipamento e descrição em todas as linhas antes de importar.');
      return;
    }

    setImporting(true);
    setImportError(null);
    try {
      const response = await adminFetch(`/api/admin/folders/${folderId}/os/bulk`, {
        method: 'POST',
        body: JSON.stringify({ orders: parsedOrders }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao importar O.S.');

      setOrders(data.orders || []);
      setParsedOrders([]);
      setOcrText('');
      setImportSuccess(`Importamos ${data.imported?.length || parsedOrders.length} O.S.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao importar O.S.';
      setImportError(message);
    } finally {
      setImporting(false);
    }
  };

  const startEditing = (order: ServiceOrder) => {
    setEditingId(order.id);
    setEditing({
      osCode: order.osCode,
      tag: order.tag,
      machineName: order.machineName,
      description: order.description,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditing({ osCode: '', tag: '', machineName: '', description: '' });
  };

  const handleSaveEdit = async (orderId: string) => {
    if (!validateOrderPayload(editing)) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      const response = await adminFetch(`/api/admin/folders/${folderId}/os/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify(editing),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao atualizar O.S.');
      setOrders((prev) => prev.map((item) => (item.id === orderId ? data.order : item)));
      setSuccess('O.S. atualizada.');
      cancelEditing();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar O.S.';
      setError(message);
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm('Deseja excluir esta O.S.?')) return;
    try {
      const response = await adminFetch(`/api/admin/folders/${folderId}/os/${orderId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao excluir O.S.');
      setOrders((prev) => prev.filter((item) => item.id !== orderId));
      setSuccess('O.S. excluída.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir O.S.';
      setError(message);
    }
  };

  const renderFormFields = (state: typeof creating, onChange: typeof updateCreating | typeof updateEditing) => (
    <>
      <Input
        label="Código da O.S."
        value={state.osCode}
        onChange={(event) => onChange('osCode', event.target.value)}
        required
      />
      <Input
        label="TAG"
        value={state.tag}
        onChange={(event) => onChange('tag', event.target.value)}
        required
      />
      <Input
        label="Equipamento"
        value={state.machineName}
        onChange={(event) => onChange('machineName', event.target.value)}
        required
      />
      <Input
        label="Descrição"
        value={state.description}
        onChange={(event) => onChange('description', event.target.value)}
        required
      />
    </>
  );

  return (
    <main>
      <div className="container">
        <Card
          title="Ordens de Serviço"
          subtitle="Cadastre, edite e exclua O.S. da pasta."
          action={
            <Link href="/admin/pastas">
              <Button variant="secondary" type="button">
                Voltar
              </Button>
            </Link>
          }
        >
          <form className="stack" onSubmit={handleCreate}>
            <div className="grid">
              {renderFormFields(creating, updateCreating)}
            </div>
            <Button type="submit" disabled={!validateOrderPayload(creating)}>
              Cadastrar O.S.
            </Button>
          </form>
        </Card>

        <Card
          title="Importar por foto"
          subtitle="Use OCR para pré-preencher as O.S. e revise antes de salvar."
          action={
            <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={importingOcr}>
              {importingOcr ? 'Lendo foto...' : 'Importar por foto'}
            </Button>
          }
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                handleImportFile(file);
                event.target.value = '';
              }
            }}
          />
          <div className="stack">
            <p className="footer-note">
              Formato esperado por linha: Código · TAG · Equipamento · Descrição (separados por múltiplos espaços, tab, ; ou |).
            </p>
            {ocrProgress ? <p className="footer-note">Status: {ocrProgress}</p> : null}
            {ocrText ? (
              <details className="ui-card" style={{ background: '#f8fafc' }}>
                <summary style={{ cursor: 'pointer' }}>Ver texto extraído (OCR)</summary>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem', marginTop: '0.5rem' }}>{ocrText}</pre>
              </details>
            ) : null}
            {importError ? <Toast type="error" message={importError} /> : null}
            {importSuccess ? <Toast type="success" message={importSuccess} /> : null}
          </div>
        </Card>

        {parsedOrders.length ? (
          <Card
            title="Revisar O.S. antes de importar"
            subtitle="Edite os campos antes de salvar em lote."
            action={
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Button type="button" variant="ghost" onClick={() => setParsedOrders([])} disabled={importing}>
                  Descartar
                </Button>
                <Button type="button" onClick={handleBulkImport} disabled={importing}>
                  {importing ? 'Importando...' : 'Importar O.S.'}
                </Button>
              </div>
            }
          >
            <div className="table-responsive">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>TAG</th>
                    <th>Equipamento</th>
                    <th>Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedOrders.map((order, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          className="ui-input"
                          value={order.osCode}
                          onChange={(event) =>
                            setParsedOrders((prev) =>
                              prev.map((item, i) => (i === index ? { ...item, osCode: event.target.value } : item))
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="ui-input"
                          value={order.tag}
                          onChange={(event) =>
                            setParsedOrders((prev) =>
                              prev.map((item, i) => (i === index ? { ...item, tag: event.target.value } : item))
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="ui-input"
                          value={order.machineName}
                          onChange={(event) =>
                            setParsedOrders((prev) =>
                              prev.map((item, i) =>
                                i === index ? { ...item, machineName: event.target.value } : item
                              )
                            )
                          }
                        />
                      </td>
                      <td>
                        <textarea
                          className="ui-input"
                          rows={2}
                          value={order.description}
                          onChange={(event) =>
                            setParsedOrders((prev) =>
                              prev.map((item, i) => (i === index ? { ...item, description: event.target.value } : item))
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}

        <Card
          title="Lista de O.S."
          subtitle={loading ? 'Carregando...' : `Total: ${orders.length}`}
          action={
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          }
        >
          {filtered.length ? (
            <div className="list">
              {filtered.map((order) => (
                <div key={order.id} className="list-item" style={{ display: 'grid', gap: '0.6rem' }}>
                  {editingId === order.id ? (
                    <div className="grid">{renderFormFields(editing, updateEditing)}</div>
                  ) : (
                    <>
                      <strong>{order.osCode}</strong>
                      <div className="footer-note">
                        TAG: {order.tag} · Equipamento: {order.machineName}
                      </div>
                      <div className="footer-note" style={{ lineHeight: 1.5 }}>{order.description}</div>
                      <div className="footer-note">
                        Atualizado em {new Date(order.updatedAt).toLocaleString('pt-BR')}
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {editingId === order.id ? (
                      <>
                        <Button type="button" variant="primary" onClick={() => handleSaveEdit(order.id)}>
                          Salvar
                        </Button>
                        <Button type="button" variant="ghost" onClick={cancelEditing}>
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button type="button" variant="secondary" onClick={() => startEditing(order)}>
                          Editar
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => handleDelete(order.id)}>
                          Excluir
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="footer-note">{loading ? 'Carregando O.S...' : 'Nenhuma O.S. cadastrada.'}</p>
          )}
        </Card>

        {error ? <Toast type="error" message={error} /> : null}
        {success ? <Toast type="success" message={success} /> : null}
      </div>
    </main>
  );
}
