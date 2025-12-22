import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';

type AddTimeModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (minutes: number) => void;
};

export function AddTimeModal({ open, onClose, onSave }: AddTimeModalProps) {
  const [minutes, setMinutes] = useState('');
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open && firstFieldRef.current) {
      firstFieldRef.current.focus();
    }
  }, [open]);

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
    const value = Number(minutes);
    if (Number.isFinite(value) && value > 0) {
      onSave(value);
      setMinutes('');
    }
  };

  return (
    <Modal title="Adicionar tempo extra" open={open} onClose={onClose}>
      <form className="stack" onSubmit={handleSubmit}>
        <Input
          ref={firstFieldRef}
          type="number"
          min={1}
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
          aria-label="Minutos adicionais"
          label="Minutos adicionais"
          placeholder="Ex.: 30"
          required
        />
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button type="button" variant="ghost" onClick={onClose} aria-label="Cancelar adição de tempo extra">
            Cancelar
          </Button>
          <Button type="submit" aria-label="Salvar tempo extra">
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
