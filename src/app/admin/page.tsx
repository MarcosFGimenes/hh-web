import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function AdminDashboardPlaceholder() {
  return (
    <main>
      <div className="container">
        <Card
          title="Área do administrador"
          subtitle="Placeholder para gerenciamento de pastas, O.S e links privados."
          action={<Button variant="secondary">Nova pasta</Button>}
        >
          <p className="footer-note">
            Em etapas futuras, esta página permitirá criar pastas de serviço, cadastrar O.S, gerar links privados e
            acompanhar lançamentos dos terceiros.
          </p>
        </Card>
      </div>
    </main>
  );
}
