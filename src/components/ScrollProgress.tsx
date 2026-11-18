import React, { useEffect, useState } from 'react';

/**
 * Thin gold reading-progress rail pinned to the very top of the page.
 * Sits above the sticky navbar and disappears at the top of the document.
 */
export const ScrollProgress: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setProgress(max > 8 ? Math.min(100, (doc.scrollTop / max) * 100) : 0);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div className="fixed top-0 inset-x-0 z-[60] h-[2px] pointer-events-none" aria-hidden="true">
      <div
        className="h-full origin-left bg-gradient-to-r from-[#8A6428] via-[#C69A45] to-[#F9EDD2] shadow-[0_0_10px_rgba(198,154,69,0.75)] transition-[width] duration-100 ease-out"
        style={{ width: `${progress}%`, opacity: progress > 0.5 ? 1 : 0 }}
      />
    </div>
  );
};
