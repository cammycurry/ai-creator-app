"use client";

import { useUnifiedStudioStore } from "@/stores/unified-studio-store";

export function InlineRefs() {
  const { attachedRefs, detachRef, inspirationPhotos, removeInspirationPhoto } = useUnifiedStudioStore();

  if (attachedRefs.length === 0 && inspirationPhotos.length === 0) return null;

  return (
    <div className="sv2-inline-refs">
      {attachedRefs.map((ref) => (
        <div key={ref.id} className="sv2-inline-ref">
          <div
            className="sv2-inline-ref-thumb"
            style={{ background: ref.imageUrl ? `url(${ref.imageUrl}) center/cover` : "#F5F5F5" }}
          />
          <span>{ref.name}</span>
          <button className="sv2-inline-ref-x" onClick={() => detachRef(ref.id)}>&times;</button>
        </div>
      ))}
      {inspirationPhotos.map((photo, i) => (
        <div key={`inspo-${i}`} className="sv2-inline-ref">
          <div
            className="sv2-inline-ref-thumb"
            style={{ background: `url(${photo.preview}) center/cover` }}
          />
          <span>Inspiration</span>
          <button className="sv2-inline-ref-x" onClick={() => removeInspirationPhoto(i)}>&times;</button>
        </div>
      ))}
    </div>
  );
}
