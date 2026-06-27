import { Link } from "react-router-dom";
import { X, Lightning, ArrowRight } from "@phosphor-icons/react";

export default function NoCreditsModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-brand/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6" data-testid="no-credits-modal" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-7">
        <div className="flex items-start justify-between mb-4">
          <div className="h-12 w-12 rounded-2xl bg-brand-gold/20 text-brand flex items-center justify-center">
            <Lightning size={22} weight="duotone" />
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-brand-sand hover:bg-brand-gold/30 text-brand flex items-center justify-center" data-testid="close-no-credits">
            <X size={16} weight="bold" />
          </button>
        </div>
        <h3 className="font-heading text-2xl font-bold text-brand tracking-tight mb-2">Kredit Anda habis</h3>
        <p className="text-stone-600 leading-relaxed">
          Anda telah memakai semua kredit generate bulan ini. Upgrade paket atau top-up kredit tambahan untuk lanjut.
        </p>
        <div className="mt-6 flex gap-2">
          <Link to="/settings#plan" onClick={onClose} data-testid="upgrade-link" className="flex-1 text-center px-4 py-3 bg-brand text-brand-cream hover:bg-brand-light rounded-full font-semibold inline-flex items-center justify-center gap-2">
            Upgrade Paket <ArrowRight size={14} weight="bold" />
          </Link>
        </div>
      </div>
    </div>
  );
}
