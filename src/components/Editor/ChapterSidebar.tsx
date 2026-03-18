import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Chapter } from '@/types/editor';
import { GripVertical, Plus, Trash2, FileText, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

interface ChapterSidebarProps {
  chapters: Chapter[];
  activeChapterId: string | null;
  onSelect: (id: string) => void;
  onReorder: (chapters: Chapter[]) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

const ChapterSidebar: React.FC<ChapterSidebarProps> = ({
  chapters,
  activeChapterId,
  onSelect,
  onReorder,
  onAdd,
  onDelete,
  onRename,
}) => {
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const startRename = (chapterId: string, currentTitle: string) => {
    setEditingChapterId(chapterId);
    setEditingTitle(currentTitle || '');
  };

  const commitRename = () => {
    if (!editingChapterId) return;
    onRename(editingChapterId, editingTitle);
    setEditingChapterId(null);
    setEditingTitle('');
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(chapters);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      chapter_order: index,
    }));

    onReorder(updatedItems);
  };

  return (
    <div className="h-full flex flex-col bg-card border-r">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Capitulos</h2>
        <Button variant="ghost" size="sm" onClick={onAdd} className="h-8 w-8 p-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="chapters">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="p-2">
                {chapters.map((chapter, index) => (
                  <Draggable key={chapter.id} draggableId={chapter.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          'group flex items-center gap-2 p-2 rounded-md cursor-pointer mb-1 transition-colors',
                          snapshot.isDragging && 'bg-accent shadow-lg',
                          activeChapterId === chapter.id
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'hover:bg-muted'
                        )}
                        onClick={() => onSelect(chapter.id)}
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>

                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                        {editingChapterId === chapter.id ? (
                          <Input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                commitRename();
                              }
                              if (e.key === 'Escape') {
                                setEditingChapterId(null);
                                setEditingTitle('');
                              }
                            }}
                            onBlur={commitRename}
                            autoFocus
                            className="h-7 text-sm"
                          />
                        ) : (
                          <span className="flex-1 truncate text-sm">{chapter.title || 'Sem titulo'}</span>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            startRename(chapter.id, chapter.title);
                          }}
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(chapter.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {chapters.length === 0 && (
          <div className="p-4 text-center text-muted-foreground text-sm">
            Nenhum capitulo ainda. Clique em + para adicionar.
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ChapterSidebar;
