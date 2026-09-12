import { Modal } from './Modal';
import { Button } from './Button';

interface InfoDialogProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
}

/** Single-acknowledgement dialog — for feedback the user just needs to see once, not decide on. */
export function InfoDialog({ open, title, description, onClose }: InfoDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      {description && <p className="mb-5 text-sm text-ink-muted">{description}</p>}
      <div className="flex justify-end">
        <Button onClick={onClose}>Entendi</Button>
      </div>
    </Modal>
  );
}
