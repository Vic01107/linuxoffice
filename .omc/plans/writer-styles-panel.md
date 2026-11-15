# Plan: Writer Styles and Templates Panel (Phase 3)

## Requirements Summary

Create a comprehensive Styles and Templates sidebar panel for the Writer application that allows users to:
- View and apply existing paragraph, character, table, and list styles
- Create new styles from current formatting
- Modify existing styles (rename, change formatting, update basedOn/next)
- Organize styles (reorder, hide/show, delete custom styles)
- Import/export style sets (templates)
- Live preview of styles on selection

## Acceptance Criteria

1. **UI/UX**
   - [ ] Sidebar panel toggles via toolbar button (Styles icon)
   - [ ] Four tabs: Paragraph, Character, Table, List styles
   - [ ] Each style shows name, type badge, basedOn reference
   - [ ] Hover shows live preview tooltip
   - [ ] Click applies style to current selection
   - [ ] Right-click context menu: Modify, Duplicate, Delete, Rename
   - [ ] "New Style" button opens creation dialog
   - [ ] "Manage Styles" dialog for bulk operations
   - [ ] Keyboard accessible (WCAG 2.1 AA)

2. **Data Integration**
   - [ ] Reads `document.styles: WriterStyle[]` from state
   - [ ] Updates state via `updateStyles` callback
   - [ ] Applies style by updating block/content formatting
   - [ ] Maintains `basedOn` inheritance chain
   - [ ] Syncs with `docx-parser.service` and `docx-serializer.service`

3. **Style Operations**
   - [ ] Apply paragraph style to selected blocks
   - [ ] Apply character style to selected text runs
   - [ ] Apply table style to selected tables
   - [ ] Apply list style (numbering) to selected paragraphs
   - [ ] Create style from current selection formatting
   - [ ] Modify style updates all referencing blocks (live)
   - [ ] Delete custom styles (built-in protected)
   - [ ] Reorder styles in panel

4. **Templates**
   - [ ] Save current styles as template (.json)
   - [ ] Load template replaces/merges styles
   - [ ] Built-in templates: Normal, Modern, Classic, Academic
   - [ ] Template manager dialog

5. **Persistence**
   - [ ] Styles saved in DOCX via serializer
   - [ ] Styles loaded from DOCX via parser
   - [ ] User templates persisted to localStorage/IndexedDB

## Implementation Steps

### 1. Create StylesPanel Component (`apps/renderer/src/components/writer/StylesPanel.tsx`)
- Main panel with tabs for each style type
- Style list with virtualized rendering (@tanstack/react-virtual)
- Search/filter input
- Context menu integration (@radix-ui/react-context-menu)
- Keyboard navigation

### 2. Create StyleListItem Component (`apps/renderer/src/components/writer/StyleListItem.tsx`)
- Individual style row: name, type badge, basedOn indicator
- Hover preview tooltip
- Click handler for apply
- Context menu trigger
- Selected/highlighted state

### 3. Create StyleEditorDialog Component (`apps/renderer/src/components/writer/StyleEditorDialog.tsx`)
- Form for creating/modifying styles
- Fields: name, type, basedOn (select), next (select)
- Formatting controls (font, size, color, spacing, borders, shading)
- Live preview area
- Validation (unique name, valid basedOn chain)

### 4. Create TemplatesDialog Component (`apps/renderer/src/components/writer/TemplatesDialog.tsx`)
- List of built-in + user templates
- Save current as template
- Load template (replace/merge options)
- Delete user templates
- Export/import JSON

### 5. Create ManageStylesDialog Component (`apps/renderer/src/components/writer/ManageStylesDialog.tsx`)
- Bulk operations: show/hide, delete, reorder
- Drag-and-drop reordering (@dnd-kit)
- Filter by type, built-in vs custom
- Select all/none

### 6. Add Styles Panel State to WriterEditor (`apps/renderer/src/components/writer/WriterEditor.tsx`)
- `stylesPanelOpen` state
- `updateStyles` callback
- `applyStyle` helper (paragraph/character/table/list)
- Integration with existing formatting state
- Toolbar button for toggle

### 7. Extend docx-parser.service for Style Import (`apps/renderer/src/services/writer/docx-parser.service.ts`)
- Parse style definitions from styles.xml
- Handle basedOn/next relationships
- Extract table styles, numbering styles

### 8. Extend docx-serializer.service for Style Export (`apps/renderer/src/services/writer/docx-serializer.service.ts`)
- Serialize all styles to styles.xml
- Handle style inheritance
- Write table styles, numbering definitions

### 9. Add Built-in Style Definitions (`apps/renderer/src/data/writer/builtin-styles.ts`)
- Normal, Heading 1-9, Title, Subtitle, Quote, etc.
- Character styles: Strong, Emphasis, Hyperlink, etc.
- Table styles: Light/Medium/Dark List, Grid, etc.
- List styles: Numbered, Bulleted, Outline

### 10. Add Styles to Default Document State
- Initialize `document.styles` with built-in styles
- Ensure `DEFAULT_SETTINGS` includes style defaults

### 11. Add Tests
- Unit tests for style application logic
- Integration tests for panel interactions
- Snapshot tests for dialog components

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/renderer/src/components/writer/StylesPanel.tsx` | Create |
| `apps/renderer/src/components/writer/StyleListItem.tsx` | Create |
| `apps/renderer/src/components/writer/StyleEditorDialog.tsx` | Create |
| `apps/renderer/src/components/writer/TemplatesDialog.tsx` | Create |
| `apps/renderer/src/components/writer/ManageStylesDialog.tsx` | Create |
| `apps/renderer/src/components/writer/WriterEditor.tsx` | Modify (add panel, callbacks) |
| `apps/renderer/src/services/writer/docx-parser.service.ts` | Modify (style parsing) |
| `apps/renderer/src/services/writer/docx-serializer.service.ts` | Modify (style serialization) |
| `apps/renderer/src/data/writer/builtin-styles.ts` | Create |
| `apps/renderer/src/types/writer/document.ts` | Verify/extend if needed |
| `apps/renderer/src/lib/utils.ts` | Add style helpers if needed |

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Style inheritance complexity | Implement recursive resolution with cycle detection |
| Performance with many styles | Virtualize list, memoize style computations |
| DOCX round-trip fidelity | Comprehensive parser/serializer tests with real documents |
| Conflict with existing formatting | Clear precedence: direct formatting > style formatting |
| Accessibility | Use Radix UI primitives, test with screen readers |

## Verification Steps

1. Run `pnpm typecheck` - no errors
2. Run `pnpm build` - successful
3. Manual test: Open Writer, toggle Styles panel, apply Heading 1 to paragraph
4. Manual test: Create custom style, verify appears in panel, applies correctly
5. Manual test: Save template, reload app, load template
6. Manual test: Open DOCX with styles, verify styles panel populated
7. Manual test: Save DOCX, reopen, verify styles preserved
8. Run `pnpm test` - all pass

## ADR

**Decision**: Implement Styles Panel as a sidebar with tabbed interface using Radix UI components, integrated directly into WriterEditor state.

**Drivers**: 
- Office compatibility requires full style support
- User expectation: styles sidebar like Word/Writer
- Existing WriterStyle type already defined

**Alternatives Considered**:
- Modal dialog only - rejected: less discoverable, workflow interruption
- Floating panel - rejected: screen real estate, multi-monitor issues
- Separate "Styles" tab in ribbon - rejected: not standard Office pattern

**Why Chosen**: Sidebar panel matches Microsoft Word, LibreOffice Writer, Google Docs patterns. Radix UI provides accessible primitives. Direct state integration enables live updates.

**Consequences**: 
- Adds ~5 new components
- Modifies docx parser/serializer
- Requires built-in style definitions

**Follow-ups**:
- Style gallery in ribbon (future)
- Quick style set switching (future)
- Style inspector pane (future)