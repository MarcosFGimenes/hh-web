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
            <Input label="Funcionário" required />
            <Input label="Horário total do dia" required />
            <Input label="O.S selecionada" required />
            <Button type="submit">Salvar lançamento</Button>
            <p className="footer-note">
              Este é um placeholder para o fluxo do terceiro. Validações de horário, assinatura digital e upload/voz
              serão adicionados nas próximas etapas.
            </p>
          </form>
        </Card>

        {showToast ? <Toast type="success" message="Lançamento salvo (mock)." /> : null}

        <Modal title="O.S disponíveis" open={showModal} onClose={() => setShowModal(false)}>
          <p className="footer-note">Nenhuma O.S. cadastrada para demonstração.</p>
        </Modal>
      </div>
    </main>
  );
}
