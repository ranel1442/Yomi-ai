'use client';

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MangaBubbleWord, MangaSpeechBubble } from '../services/api';

export interface MangaBubblePatchProps {
  bubble: MangaSpeechBubble;
  box2d: [number, number, number, number];
  bubbleKey: string;
  direction: 'vertical' | 'horizontal';
  bubbleFontScale: number;
  magnifierEnabled: boolean;
  isPeekingOriginal: boolean;
  isPlaying: boolean;
  isSelected: boolean;
  isHovered: boolean;
  renderedImgWidth: number;
  renderedImgHeight: number;
  shouldShowTokenFurigana: (word: MangaBubbleWord) => boolean;
  onSelect: () => void;
  onHoverChange: (hovered: boolean) => void;
}

const KINSOKU_TRAILING_PUNCT_RE = /^[。、！？…・）」』】〕〉》〜ー,.!?！？]+$/;

interface RenderSegment {
  words: MangaBubbleWord[];
  keepTogether: boolean;
}

/**
 * Groups trailing Japanese punctuation (`。`, `、`, `！`, `？`, `…`) with its
 * immediately preceding token so punctuation can NEVER be orphaned onto an
 * empty vertical column or horizontal line.
 */
function buildKinsokuSafeSegments(words: MangaBubbleWord[]): RenderSegment[] {
  const segments: RenderSegment[] = [];

  for (const w of words) {
    const isTrailingPunct =
      w.type === 'punctuation' && KINSOKU_TRAILING_PUNCT_RE.test(w.kanji.trim());

    if (isTrailingPunct && segments.length > 0) {
      const prevSeg = segments[segments.length - 1];
      const prevCharLen = prevSeg.words.reduce(
        (acc, item) => acc + Array.from(item.kanji || '').length,
        0
      );
      if (prevCharLen <= 6) {
        prevSeg.words.push(w);
        prevSeg.keepTogether = true;
        continue;
      }
    }

    segments.push({
      words: [w],
      keepTogether: false,
    });
  }

  return segments;
}

export default function MangaBubblePatch({
  bubble,
  box2d,
  bubbleKey,
  direction,
  bubbleFontScale,
  magnifierEnabled,
  isPeekingOriginal,
  isPlaying,
  isSelected,
  isHovered,
  renderedImgWidth,
  renderedImgHeight,
  shouldShowTokenFurigana,
  onSelect,
  onHoverChange,
}: MangaBubblePatchProps) {
  const containerRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [fittedFontPx, setFittedFontPx] = useState<number>(13);
  const [extraBreathingPx, setExtraBreathingPx] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });

  const [ymin, xmin, ymax, xmax] = box2d;

  const centerXPercent = (xmin + xmax) / 20;
  const centerYPercent = (ymin + ymax) / 20;

  // When `bubbleFontScale > 1.0`, allow the bubble patch to expand smoothly around its center
  const scaleExpansionFactor =
    bubbleFontScale > 1 ? 1 + (bubbleFontScale - 1) * 0.45 : 1.03;

  const baseWidthPercent = Math.min(
    96,
    ((xmax - xmin) / 10) * scaleExpansionFactor
  );
  const baseHeightPercent = Math.min(
    96,
    ((ymax - ymin) / 10) * scaleExpansionFactor
  );

  const clampedLeftPercent = Math.max(
    0.5,
    Math.min(99.5 - baseWidthPercent, centerXPercent - baseWidthPercent / 2)
  );
  const clampedTopPercent = Math.max(
    0.5,
    Math.min(99.5 - baseHeightPercent, centerYPercent - baseHeightPercent / 2)
  );

  // Smart edge-aware `transform-origin` so magnified bubbles near page borders scale inward, never clipping off-canvas
  const transformOrigin = useMemo(() => {
    const hOrigin = xmin < 160 ? 'left' : xmax > 840 ? 'right' : 'center';
    const vOrigin = ymin < 160 ? 'top' : ymax > 840 ? 'bottom' : 'center';
    return `${hOrigin} ${vOrigin}`;
  }, [xmin, xmax, ymin, ymax]);

  const segments = useMemo(
    () => buildKinsokuSafeSegments(bubble.words || []),
    [bubble.words]
  );

  const furiganaSignature = useMemo(() => {
    if (!bubble.words?.length) return 'plain';
    return bubble.words
      .map((w) => (shouldShowTokenFurigana(w) ? '1' : '0'))
      .join('');
  }, [bubble.words, shouldShowTokenFurigana]);

  // Synchronous Zero-Clip DOM Auto-Fit (`useLayoutEffect` runs before paint)
  useLayoutEffect(() => {
    const containerEl = containerRef.current;
    const contentEl = contentRef.current;
    if (!containerEl || !contentEl) return;

    const padX = 12; // 6px left + 6px right safe padding
    const padY = 8; // 4px top + 4px bottom safe padding

    const targetBoxW =
      renderedImgWidth > 40
        ? (baseWidthPercent / 100) * renderedImgWidth
        : containerEl.clientWidth;
    const targetBoxH =
      renderedImgHeight > 40
        ? (baseHeightPercent / 100) * renderedImgHeight
        : containerEl.clientHeight;

    const naturalW = Math.max(20, Math.floor(targetBoxW - padX));
    const naturalH = Math.max(20, Math.floor(targetBoxH - padY));

    if (direction === 'vertical') {
      contentEl.style.maxHeight = `${naturalH}px`;
      contentEl.style.maxWidth = 'none';
    } else {
      contentEl.style.maxWidth = `${naturalW}px`;
      contentEl.style.maxHeight = 'none';
    }

    const shortestSide = Math.min(naturalW, naturalH);
    const maxStartPx = Math.min(
      30,
      Math.max(13.5, shortestSide * 0.48) * bubbleFontScale
    );
    const minReadablePx = Math.max(9.5, 10 * Math.min(1.08, bubbleFontScale));

    let candidatePx = maxStartPx;
    const stepPx = 0.5;

    const checkFits = () => {
      return (
        contentEl.scrollWidth <= naturalW + 1 &&
        contentEl.scrollHeight <= naturalH + 1 &&
        contentEl.offsetWidth <= naturalW + 1 &&
        contentEl.offsetHeight <= naturalH + 1
      );
    };

    contentEl.style.fontSize = `${candidatePx.toFixed(1)}px`;

    let guard = 0;
    while (!checkFits() && candidatePx > minReadablePx && guard < 60) {
      candidatePx = Math.max(minReadablePx, candidatePx - stepPx);
      contentEl.style.fontSize = `${candidatePx.toFixed(1)}px`;
      guard += 1;
    }

    // Guarantee ZERO clipped characters or furigana even on super-dense bubbles or high `bubbleFontScale`
    let neededExtraW = 0;
    let neededExtraH = 0;
    if (!checkFits()) {
      const overflowW = Math.max(
        contentEl.scrollWidth - naturalW,
        contentEl.offsetWidth - naturalW
      );
      const overflowH = Math.max(
        contentEl.scrollHeight - naturalH,
        contentEl.offsetHeight - naturalH
      );
      if (overflowW > 0) neededExtraW = Math.min(110, Math.ceil(overflowW + 6));
      if (overflowH > 0) neededExtraH = Math.min(110, Math.ceil(overflowH + 6));

      if (direction === 'vertical' && neededExtraH > 0) {
        contentEl.style.maxHeight = `${naturalH + neededExtraH}px`;
      } else if (direction === 'horizontal' && neededExtraW > 0) {
        contentEl.style.maxWidth = `${naturalW + neededExtraW}px`;
      }
    }

    setFittedFontPx(Number(candidatePx.toFixed(1)));
    setExtraBreathingPx((prev) =>
      prev.w === neededExtraW && prev.h === neededExtraH
        ? prev
        : { w: neededExtraW, h: neededExtraH }
    );
  }, [
    bubble.japanese,
    furiganaSignature,
    direction,
    bubbleFontScale,
    baseWidthPercent,
    baseHeightPercent,
    renderedImgWidth,
    renderedImgHeight,
  ]);

  const isDarkBubble = bubble.bubble_bg === 'black';
  const isHighlighted = isPlaying || isSelected || isHovered;
  const isMagnified = magnifierEnabled && isHighlighted && !isPeekingOriginal;

  const shapeRadiusClass = isMagnified
    ? 'rounded-2xl'
    : bubble.bubble_shape === 'rectangle'
    ? 'rounded-md'
    : bubble.bubble_shape === 'spiky'
    ? 'rounded-[26%]'
    : 'rounded-[36%]';

  const baseFeatherShadow = isDarkBubble
    ? '0 0 6px 3px rgba(10,10,10,0.95)'
    : '0 0 6px 4px rgba(255,255,255,0.97)';

  const computedShadow = isMagnified
    ? '0 20px 42px -8px rgba(15, 23, 42, 0.62), 0 0 0 2px rgba(99, 102, 241, 0.85)'
    : isHighlighted
    ? `0 0 16px rgba(99,102,241,0.55), ${baseFeatherShadow}`
    : baseFeatherShadow;

  const renderWordToken = (w: MangaBubbleWord, key: string | number) => {
    if (w.type === 'punctuation') {
      return <span key={key}>{w.kanji}</span>;
    }
    const showRuby = shouldShowTokenFurigana(w);
    return showRuby ? (
      <ruby key={key}>
        {w.kanji}
        <rt>{w.reading}</rt>
      </ruby>
    ) : (
      <span key={key}>{w.kanji}</span>
    );
  };

  return (
    <button
      ref={containerRef}
      key={bubbleKey}
      type="button"
      dir="ltr"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      title={`${bubble.speaker_name_he || 'דמות'}: ${bubble.translation_hebrew} (לחץ להשמעה ולניתוח מילים)`}
      style={{
        top:
          extraBreathingPx.h > 0
            ? `calc(${clampedTopPercent.toFixed(2)}% - ${Math.round(extraBreathingPx.h / 2)}px)`
            : `${clampedTopPercent.toFixed(2)}%`,
        left:
          extraBreathingPx.w > 0
            ? `calc(${clampedLeftPercent.toFixed(2)}% - ${Math.round(extraBreathingPx.w / 2)}px)`
            : `${clampedLeftPercent.toFixed(2)}%`,
        width:
          extraBreathingPx.w > 0
            ? `calc(${baseWidthPercent.toFixed(2)}% + ${extraBreathingPx.w}px)`
            : `${baseWidthPercent.toFixed(2)}%`,
        height:
          extraBreathingPx.h > 0
            ? `calc(${baseHeightPercent.toFixed(2)}% + ${extraBreathingPx.h}px)`
            : `${baseHeightPercent.toFixed(2)}%`,
        transform: isMagnified ? 'scale(1.45)' : 'scale(1)',
        transformOrigin,
        backgroundColor: isDarkBubble ? '#0a0a0a' : '#ffffff',
        color: isDarkBubble ? '#ffffff' : '#0f172a',
        boxShadow: computedShadow,
        padding: '4px 6px',
      }}
      className={`absolute flex items-center justify-center text-center cursor-pointer font-jp manga-bubble-patch ${
        isDarkBubble ? 'manga-bubble-dark' : 'manga-bubble-light'
      } ${shapeRadiusClass} ${
        isPeekingOriginal ? 'opacity-0 pointer-events-none' : 'opacity-100'
      } ${
        isMagnified
          ? 'z-50 overflow-visible shadow-2xl ring-2 ring-indigo-500/85'
          : isHighlighted
          ? 'z-30 overflow-visible ring-2 ring-indigo-500'
          : 'z-10 overflow-visible hover:ring-2 hover:ring-indigo-400/80'
      }`}
    >
      <div
        ref={contentRef}
        style={{ fontSize: `${fittedFontPx}px` }}
        className={`inline-block ${
          direction === 'vertical'
            ? 'manga-bubble-vertical'
            : 'manga-bubble-horizontal'
        }`}
      >
        {segments.length > 0
          ? segments.map((seg, sIdx) =>
              seg.keepTogether ? (
                <span key={sIdx} className="whitespace-nowrap">
                  {seg.words.map((w, wIdx) =>
                    renderWordToken(w, `${sIdx}_${wIdx}`)
                  )}
                </span>
              ) : (
                renderWordToken(seg.words[0], sIdx)
              )
            )
          : bubble.japanese}
      </div>
    </button>
  );
}
