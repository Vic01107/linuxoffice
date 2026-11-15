import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { WriterBlock, WriterContent, WriterFormatting, WriterSettings, WriterTable } from '../../types/writer/document';
import { layoutEngineService, LayoutResult, LayoutBlock, LayoutLine, FontMetrics } from '../../services/writer/layout-engine.service';
import { TableEditor } from './TableEditor';
import { cn } from '../../lib/utils';

interface WriterViewerProps {
  blocks: WriterBlock[];
  settings: WriterSettings;
  zoom?: number;
  onSelectionChange?: (selection: { blockId: string; contentIndex: number; offset: number } | null) => void;
  onBlockUpdate?: (blockId: string, updates: Partial<WriterBlock>) => void;
  readOnly?: boolean;
  className?: string;
}

const PAGE_GAP = 24; // pixels between pages

export function WriterViewer({
  blocks,
  settings,
  zoom = 100,
  onSelectionChange,
  onBlockUpdate,
  readOnly = false,
  className,
}: WriterViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layoutResult, setLayoutResult] = useState<LayoutResult | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<{ blockId: string; contentIndex: number; offset: number } | null>(null);

  // Compute layout when blocks or settings change
  useEffect(() => {
    const engine = new (layoutEngineService.constructor as any)(settings);
    const result = engine.layout(blocks);
    setLayoutResult(result);
  }, [blocks, settings]);

  // Virtualize pages
  const pageVirtualizer = useVirtualizer({
    count: layoutResult?.totalPages || 0,
    getScrollElement: () => containerRef.current,
    estimateSize: () => (settings.pageSize.height / 20) * (zoom / 100) + PAGE_GAP,
    overscan: 1,
  });

  // Handle click for cursor placement
  const handlePageClick = useCallback((pageNumber: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (!layoutResult || readOnly) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (zoom / 100); // Convert to twips
    const y = (e.clientY - rect.top) / (zoom / 100);

    const engine = new (layoutEngineService.constructor as any)(settings);
    const block = engine.getBlockAtPosition(layoutResult, x, y, pageNumber);

    if (block) {
      const charPos = engine.getCharacterPosition(block, x, y);
      if (charPos) {
        const selection = {
          blockId: block.block.id,
          contentIndex: charPos.contentIndex,
          offset: charPos.offset,
        };
        setSelectedPosition(selection);
        onSelectionChange?.(selection);
      }
    }
  }, [layoutResult, settings, zoom, readOnly, onSelectionChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!layoutResult || readOnly || !selectedPosition) return;

    // Navigation handled by parent editor
  }, [layoutResult, readOnly, selectedPosition]);

  if (!layoutResult) {
    return (
      <div ref={containerRef} className={cn('flex-1 overflow-auto bg-gray-50', className)}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('flex-1 overflow-auto bg-gray-50', className)}
      onKeyDown={handleKeyDown}
      tabIndex={readOnly ? -1 : 0}
    >
      <div
        style={{
          width: `${(settings.pageSize.width / 20) * (zoom / 100)}px`,
          margin: '0 auto',
          padding: `${PAGE_GAP / 2}px 0`,
        }}
      >
        {pageVirtualizer.getVirtualItems().map((virtualRow) => {
          const pageNumber = virtualRow.index + 1;
          const pageBlocks = layoutResult.blocks.filter((b: LayoutBlock) => b.page === pageNumber);

          return (
            <div
              key={pageNumber}
              style={{
                height: `${(settings.pageSize.height / 20) * (zoom / 100)}px`,
                width: `${(settings.pageSize.width / 20) * (zoom / 100)}px`,
                marginBottom: `${PAGE_GAP}px`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                backgroundColor: 'white',
                position: 'relative',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              onClick={(e) => handlePageClick(pageNumber, e)}
              className="relative"
            >
              {/* Page background */}
              <div
                style={{
                  position: 'absolute',
                  top: `${(settings.margins.top / 20) * (zoom / 100)}px`,
                  bottom: `${(settings.margins.bottom / 20) * (zoom / 100)}px`,
                  left: `${(settings.margins.left / 20) * (zoom / 100)}px`,
                  right: `${(settings.margins.right / 20) * (zoom / 100)}px`,
                  border: settings.showGridlines ? '1px dashed #e5e7eb' : 'none',
                }}
              />

              {/* Margins indicators */}
              {settings.showRulers && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: `${(settings.margins.top / 20) * (zoom / 100)}px`,
                      background: 'linear-gradient(to bottom, #f3f4f6, transparent)',
                      pointerEvents: 'none',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: `${(settings.margins.bottom / 20) * (zoom / 100)}px`,
                      background: 'linear-gradient(to top, #f3f4f6, transparent)',
                      pointerEvents: 'none',
                    }}
                  />
                </>
              )}

              {/* Header/Footer */}
              {settings.margins.header > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: `${(settings.margins.top / 20 - settings.margins.header / 20) * (zoom / 100)}px`,
                    left: `${(settings.margins.left / 20) * (zoom / 100)}px`,
                    right: `${(settings.margins.right / 20) * (zoom / 100)}px`,
                    height: `${(settings.margins.header / 20) * (zoom / 100)}px`,
                    borderBottom: '1px solid #e5e7eb',
                    fontSize: `${8 * (zoom / 100)}px`,
                    color: '#9ca3af',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Header
                </div>
              )}

              {settings.margins.footer > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: `${(settings.margins.bottom / 20 - settings.margins.footer / 20) * (zoom / 100)}px`,
                    left: `${(settings.margins.left / 20) * (zoom / 100)}px`,
                    right: `${(settings.margins.right / 20) * (zoom / 100)}px`,
                    height: `${(settings.margins.footer / 20) * (zoom / 100)}px`,
                    borderTop: '1px solid #e5e7eb',
                    fontSize: `${8 * (zoom / 100)}px`,
                    color: '#9ca3af',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Footer - Page {pageNumber}
                </div>
              )}

              {/* Page content */}
              <div
                style={{
                  position: 'absolute',
                  top: `${(settings.margins.top / 20) * (zoom / 100)}px`,
                  left: `${(settings.margins.left / 20) * (zoom / 100)}px`,
                  right: `${(settings.margins.right / 20) * (zoom / 100)}px`,
                  bottom: `${(settings.margins.bottom / 20) * (zoom / 100)}px`,
                  overflow: 'hidden',
                }}
              >
                {pageBlocks.map((layoutBlock: LayoutBlock) => (
                  <WriterBlockRenderer
                    key={layoutBlock.block.id}
                    layoutBlock={layoutBlock}
                    zoom={zoom}
                    selected={selectedPosition?.blockId === layoutBlock.block.id}
                    onSelect={onSelectionChange}
                    onBlockUpdate={onBlockUpdate}
                    readOnly={readOnly}
                  />
                ))}
              </div>

              {/* Page number */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '16px',
                  fontSize: `${10 * (zoom / 100)}px`,
                  color: '#9ca3af',
                }}
              >
                {pageNumber}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Render a single layout block
function WriterBlockRenderer({
  layoutBlock,
  zoom,
  selected,
  onSelect,
  onBlockUpdate,
  readOnly,
}: {
  layoutBlock: LayoutBlock;
  zoom: number;
  selected: boolean;
  onSelect?: (selection: { blockId: string; contentIndex: number; offset: number } | null) => void;
  onBlockUpdate?: (blockId: string, updates: Partial<WriterBlock>) => void;
  readOnly: boolean;
}) {
  const { block, lines, x, y, width, height } = layoutBlock;

  // Handle table blocks with TableEditor
  if (block.type === 'table') {
    return (
      <div
        style={{
          position: 'absolute',
          left: `${(x / 20) * (zoom / 100)}px`,
          top: `${(y / 20) * (zoom / 100)}px`,
          width: `${(width / 20) * (zoom / 100)}px`,
          minHeight: `${(height / 20) * (zoom / 100)}px`,
        }}
        className={cn(
          'relative',
          selected && 'outline outline-1 outline-primary outline-offset-1'
        )}
      >
        <TableEditor
          block={block}
          onUpdate={(updatedBlock) => {
            onBlockUpdate?.(block.id, updatedBlock);
          }}
          readOnly={readOnly}
        />
        {/* Block type indicator */}
        <div
          style={{
            position: 'absolute',
            top: '-20px',
            left: '0',
            fontSize: `${10 * (zoom / 100)}px`,
            background: '#3b82f6',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          {block.type}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: `${(x / 20) * (zoom / 100)}px`,
        top: `${(y / 20) * (zoom / 100)}px`,
        width: `${(width / 20) * (zoom / 100)}px`,
        minHeight: `${(height / 20) * (zoom / 100)}px`,
      }}
      className={cn(
        'relative',
        selected && 'outline outline-1 outline-primary outline-offset-1'
      )}
    >
      {lines.map((line: LayoutLine, lineIndex: number) => (
        <WriterLineRenderer
          key={lineIndex}
          line={line}
          zoom={zoom}
          blockId={block.id}
          onSelect={onSelect}
          readOnly={readOnly}
        />
      ))}

      {/* Block type indicator */}
      {block.type !== 'paragraph' && (
        <div
          style={{
            position: 'absolute',
            top: '-20px',
            left: '0',
            fontSize: `${10 * (zoom / 100)}px`,
            background: '#3b82f6',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          {block.type}
        </div>
      )}
    </div>
  );
}

// Render a single layout line
function WriterLineRenderer({
  line,
  zoom,
  blockId,
  onSelect,
  readOnly,
}: {
  line: LayoutLine;
  zoom: number;
  blockId: string;
  onSelect?: (selection: { blockId: string; contentIndex: number; offset: number } | null) => void;
  readOnly: boolean;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${(line.x / 20) * (zoom / 100)}px`,
        top: `${(line.y / 20) * (zoom / 100)}px`,
        height: `${(line.height / 20) * (zoom / 100)}px`,
        lineHeight: `${(line.height / 20) * (zoom / 100)}px`,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {line.content.map((content: WriterContent, contentIndex: number) => (
        <WriterContentRenderer
          key={content.id}
          content={content}
          zoom={zoom}
          blockId={blockId}
          contentIndex={contentIndex}
          onSelect={onSelect}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}

// Render inline content with formatting
function WriterContentRenderer({
  content,
  zoom,
  blockId,
  contentIndex,
  onSelect,
  readOnly,
}: {
  content: WriterContent;
  zoom: number;
  blockId: string;
  contentIndex: number;
  onSelect?: (selection: { blockId: string; contentIndex: number; offset: number } | null) => void;
  readOnly: boolean;
}) {
  const fmt = content.formatting;
  const style: React.CSSProperties = {
    fontFamily: fmt.fontFamily || 'Calibri, sans-serif',
    fontSize: `${(fmt.fontSize || 11) * (zoom / 100)}px`,
    fontWeight: fmt.bold ? 'bold' : 'normal',
    fontStyle: fmt.italic ? 'italic' : 'normal',
    textDecoration: [
      fmt.underline ? 'underline' : 'none',
      fmt.strikethrough ? 'line-through' : 'none',
    ].filter(d => d !== 'none').join(' ') || 'none',
    color: fmt.color || '#000',
    backgroundColor: fmt.backgroundColor || 'transparent',
    verticalAlign: fmt.superscript ? 'super' : fmt.subscript ? 'sub' : 'baseline',
    fontVariant: fmt.superscript || fmt.subscript ? 'small-caps' : 'normal',
  };

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (!readOnly && onSelect) {
      onSelect({ blockId, contentIndex, offset: 0 });
    }
  };

  if (content.type === 'inlineImage' && content.imageData) {
    const blob = new Blob([content.imageData as unknown as ArrayBuffer]);
    const url = URL.createObjectURL(blob);
    return (
      <img
        src={url}
        alt="Inline image"
        style={{
          ...style,
          maxHeight: `${(914400 / 20) * (zoom / 100)}px`, // Max 1 inch
          verticalAlign: 'middle',
          cursor: readOnly ? 'default' : 'pointer',
        }}
        onClick={handleClick}
        onLoad={() => URL.revokeObjectURL(url)}
      />
    );
  }

  if (content.type === 'hyperlink' && content.link) {
    return (
      <a
        href={content.link}
        target="_blank"
        rel="noopener noreferrer"
        style={{ ...style, textDecoration: 'underline', color: '#2563eb', cursor: 'pointer' }}
        onClick={handleClick}
      >
        {content.text}
      </a>
    );
  }

  return (
    <span
      style={style}
      onClick={handleClick}
    >
      {content.text || ' '} {/* Non-breaking space for empty content */}
    </span>
  );
}

export default WriterViewer;