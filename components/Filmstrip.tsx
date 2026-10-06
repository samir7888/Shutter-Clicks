'use client';

import { Reorder, motion } from 'framer-motion';
import type { Slide } from '@/lib/types';

type Props = {
  slides: Slide[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onReorder: (next: Slide[]) => void;
  onAdd: () => void;
};

export default function Filmstrip({ slides, activeId, onSelect, onRemove, onReorder, onAdd }: Props) {
  return (
    <motion.div className="strip" layoutScroll aria-label="Your photos. Drag to reorder.">
      <Reorder.Group axis="x" values={slides} onReorder={onReorder} className="strip-list">
        {slides.map((s) => (
          <Reorder.Item key={s.id} value={s} className="strip-item" data-active={s.id === activeId} whileDrag={{ scale: 1.06, zIndex: 3 }}>
            <button className="thumb" onClick={() => onSelect(s.id)} aria-label={`Select ${s.name}`} aria-pressed={s.id === activeId}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.url} alt="" draggable={false} />
            </button>
            <button className="thumb-remove" onClick={() => onRemove(s.id)} aria-label={`Remove ${s.name}`}>
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
          </Reorder.Item>
        ))}
      </Reorder.Group>
      <button className="thumb thumb-add" onClick={onAdd} aria-label="Add more photos">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </button>
    </motion.div>
  );
}
