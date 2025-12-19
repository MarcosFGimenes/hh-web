"use client";

import { useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { Toast } from '@/components/Toast';

export default function DemoThirdPartyPage() {
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleLaunch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  return (
    <main>
      <div className="container">
        <Card
          title="Lançamento de horas — pasta demo"
          subtitle="Acesso de terceiro via link privado /p/demo?k=..."
          action={
            <Button variant="secondary" type="button" onClick={() => setShowModal(true)}>
              Ver O.S disponíveis
            </Button>
          }
        >
          <form className="stack" onSubmit={handleLaunch}>
            <Input label="Data" type="date" required />
            <Input label="Funcionário" placeholder="Nome completo" required />
            <Input label="Horário total do dia" placeholder="08:00" required />
            <Input label="O.S selecionada" placeholder="TAG / Máquina / Descrição" required />
            <Button type="submit">Salvar lançamento (placeholder)</Button>
            <p className="footer-note">
              Este é um placeholder para o fluxo do terceiro. Validações de horário, assinatura digital e upload/voz
              serão adicionados nas próximas etapas.
            </p>
          </form>
        </Card>

        {showToast ? <Toast type="success" message="Lançamento salvo (mock)." /> : null}

        <Modal title="O.S disponíveis" open={showModal} onClose={() => setShowModal(false)}>
          <div className="list">
            <div className="list-item">TAG 1001 — Bomba de água — Revisão</div>
            <div className="list-item">TAG 2002 — Compressor — Troca de filtro</div>
            <div className="list-item">TAG 3003 — Esteira — Lubrificação</div>
          </div>
        </Modal>
      </div>
    </main>
  );
}
