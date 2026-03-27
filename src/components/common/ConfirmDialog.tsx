import Modal from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) => {
  return (
    <Modal isOpen={isOpen} titleId="confirm-dialog-title" onClose={onCancel}>
      <section className="mx-auto max-w-md rounded-2xl bg-white p-4 shadow-soft">
        <h2 id="confirm-dialog-title" className="font-heading text-3xl">{title}</h2>
        <p className="mt-2 text-sm">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-full bg-bubble-sidebar px-3 py-1 text-sm">Cancel</button>
          <button onClick={onConfirm} className="rounded-full bg-bubble-home px-3 py-1 text-sm">{confirmLabel}</button>
        </div>
      </section>
    </Modal>
  );
};

export default ConfirmDialog;
