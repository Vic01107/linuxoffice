import { useState, useRef, useEffect, useCallback } from 'react';
import { WriterBlock, WriterTable, WriterTableRow, WriterTableCell, WriterTableProperties, WriterTableRowProperties, WriterTableCellProperties, WriterBlockAttributes } from '../../types/writer/document';
import { cn } from '../../lib/utils';
import {
  GripVertical,
  GripHorizontal,
  Minus,
  Plus,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Square,
  Grid,
  Minus as MinusIcon,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface TableEditorProps {
  block: WriterBlock;
  onUpdate: (block: WriterBlock) => void;
  readOnly?: boolean;
}

const DEFAULT_CELL_PROPS: WriterTableCellProperties = {
  verticalAlignment: 'top',
  margins: { top: 0, bottom: 0, left: 54, right: 54 },
};

const DEFAULT_ROW_PROPS: WriterTableRowProperties = {
  height: { value: 240, rule: 'auto' },
  cantSplit: false,
  header: false,
};

const DEFAULT_TABLE_PROPS: WriterTableProperties = {
  width: { value: 5000, type: 'pct' },
  alignment: 'left',
  layout: 'autofit',
  cellSpacing: 0,
  borders: {},
  shading: { fill: 'clear' },
  cellMargin: { top: 0, bottom: 0, left: 54, right: 54 },
};

function ensureTableStructure(block: WriterBlock): WriterTable {
  if (block.children && block.children.length > 0) {
    const tableData = block.children[0] as unknown as WriterTable;
    if (tableData && tableData.rows) return tableData;
  }

  // Create default 3x3 table
  const rows: WriterTableRow[] = Array.from({ length: 3 }, (_, r) => ({
    cells: Array.from({ length: 3 }, (_, c) => ({
      blocks: [{
        id: crypto.randomUUID(),
        type: 'paragraph',
        content: [{ id: crypto.randomUUID(), type: 'text', text: r === 0 ? `Header ${c + 1}` : '', formatting: r === 0 ? { bold: true } : {} }],
        attributes: {},
      }],
      properties: { ...DEFAULT_CELL_PROPS },
    })),
    properties: { ...DEFAULT_ROW_PROPS, header: r === 0 },
  }));

  return {
    rows,
    properties: { ...DEFAULT_TABLE_PROPS },
  };
}

export function TableEditor({ block, onUpdate, readOnly = false }: TableEditorProps) {
  const [table, setTable] = useState<WriterTable>(() => ensureTableStructure(block));
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [resizing, setResizing] = useState<{ type: 'col' | 'row'; index: number; startX: number; startY: number; startSize: number } | null>(null);
  const [showBorderMenu, setShowBorderMenu] = useState<{ row: number; col: number } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const colWidthsRef = useRef<number[]>([]);
  const rowHeightsRef = useRef<number[]>([]);

  // Initialize column widths
  useEffect(() => {
    const firstRow = table.rows[0];
    if (firstRow?.cells.length) {
      const cols = firstRow.cells.length;
      const totalWidth = 100; // percentage
      colWidthsRef.current = Array(cols).fill(totalWidth / cols);
    }
  }, [table.rows.length]);

  const updateTable = useCallback((newTable: WriterTable) => {
    setTable(newTable);
    const newBlock: WriterBlock = {
      ...block,
      children: [newTable as unknown as WriterBlock],
    };
    onUpdate(newBlock);
  }, [block, onUpdate]);

  // Selection handling
  const handleCellClick = (row: number, col: number, e: React.MouseEvent) => {
    if (readOnly) return;
    const cellKey = `${row}-${col}`;

    if (e.shiftKey && selectedCells.size > 0) {
      // Range selection
      const firstKey = Array.from(selectedCells)[0];
      if (!firstKey) return;
      const parts = firstKey.split('-');
      const first0 = Number(parts[0]) || 0;
      const first1 = Number(parts[1]) || 0;
      const minRow = Math.min(first0, row);
      const maxRow = Math.max(first0, row);
      const minCol = Math.min(first1, col);
      const maxCol = Math.max(first1, col);

      const newSelection = new Set<string>();
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          newSelection.add(`${r}-${c}`);
        }
      }
      setSelectedCells(newSelection);
    } else if (e.ctrlKey || e.metaKey) {
      // Toggle cell
      const newSelection = new Set(selectedCells);
      if (newSelection.has(cellKey)) {
        newSelection.delete(cellKey);
      } else {
        newSelection.add(cellKey);
      }
      setSelectedCells(newSelection);
    } else {
      // Single selection
      setSelectedCells(new Set([cellKey]));
    }
  };

  const handleCellMouseDown = (row: number, col: number, e: React.MouseEvent) => {
    if (readOnly) return;
    e.stopPropagation();
    handleCellClick(row, col, e);
  };

  // Resize handling
  const handleColResizeStart = (col: number, e: React.MouseEvent) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startSize = colWidthsRef.current[col] || 0;
    setResizing({ type: 'col', index: col, startX, startY: 0, startSize });
  };

  const handleRowResizeStart = (row: number, e: React.MouseEvent) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startSize = rowHeightsRef.current[row] || 40;
    setResizing({ type: 'row', index: row, startX: 0, startY, startSize });
  };

  useEffect(() => {
    if (!resizing) return;

    const handleMove = (e: MouseEvent) => {
      if (resizing.type === 'col') {
        const delta = e.clientX - resizing.startX;
        const newSize = Math.max(10, resizing.startSize + (delta / 800) * 100); // Convert px to %
        const widths = [...colWidthsRef.current];
        widths[resizing.index] = newSize;
        colWidthsRef.current = widths;

        // Normalize to 100%
        const total = widths.reduce((a, b) => a + b, 0);
        colWidthsRef.current = widths.map(w => (w / total) * 100);
      } else {
        const delta = e.clientY - resizing.startY;
        const newSize = Math.max(20, resizing.startSize + delta);
        const heights = [...rowHeightsRef.current];
        heights[resizing.index] = newSize;
        rowHeightsRef.current = heights;
      }
      setTable(prev => ({ ...prev })); // Trigger re-render
    };

    const handleUp = () => setResizing(null);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [resizing]);

  // Row operations
  const createEmptyCell = (): WriterTableCell => ({
    blocks: [{
      id: crypto.randomUUID(),
      type: 'paragraph',
      content: [{ id: crypto.randomUUID(), type: 'text', text: '', formatting: {} }],
      attributes: {},
    }],
    properties: { ...DEFAULT_CELL_PROPS },
  });

  const insertRowAbove = (row: number) => {
    const firstRow = table.rows[0];
    if (!firstRow) return;
    const newRow: WriterTableRow = {
      cells: firstRow.cells.map(() => createEmptyCell()),
      properties: { ...DEFAULT_ROW_PROPS },
    };
    const newRows = [...table.rows];
    newRows.splice(row, 0, newRow);
    updateTable({ ...table, rows: newRows });
  };

  const insertRowBelow = (row: number) => {
    const firstRow = table.rows[0];
    if (!firstRow) return;
    const newRow: WriterTableRow = {
      cells: firstRow.cells.map(() => createEmptyCell()),
      properties: { ...DEFAULT_ROW_PROPS },
    };
    const newRows = [...table.rows];
    newRows.splice(row + 1, 0, newRow);
    updateTable({ ...table, rows: newRows });
  };

  const deleteRow = (row: number) => {
    if (table.rows.length <= 1) return;
    const newRows = table.rows.filter((_, i) => i !== row);
    updateTable({ ...table, rows: newRows });
  };

  // Column operations
  const insertColLeft = (col: number) => {
    const newRows = table.rows.map(row => ({
      ...row,
      cells: [
        ...row.cells.slice(0, col),
        createEmptyCell(),
        ...row.cells.slice(col),
      ],
    }));
    const newWidths = [...colWidthsRef.current];
    newWidths.splice(col, 0, 100 / (newWidths.length + 1));
    colWidthsRef.current = newWidths.map(w => (w / newWidths.reduce((a, b) => a + b, 0)) * 100);
    updateTable({ ...table, rows: newRows });
  };

  const insertColRight = (col: number) => {
    const newRows = table.rows.map(row => ({
      ...row,
      cells: [
        ...row.cells.slice(0, col + 1),
        createEmptyCell(),
        ...row.cells.slice(col + 1),
      ],
    }));
    const newWidths = [...colWidthsRef.current];
    newWidths.splice(col + 1, 0, 100 / (newWidths.length + 1));
    colWidthsRef.current = newWidths.map(w => (w / newWidths.reduce((a, b) => a + b, 0)) * 100);
    updateTable({ ...table, rows: newRows });
  };

  const deleteCol = (col: number) => {
    const firstRow = table.rows[0];
    if (!firstRow || firstRow.cells.length <= 1) return;
    const newRows = table.rows.map(row => ({
      ...row,
      cells: row.cells.filter((_, i) => i !== col),
    }));
    const newWidths = colWidthsRef.current.filter((_, i) => i !== col);
    const total = newWidths.reduce((a, b) => a + b, 0);
    colWidthsRef.current = newWidths.map(w => (w / total) * 100);
    updateTable({ ...table, rows: newRows });
  };

  // Merge cells
  const mergeCells = () => {
    if (selectedCells.size < 2) return;

    const cells = Array.from(selectedCells).map(k => {
      const parts = k.split('-');
      return [Number(parts[0]) || 0, Number(parts[1]) || 0];
    });
    const minRow = Math.min(...cells.map(c => c[0] ?? 0));
    const maxRow = Math.max(...cells.map(c => c[0] ?? 0));
    const minCol = Math.min(...cells.map(c => c[1] ?? 0));
    const maxCol = Math.max(...cells.map(c => c[1] ?? 0));

    // Check if rectangular
    const expectedCount = (maxRow - minRow + 1) * (maxCol - minCol + 1);
    if (cells.length !== expectedCount) return; // Not rectangular

    // Validate row/col bounds
    if (!table.rows[minRow] || !table.rows[minRow].cells[minCol]) return;

    const newRows = table.rows.map((row, r) => ({
      ...row,
      cells: row.cells.map((cell, c) => {
        if (r === minRow && c === minCol) {
          // Top-left cell gets merged content
          let mergedBlocks = [...cell.blocks];
          for (let mr = minRow; mr <= maxRow; mr++) {
            for (let mc = minCol; mc <= maxCol; mc++) {
              if (mr === minRow && mc === minCol) continue;
              const otherCell = table.rows[mr]?.cells[mc];
              if (otherCell) {
                mergedBlocks = [...mergedBlocks, ...otherCell.blocks];
              }
            }
          }
          return {
            ...cell,
            blocks: mergedBlocks,
            properties: {
              ...cell.properties,
              // Add gridSpan for merged cells
            },
          };
        }
        return cell;
      }).filter((_, c) => !(r >= minRow && r <= maxRow && c > minCol && c <= maxCol)),
    }));

    // Remove merged cells from other rows
    const finalRows = newRows.map((row, r) => ({
      ...row,
      cells: row.cells.filter((_, c) => !(r > minRow && r <= maxRow && c >= minCol && c <= maxCol)),
    }));

    updateTable({ ...table, rows: finalRows });
    setSelectedCells(new Set());
  };

  // Split cell
  const splitCell = (row: number, col: number) => {
    const rowData = table.rows[row];
    if (!rowData) return;
    const cell = rowData.cells[col];
    if (!cell) return;
    // Simple split: divide into 2 columns
    const newCell1: WriterTableCell = {
      blocks: [...cell.blocks],
      properties: { ...cell.properties },
    };
    const newCell2: WriterTableCell = {
      blocks: [{
        id: crypto.randomUUID(),
        type: 'paragraph',
        content: [{ id: crypto.randomUUID(), type: 'text', text: '', formatting: {} }],
        attributes: {},
      }],
      properties: { ...cell.properties },
    };

    const newRows = table.rows.map((r, ri) => {
      if (ri !== row) return r;
      return {
        ...r,
        cells: [
          ...r.cells.slice(0, col),
          newCell1,
          newCell2,
          ...r.cells.slice(col + 1),
        ],
      };
    });

    updateTable({ ...table, rows: newRows });
  };

  // Border toggle
  const toggleBorder = (row: number, col: number, side: 'top' | 'bottom' | 'left' | 'right' | 'between') => {
    const rowData = table.rows[row];
    if (!rowData) return;
    const cell = rowData.cells[col];
    if (!cell) return;

    const newRows = table.rows.map((r, ri) => ({
      ...r,
      cells: r.cells.map((cell, ci) => {
        if (ri === row && ci === col) {
          const borders = { ...cell.properties.borders };
          if (borders[side]) {
            delete borders[side];
          } else {
            borders[side] = { style: 'single', size: 4, color: '000000' };
          }
          return { ...cell, properties: { ...cell.properties, borders } };
        }
        return cell;
      }),
    }));
    updateTable({ ...table, rows: newRows });
  };

  const isCellSelected = (row: number, col: number) => selectedCells.has(`${row}-${col}`);
  const isCellHovered = (row: number, col: number) => hoveredCell?.row === row && hoveredCell?.col === col;

  // Context menu position
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; row: number; col: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, row: number, col: number) => {
    if (readOnly) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, row, col });
    setSelectedCells(new Set([`${row}-${col}`]));
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const firstRow = table.rows[0];
  const hasTableData = (firstRow?.cells?.length ?? 0) > 0;
  const contextRow = contextMenu ? table.rows[contextMenu.row] : undefined;
  const hasContextCell = (contextRow?.cells?.length ?? 0) > (contextMenu?.col ?? 0);

  return (
    <div className="relative" onClick={() => setContextMenu(null)}>
      {/* Table toolbar */}
      {!readOnly && hasTableData && (
        <div className="mb-2 flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t">
          <div className="flex items-center gap-1 border-r pr-2 mr-2">
            <span className="text-xs text-gray-500">Filas:</span>
            <button onClick={() => insertRowAbove(0)} title="Insertar fila arriba" className="p-1 hover:bg-gray-200 rounded">
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={() => insertRowBelow(table.rows.length - 1)} title="Insertar fila abajo" className="p-1 hover:bg-gray-200 rounded">
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={() => deleteRow(0)} disabled={table.rows.length <= 1} title="Eliminar fila" className="p-1 hover:bg-gray-200 rounded opacity-50">
              <Minus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1 border-r pr-2 mr-2">
            <span className="text-xs text-gray-500">Columnas:</span>
            <button onClick={() => insertColLeft(0)} title="Insertar columna izquierda" className="p-1 hover:bg-gray-200 rounded">
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={() => insertColRight((firstRow?.cells.length || 1) - 1)} title="Insertar columna derecha" className="p-1 hover:bg-gray-200 rounded">
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={() => deleteCol(0)} disabled={(firstRow?.cells.length || 1) <= 1} title="Eliminar columna" className="p-1 hover:bg-gray-200 rounded opacity-50">
              <Minus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1 border-r pr-2 mr-2">
            <span className="text-xs text-gray-500">Celdas:</span>
            <button onClick={mergeCells} disabled={selectedCells.size < 2} title="Combinar celdas" className="p-1 hover:bg-gray-200 rounded">
              <Minimize2 className="w-4 h-4" />
            </button>
            <button onClick={() => {
              if (selectedCells.size === 1) {
                const key = Array.from(selectedCells)[0];
                if (!key) return;
                const parts = key.split('-');
                const r = Number(parts[0]) || 0;
                const c = Number(parts[1]) || 0;
                splitCell(r, c);
              }
            }} disabled={selectedCells.size !== 1} title="Dividir celda" className="p-1 hover:bg-gray-200 rounded">
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Bordes:</span>
            <button onClick={() => setShowBorderMenu({ row: 0, col: 0 })} title="Configurar bordes" className="p-1 hover:bg-gray-200 rounded">
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table
          ref={tableRef}
          className="border-collapse"
          style={{
            width: table.properties.width?.type === 'pct' ? '100%' : 'auto',
            tableLayout: table.properties.layout === 'fixed' ? 'fixed' : 'auto',
            borderSpacing: table.properties.cellSpacing || 0,
            minWidth: '100%',
          }}
        >
          <colgroup>
            {firstRow?.cells.map((_, colIndex) => (
              <col
                key={colIndex}
                style={{ width: `${colWidthsRef.current[colIndex] || 100 / (firstRow.cells.length)}%` }}
              />
            ))}
          </colgroup>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex} style={{ height: rowHeightsRef.current[rowIndex] || 'auto' }}>
                {row.cells.map((cell, colIndex) => (
                  <td
                    key={colIndex}
                    onMouseDown={(e) => handleCellMouseDown(rowIndex, colIndex, e)}
                    onMouseEnter={() => setHoveredCell({ row: rowIndex, col: colIndex })}
                    onMouseLeave={() => setHoveredCell(null)}
                    onContextMenu={(e) => handleContextMenu(e, rowIndex, colIndex)}
                    className={cn(
                      'relative min-w-[60px] min-h-[32px]',
                      isCellSelected(rowIndex, colIndex) && 'bg-blue-100 border-2 border-blue-500',
                      isCellHovered(rowIndex, colIndex) && 'bg-gray-50',
                    )}
                    style={{
                      verticalAlign: cell.properties.verticalAlignment || 'top',
                      padding: cell.properties.margins
                        ? `${cell.properties.margins.top / 20}pt ${cell.properties.margins.right / 20}pt ${cell.properties.margins.bottom / 20}pt ${cell.properties.margins.left / 20}pt`
                        : '4px 8px',
                      border: '1px solid #d1d5db',
                      backgroundColor: cell.properties.shading?.fill !== 'clear' && cell.properties.shading?.color
                        ? cell.properties.shading.color
                        : row.properties.header
                        ? '#f3f4f6'
                        : 'transparent',
                      fontWeight: row.properties.header ? 'bold' : 'normal',
                      cursor: resizing ? 'col-resize' : 'text',
                    }}
                    contentEditable={!readOnly}
                    onInput={(e) => {
                      const target = e.target as HTMLElement;
                      // Update cell content
                      const text = target.textContent || '';
                      // This would need proper content updating
                    }}
                  >
                    {cell.blocks.map((b, bi) => (
                      <div key={b.id} style={{ marginBottom: bi > 0 ? '4px' : 0 }}>
                        {b.content.map((c, ci) => (
                          <span
                            key={c.id}
                            style={{
                              fontWeight: c.formatting.bold ? 'bold' : 'normal',
                              fontStyle: c.formatting.italic ? 'italic' : 'normal',
                              textDecoration: [
                                c.formatting.underline ? 'underline' : '',
                                c.formatting.strikethrough ? 'line-through' : '',
                              ].filter(Boolean).join(' ') || 'none',
                              color: c.formatting.color,
                              backgroundColor: c.formatting.backgroundColor,
                              fontSize: c.formatting.fontSize ? `${c.formatting.fontSize}pt` : 'inherit',
                              fontFamily: c.formatting.fontFamily,
                              verticalAlign: c.formatting.superscript ? 'super' : c.formatting.subscript ? 'sub' : 'baseline',
                            }}
                          >
                            {c.text || (bi === cell.blocks.length - 1 && ci === b.content.length - 1 ? ' ' : '')}
                          </span>
                        ))}
                      </div>
                    ))}

                    {/* Column resize handle */}
                    {!readOnly && colIndex < row.cells.length - 1 && (
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500"
                        onMouseDown={(e) => handleColResizeStart(colIndex, e)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}

                    {/* Row resize handle */}
                    {!readOnly && rowIndex < table.rows.length - 1 && (
                      <div
                        className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize hover:bg-blue-500"
                        onMouseDown={(e) => handleRowResizeStart(rowIndex, e)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Column resize handles (top) */}
      {!readOnly && firstRow?.cells.length && (
        <div className="absolute top-0 left-0 right-0 h-1 pointer-events-none" style={{ zIndex: 10 }}>
          {firstRow.cells.map((_, colIndex) => (
            <div
              key={colIndex}
              className="absolute top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 pointer-events-auto"
              style={{ left: `${colWidthsRef.current.slice(0, colIndex + 1).reduce((a, b) => a + b, 0)}%` }}
              onMouseDown={(e) => handleColResizeStart(colIndex, e)}
            />
          ))}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && hasContextCell && (
        <div
          className="fixed z-50 rounded-md border border-gray-200 bg-white shadow-lg py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => { insertRowAbove(contextMenu.row); setContextMenu(null); }}
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
          >
            Insertar fila arriba
          </button>
          <button
            onClick={() => { insertRowBelow(contextMenu.row); setContextMenu(null); }}
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
          >
            Insertar fila abajo
          </button>
          <button
            onClick={() => { deleteRow(contextMenu.row); setContextMenu(null); }}
            disabled={table.rows.length <= 1}
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 disabled:opacity-50"
          >
            Eliminar fila
          </button>
          <hr className="my-1 border-gray-200" />
          <button
            onClick={() => { insertColLeft(contextMenu.col); setContextMenu(null); }}
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
          >
            Insertar columna izquierda
          </button>
          <button
            onClick={() => { insertColRight(contextMenu.col); setContextMenu(null); }}
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
          >
            Insertar columna derecha
          </button>
          <button
            onClick={() => { deleteCol(contextMenu.col); setContextMenu(null); }}
            disabled={(table.rows[0]?.cells.length || 1) <= 1}
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 disabled:opacity-50"
          >
            Eliminar columna
          </button>
          <hr className="my-1 border-gray-200" />
          <button
            onClick={() => { mergeCells(); setContextMenu(null); }}
            disabled={selectedCells.size < 2}
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 disabled:opacity-50"
          >
            Combinar celdas
          </button>
          <button
            onClick={() => {
              if (selectedCells.size === 1) {
                const key = Array.from(selectedCells)[0];
                if (!key) { setContextMenu(null); return; }
                const parts = key.split('-');
                const r = Number(parts[0]) || 0;
                const c = Number(parts[1]) || 0;
                splitCell(r, c);
              }
              setContextMenu(null);
            }}
            disabled={selectedCells.size !== 1}
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 disabled:opacity-50"
          >
            Dividir celda
          </button>
          <hr className="my-1 border-gray-200" />
          {contextMenu && (
          <>
          <button
            onClick={() => { toggleBorder(contextMenu.row, contextMenu.col, 'top'); setContextMenu(null); }}
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
          >
            Borde superior
          </button>
          <button
            onClick={() => { toggleBorder(contextMenu.row, contextMenu.col, 'bottom'); setContextMenu(null); }}
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
          >
            Borde inferior
          </button>
          <button
            onClick={() => { toggleBorder(contextMenu.row, contextMenu.col, 'left'); setContextMenu(null); }}
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
          >
            Borde izquierdo
          </button>
          <button
            onClick={() => { toggleBorder(contextMenu.row, contextMenu.col, 'right'); setContextMenu(null); }}
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
          >
            Borde derecho
          </button>
          <button
            onClick={() => { toggleBorder(contextMenu.row, contextMenu.col, 'top'); toggleBorder(contextMenu.row, contextMenu.col, 'bottom'); toggleBorder(contextMenu.row, contextMenu.col, 'left'); toggleBorder(contextMenu.row, contextMenu.col, 'right'); toggleBorder(contextMenu.row, contextMenu.col, 'between'); setContextMenu(null); }}
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
          >
            Todos los bordes
          </button>
          <button
            onClick={() => {
              const cell = table.rows[contextMenu.row]?.cells[contextMenu.col];
              if (!cell) { setContextMenu(null); return; }
              const newCell = { ...cell, properties: { ...cell.properties, borders: {} } };
              const newRows = table.rows.map((r, ri) => {
                if (ri !== contextMenu.row) return r;
                return {
                  ...r,
                  cells: r.cells.map((c, ci) => (ci === contextMenu.col ? newCell : c)),
                };
              });
              updateTable({ ...table, rows: newRows });
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 text-red-600"
          >
            Quitar todos los bordes
          </button>
          </>
          )}
        </div>
      )}
    </div>
  );
}

export default TableEditor;