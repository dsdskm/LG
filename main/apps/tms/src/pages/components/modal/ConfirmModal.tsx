import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  showCancelButton?: boolean;
  confirmDisabled?: boolean;
  closeOnOverlayClick?: boolean;
  confirmVariant?: "primary" | "danger";
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmModal({
  open,
  title = "",
  description = "",
  confirmText,
  cancelText,
  showCancelButton = true,
  confirmDisabled = false,
  closeOnOverlayClick = false,
  confirmVariant = "primary",
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useTranslation("common");

  // 미지정 시 공통 리소스의 확인/취소를 사용
  const confirmLabel = confirmText ?? t("confirm");
  const cancelLabel = cancelText ?? t("cancel");

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <Overlay>
      <Dialog
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-description"
        onClick={(e) => e.stopPropagation()}
      >
        {title ? <Title id="confirm-modal-title">{title}</Title> : null}
        {description ? (
          <Description id="confirm-modal-description">{description}</Description>
        ) : null}

        <ButtonRow>
          {showCancelButton && (
            <CancelButton
              type="button"
              onClick={onCancel}
              disabled={confirmDisabled}
            >
              {cancelLabel}
            </CancelButton>
          )}

          <ConfirmButton
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            $variant={confirmVariant}
          >
            {confirmLabel}
          </ConfirmButton>
        </ButtonRow>
      </Dialog>
    </Overlay>,
    document.body
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;

  display: flex;
  align-items: center;
  justify-content: center;

  background: rgba(15, 23, 42, 0.45);
`;

const Dialog = styled.div`
  width: min(480px, calc(100vw - 32px));
  max-width: 480px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.28);
  padding: 24px;
  z-index: 10000;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
`;

const Description = styled.p`
  margin: 12px 0 0;
  white-space: pre-line;
  font-size: 14px;
  line-height: 1.6;
  color: #4b5563;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
`;

const BaseButton = styled.button`
  height: 40px;
  padding: 0 16px;
  border-radius: 10px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const CancelButton = styled(BaseButton)`
  background: #f3f4f6;
  color: #111827;

  &:hover:not(:disabled) {
    background: #e5e7eb;
  }
`;

const dangerButtonStyle = css`
  background: #dc2626;
  color: #ffffff;

  &:hover:not(:disabled) {
    background: #b91c1c;
  }
`;

const primaryButtonStyle = css`
  background: #2563eb;
  color: #ffffff;

  &:hover:not(:disabled) {
    background: #1d4ed8;
  }
`;

const ConfirmButton = styled(BaseButton) <{ $variant: "primary" | "danger" }>`
  ${({ $variant }) =>
    $variant === "danger" ? dangerButtonStyle : primaryButtonStyle}
`;