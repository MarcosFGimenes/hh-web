import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';

type AddTimeModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (start: string, end: string) => void;
  initialStart?: string;
  initialEnd?: string;
};

export function AddTimeModal({ open, onClose, onSave, initialStart = '', initialEnd = '' }: AddTimeModalProps) {
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open && firstFieldRef.current) {
      firstFieldRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setStart(initialStart);
      setEnd(initialEnd);
    }
  }, [open, initialEnd, initialStart]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(start, end);
  };

  return (
    <Modal title="Adicionar horário" open={open} onClose={onClose}>
      <form className="stack" onSubmit={handleSubmit}>
        <Input
          ref={firstFieldRef}
          type="text"
          inputMode="numeric"
          pattern="\\d{2}:\\d{2}"
          placeholder="08:00"
          value={start}
          onChange={(event) => setStart(event.target.value)}
          aria-label="Horário de entrada"
          label="Entrada"
          required
        />
        <Input
          type="text"
          inputMode="numeric"
          pattern="\\d{2}:\\d{2}"
          placeholder="17:30"
          value={end}
          onChange={(event) => setEnd(event.target.value)}
          aria-label="Horário de saída"
          label="Saída"
          required
        />
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button type="button" variant="ghost" onClick={onClose} aria-label="Cancelar adição de horário">
            Cancelar
          </Button>
          <Button type="submit" aria-label="Salvar horário do mantenedor">
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
