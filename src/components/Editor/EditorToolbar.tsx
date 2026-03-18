import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Pilcrow,
  Eraser,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface ToolbarProps {
  editor: Editor | null;
}

const FONT_FAMILIES = ['Times New Roman', 'Arial', 'Calibri', 'Georgia', 'Verdana', 'Courier New'];
const FONT_SIZES = ['10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];

const ToolbarButton = ({
  onClick,
  isActive = false,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  children?: React.ReactNode;
  title?: string;
}) => (
  <Button
    type="button"
    variant={isActive ? 'default' : 'ghost'}
    size="sm"
    onClick={onClick}
    title={title}
    className={cn('h-8 w-8 p-0', isActive && 'bg-primary text-primary-foreground')}
  >
    {children}
  </Button>
);

const EditorToolbar: React.FC<ToolbarProps> = ({ editor }) => {
  if (!editor) return null;

  const textStyleAttrs = editor.getAttributes('textStyle') as {
    fontFamily?: string;
    fontSize?: string;
    verticalAlign?: string;
  };

  const currentFont = textStyleAttrs.fontFamily || 'Times New Roman';
  const currentSize = textStyleAttrs.fontSize || '12px';

  const setFontFamily = (font: string) => {
    editor.chain().focus().setMark('textStyle', { fontFamily: font }).run();
  };

  const setFontSize = (size: string) => {
    editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
  };

  const getFontSizeNumber = () => {
    const num = parseInt((textStyleAttrs.fontSize || '12px').replace('px', ''), 10);
    return Number.isNaN(num) ? 12 : num;
  };

  const bumpFont = (delta: number) => {
    const next = Math.max(8, Math.min(72, getFontSizeNumber() + delta));
    setFontSize(`${next}px`);
  };

  const toggleSuper = () => {
    const active = textStyleAttrs.verticalAlign === 'super';
    editor.chain().focus().setMark('textStyle', { verticalAlign: active ? null : 'super' }).run();
  };

  const toggleSub = () => {
    const active = textStyleAttrs.verticalAlign === 'sub';
    editor.chain().focus().setMark('textStyle', { verticalAlign: active ? null : 'sub' }).run();
  };

  return (
    <div className="border-b bg-card px-3 py-2">
      <div className="flex flex-wrap items-start gap-3">
        <div className="rounded-lg border bg-background min-w-[420px] h-[78px] flex flex-col justify-between">
          <div className="px-2 pt-2 flex flex-wrap items-center gap-2">
            <select
              value={currentFont}
              onChange={(e) => setFontFamily(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-sm"
              title="Fonte"
            >
              {FONT_FAMILIES.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>

            <select
              value={currentSize}
              onChange={(e) => setFontSize(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-sm w-[76px]"
              title="Tamanho"
            >
              {FONT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size.replace('px', '')}
                </option>
              ))}
            </select>

            <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => bumpFont(1)} title="Aumentar fonte">A+</Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => bumpFont(-1)} title="Diminuir fonte">A-</Button>

            <Separator orientation="vertical" className="h-6" />

            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Negrito"><Bold className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italico"><Italic className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Sublinhado"><Underline className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Tachado"><Strikethrough className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton onClick={toggleSub} isActive={textStyleAttrs.verticalAlign === 'sub'} title="Subscrito"><Subscript className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton onClick={toggleSuper} isActive={textStyleAttrs.verticalAlign === 'super'} title="Sobrescrito"><Superscript className="h-4 w-4" /></ToolbarButton>

            <label className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md hover:bg-accent cursor-pointer" title="Cor do texto">
              <span className="text-sm">A</span>
              <input type="color" className="sr-only" onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} />
            </label>

            <label className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md hover:bg-accent cursor-pointer" title="Realce">
              <span className="text-sm">H</span>
              <input type="color" className="sr-only" onChange={(e) => editor.chain().focus().setMark('textStyle', { backgroundColor: e.target.value }).run()} />
            </label>

            <ToolbarButton onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Limpar formatacao"><Eraser className="h-4 w-4" /></ToolbarButton>
          </div>
          <div className="px-2 pb-1">
            <p className="text-[10px] text-muted-foreground text-center leading-none">Fonte</p>
          </div>
        </div>

        <div className="rounded-lg border bg-background min-w-[340px] h-[78px] flex flex-col justify-between">
          <div className="px-2 pt-2 flex flex-wrap items-center gap-1">
            <ToolbarButton onClick={() => editor.chain().focus().setParagraph().run()} isActive={editor.isActive('paragraph')} title="Paragrafo"><Pilcrow className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullets"><List className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Numeracao"><ListOrdered className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().liftListItem('listItem').run()} title="Diminuir recuo"><ArrowLeft className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().sinkListItem('listItem').run()} title="Aumentar recuo"><ArrowRight className="h-4 w-4" /></ToolbarButton>

            <Separator orientation="vertical" className="h-6" />

            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Alinhar esquerda"><AlignLeft className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Centralizar"><AlignCenter className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Alinhar direita"><AlignRight className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} title="Justificar"><AlignJustify className="h-4 w-4" /></ToolbarButton>
          </div>
          <div className="px-2 pb-1">
            <p className="text-[10px] text-muted-foreground text-center leading-none">Paragrafo</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorToolbar;
