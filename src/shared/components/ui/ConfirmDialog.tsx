import { AlertTriangle, HelpCircle } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Modal, ModalFooter } from "./Modal";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  /** Plain statement of the action, e.g. "Delete Priya's profile?" */
  title: string;
  /** Spell out the consequence — what is removed, whether it can be undone. */
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = destructive (red confirm); primary = consequential but safe. */
  variant?: "danger" | "primary";
  /** Keeps the dialog open with a busy confirm button while the action runs. */
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * In-app replacement for window.confirm. The confirm button carries the
 * action's verb ("Delete student", not "OK") and the description states the
 * consequence, so the user decides with full information.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const danger = variant === "danger";
  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      title={title}
      size="sm"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            danger ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
          )}
        >
          {danger ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <HelpCircle className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 pt-0.5 text-sm leading-relaxed text-muted-foreground">
          {description}
        </div>
      </div>
      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={danger ? "danger" : "primary"}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
