import React, { useRef } from 'react';
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
  Link as LinkIcon,
  ImagePlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL do link', previousUrl || 'https://');

    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const addImageByUrl = () => {
    const url = window.prompt('URL da imagem', 'https://');
    if (!url || !url.trim()) return;
    editor.chain().focus().setImage({ src: url.trim() }).run();
  };

  const addImageFromComputer = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || '');
      if (!src) return;
      editor.chain().focus().setImage({ src }).run();
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="border-b bg-card px-2 py-1.5 sticky top-0 z-30">
      <div className="flex flex-wrap items-stretch gap-2">
        <div className="bg-transparent min-w-[420px] h-[66px] flex flex-col justify-between">
          <div className="px-1 pt-1 flex flex-wrap items-center gap-1.5">
            <select
              value={currentFont}
              onChange={(e) => setFontFamily(e.target.value)}
              className="h-7 rounded-md border bg-background px-2 text-sm"
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
              className="h-7 rounded-md border bg-background px-2 text-sm w-[64px]"
              title="Tamanho"
            >
              {FONT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size.replace('px', '')}
                </option>
              ))}
            </select>

            <Button type="button" variant="ghost" size="sm" className="h-7 px-1.5" onClick={() => bumpFont(1)} title="Aumentar fonte">A+</Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-1.5" onClick={() => bumpFont(-1)} title="Diminuir fonte">A-</Button>

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
          <div className="px-1 pb-0.5">
            <p className="text-[10px] text-muted-foreground text-center leading-none">Fonte</p>
          </div>
        </div>

        <div className="self-stretch w-px bg-border/70 mx-0.5" />

        <div className="bg-transparent min-w-[380px] h-[66px] flex flex-col justify-between">
          <div className="px-1 pt-1 flex flex-wrap items-center gap-1">
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

            <Separator orientation="vertical" className="h-6" />

            <ToolbarButton onClick={setLink} isActive={editor.isActive('link')} title="Adicionar link"><LinkIcon className="h-4 w-4" /></ToolbarButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Adicionar imagem">
                  <ImagePlus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
                  Upload do computador
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={addImageByUrl}>
                  Inserir URL
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) addImageFromComputer(file);
                e.currentTarget.value = '';
              }}
            />
          </div>
          <div className="px-1 pb-0.5">
            <p className="text-[10px] text-muted-foreground text-center leading-none">Paragrafo</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorToolbar;
