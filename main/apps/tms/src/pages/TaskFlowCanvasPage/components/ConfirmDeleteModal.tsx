import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Modal, ModalButton } from "@repo/ui";

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDeleteModal({
  open,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useTranslation(["tms", "common"]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onConfirm();
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  const titleLabel = title ?? t("canvas.confirmDelete.title");
  const confirmLabel = confirmText ?? t("actions.delete");
  const cancelLabel = cancelText ?? t("common:cancel");

  return (
    <Modal
      isOpen={open}
      title={titleLabel}
      size="sm"
      onClose={onCancel}
      renderButtonComponent={
        <>
          <ModalButton theme="tertiary" onClick={onCancel}>
            {cancelLabel}
          </ModalButton>
          <ModalButton theme="primary" onClick={onConfirm}>
            {confirmLabel}
          </ModalButton>
        </>
      }
    >
    </Modal>
  );
}
