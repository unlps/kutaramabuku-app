import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Download, FileText, Eye } from 'lucide-react';

interface EditorHeaderProps {
  title: string;
  isSaving: boolean;
  onSave: () => void;
  onExportPDF: () => void;
  onExportDOCX: () => void;
  onTogglePreview: () => void;
  isPreviewMode: boolean;
}

const EditorHeader: React.FC<EditorHeaderProps> = ({
  title,
  isSaving,
  onSave,
  onExportPDF,
  onExportDOCX,
  onTogglePreview,
  isPreviewMode,
}) => {
  const navigate = useNavigate();

  return (
    <header className="border-b bg-card px-4 py-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/dashboard')}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-sm font-medium text-foreground truncate max-w-[200px]">
              {title || 'Sem título'}
            </h1>
            <p className="text-xs text-muted-foreground">Editor de Ebook</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="h-8"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onTogglePreview}
            className="h-8"
          >
            {isPreviewMode ? (
              <>
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Editar
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                Visualizar
              </>
            )}
          </Button>

          <Button
            size="sm"
            onClick={onExportPDF}
            className="h-8"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            PDF
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onExportDOCX}
            className="h-8"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            DOCX
          </Button>
        </div>
      </div>
    </header>
  );
};

export default EditorHeader;
