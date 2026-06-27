import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Warning, Trash, X } from "@phosphor-icons/react";

/**
 * Reusable confirm dialog — replaces window.confirm() everywhere.
 *
 * Usage:
 *   <ConfirmDialog
 *     open={open} onOpenChange={setOpen}
 *     title="Hapus item?"
 *     description="Tindakan ini tidak bisa dibatalkan."
 *     confirmLabel="Hapus"        // default "Konfirmasi"
 *     variant="danger"            // "danger" | "default"
 *     loading={deleting}
 *     onConfirm={handleDelete}
 *   />
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title = "Konfirmasi",
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  variant = "default",
  loading = false,
  onConfirm,
  children,
}) {
  const isDanger = variant === "danger";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">

          {/* Close button */}
          <DialogPrimitive.Close
            className="absolute right-4 top-4 p-1.5 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all"
            data-testid="confirm-dialog-close"
          >
            <X size={16} />
          </DialogPrimitive.Close>

          {/* Icon */}
          <div className={`mx-auto mb-4 h-12 w-12 rounded-full flex items-center justify-center ${isDanger ? "bg-red-100" : "bg-brand-gold/20"}`}>
            {isDanger
              ? <Trash size={22} weight="duotone" className="text-red-600" />
              : <Warning size={22} weight="duotone" className="text-brand-gold" />
            }
          </div>

          {/* Title */}
          <DialogPrimitive.Title className="font-heading text-xl font-bold text-brand text-center mb-1">
            {title}
          </DialogPrimitive.Title>

          {/* Description */}
          {description && (
            <DialogPrimitive.Description className="text-sm text-stone-500 text-center leading-relaxed mb-2">
              {description}
            </DialogPrimitive.Description>
          )}

          {/* Extra content slot */}
          {children && <div className="mt-3 mb-1">{children}</div>}

          {/* Actions */}
          <div className="flex gap-2 mt-5">
            <DialogPrimitive.Close asChild>
              <button
                data-testid="confirm-dialog-cancel"
                className="flex-1 py-3 border border-brand-sand text-stone-700 rounded-full font-semibold hover:bg-brand-sand transition-all btn-touch"
              >
                {cancelLabel}
              </button>
            </DialogPrimitive.Close>
            <button
              onClick={onConfirm}
              disabled={loading}
              data-testid="confirm-dialog-confirm"
              className={`flex-1 py-3 rounded-full font-semibold transition-all btn-touch disabled:opacity-60 ${
                isDanger
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-brand text-brand-cream hover:bg-brand-light"
              }`}
            >
              {loading ? "Memproses..." : confirmLabel}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
