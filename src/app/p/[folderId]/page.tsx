"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Toast } from '@/components/Toast';
import type { ServiceOrder } from '@/types/os';

type FolderSummary = {
  id: string;
  name: string;
};

type PageProps = {
  params: { folderId: string };
};

export default function PublicFolderAccessPage({ params }: PageProps) {
  const searchParams = useSearchParams();
  const folderId = params.folderId;
  const [folder, setFolder] = useState<FolderSummary | null>(null);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const linkKey = useMemo(() => searchParams.get('k') || '', [searchParams]);

  const fetchJSON = async (path: string) => {
    const response = await fetch(path, { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) {
      const message = data?.error || 'Falha ao validar o link.';
      throw new Error(message);
    }
    return data;
  };

  useEffect(() => {
    const validate = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!linkKey) {
          throw new Error('Link inválido ou expirado.');
        }

        const summary = await fetchJSON(`/api/p/folders/${folderId}/summary?k=${encodeURIComponent(linkKey)}`);
        setFolder(summary.folder);

        const osData = await fetchJSON(`/api/p/folders/${folderId}/os?k=${encodeURIComponent(linkKey)}`);
        setOrders(osData.orders);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Link inválido ou expirado.';
        setError(message);
        setFolder(null);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    validate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId, linkKey]);

  const hasOrders = orders.length > 0;

  return (
    <main>
      <div className="container">
        {error ? (
          <Card title="Link inválido ou expirado">
            <p className="footer-note">{error}</p>
          </Card>
        ) : null}

        {!error ? (
          <>
            <Card
              title={folder ? `Pasta: ${folder.name}` : 'Validando link...'}
              subtitle="Acesso do terceiro via link privado"
              action={
                <Link href="/">
                  <Button variant="ghost" type="button">
                    Voltar
                  </Button>
                </Link>
              }
            >
              {loading ? (
                <p className="footer-note">Validando link e carregando dados...</p>
              ) : (
                <p className="footer-note">
                  Link válido. Esta é a tela inicial do terceiro. Próximas etapas incluirão formulário de lançamento de
                  horas e envio de anexos.
                </p>
              )}
            </Card>

            <Card title="Ordens de Serviço disponíveis" subtitle={loading ? 'Carregando...' : `Total: ${orders.length}`}>
              {hasOrders ? (
                <div className="list">
                  {orders.map((order) => (
                    <div key={order.id} className="list-item">
                      <strong>{order.osCode}</strong>
                      <div className="footer-note">
                        TAG: {order.tag} · Equipamento: {order.machineName}
                      </div>
                      <div className="footer-note" style={{ lineHeight: 1.5 }}>
                        {order.description}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="footer-note">
                  {loading ? 'Carregando...' : 'Nenhuma O.S. cadastrada para esta pasta.'}
                </p>
              )}
            </Card>
          </>
        ) : null}

        {error ? <Toast type="error" message={error} /> : null}
      </div>
    </main>
  );
}
