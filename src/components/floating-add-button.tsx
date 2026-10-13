"use client";

import { Plus } from "@/components/icons";

export function FloatingAddButton({ label, onClick, expanded, controls }: { label: string; onClick: () => void; expanded?: boolean; controls?: string }) {
  return <div className="add-action-dock"><button type="button" className="primary-add" data-dialog-return-focus aria-label={label} title={label} aria-expanded={expanded} aria-controls={controls} onClick={onClick}><Plus size={24} aria-hidden="true" /></button></div>;
}
