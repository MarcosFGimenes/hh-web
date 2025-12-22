import { Card } from '@/components/Card';

type OsCardViewProps = {
  folderName: string;
  updatedAt?: number;
};

export function OsCardView({ folderName, updatedAt }: OsCardViewProps) {
  return (
    <Card
      title={folderName}
      subtitle={
        updatedAt
          ? `Atualizado em ${new Date(updatedAt).toLocaleString('pt-BR')}`
          : 'Acesso público via link do terceiro'
      }
    >
      <p className="footer-note">
        Use este link para registrar ou consultar apontamentos de manutenção. Compartilhe apenas com usuários
        autorizados.
      </p>
    </Card>
  );
}
