import type { ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  /** Keeps the confirm button disabled until an extra check passes (e.g. a typed code). */
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export const ConfirmDialog = ({ open, title, description, children, confirmLabel, tone = 'primary', confirmDisabled = false, onConfirm, onClose }: ConfirmDialogProps) => (
  <Modal
    open={open}
    onClose={onClose}
    title={title}
    description={description}
    footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          variant={tone === 'danger' ? 'danger' : 'primary'}
          disabled={confirmDisabled}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </>
    }
  >
    {children}
  </Modal>
);
