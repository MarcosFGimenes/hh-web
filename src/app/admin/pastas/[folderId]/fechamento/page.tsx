"use client";

import Link from 'next/link';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';

type PageProps = {
  params: { folderId: string };
};

export default function FolderClosingPlaceholderPage({ params }: PageProps) {
  const { folderId } = params;

  return (
    <main>
      <div className="container">
        <Card
          title="Fechamento de horas"
          subtitle="Em breve: consolidação de serviços por período."
          action={
            <Link href={`/admin/pastas/${folderId}/os`}>
              <Button variant="secondary" type="button">
                Voltar
              </Button>
            </Link>
          }
        >
          <p className="footer-note">
            Esta área receberá a exportação e o relatório final de horas por dia, funcionário e O.S. em breve.
          </p>
          <p className="footer-note">
            A API de agregação já está disponível e será conectada aqui para permitir filtros por período e download.
          </p>
        </Card>
      </div>
    </main>
  );
}
