import React from 'react';

interface FocusStageProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Главная плитка focus-режима: заполняет доступную высоту, ширина по 16:9.
 * justify-center — по центру по горизонтали; items-start — без лишнего поля сверху.
 */
export function FocusStage({ children, className = '' }: FocusStageProps) {
  return (
    <div className={`flex h-full min-h-0 w-full items-start justify-center ${className}`}>
      <div className="aspect-video h-full w-auto max-w-full overflow-hidden rounded-2xl">
        <div className="relative h-full w-full">{children}</div>
      </div>
    </div>
  );
}
