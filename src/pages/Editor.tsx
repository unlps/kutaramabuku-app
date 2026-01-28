import { useState, useEffect, useCallback, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRobustEditor } from "@/hooks/useRobustEditor";
import { useEditorExport } from "@/hooks/useEditorExport";
import { RobustEditor, EditorHeader, EditorPreview, CoverTemplateSelector, EbookMetadataForm } from "@/components/Editor";
import CoverPreview from "@/components/CoverPreview";
import { CoverTemplate } from "@/components/templates/covers";
import { Loader2, Palette } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface Ebook {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  template_id: string | null;
  author: string | null;
  genre: string | null;
  price: number | null;
}

type EditorStep = 'metadata' | 'editor';

export default function Editor() {
  const [searchParams] = useSearchParams();
  const ebookId = searchParams.get("id");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [ebook, setEbook] = useState<Ebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [coverTemplate, setCoverTemplate] = useState<CoverTemplate>('classic');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [step, setStep] = useState<EditorStep>('metadata');

  const editorState = useRobustEditor(ebookId || '');

  const { handleExportPDF, handleExportDOCX } = useEditorExport({
    title: ebook?.title || 'Sem título',
    author: ebook?.author,
    genre: ebook?.genre,
    coverImage,
    coverTemplate,
    chapters: editorState.chapters,
  });

  const loadEbook = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: ebookData, error: ebookError } = await supabase
        .from("ebooks")
        .select("*")
        .eq("id", ebookId)
        .single();

      if (ebookError) throw ebookError;

      setEbook(ebookData);
      setCoverImage(ebookData.cover_image);
      
      if (ebookData.template_id) {
        setCoverTemplate(ebookData.template_id as CoverTemplate);
      }
    } catch (error: unknown) {
      toast({
        title: "Erro ao carregar ebook",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [ebookId, navigate, toast]);

  useEffect(() => {
    if (!ebookId) {
      navigate("/dashboard");
      return;
    }
    loadEbook();
  }, [ebookId, loadEbook, navigate]);

  const handleMetadataContinue = async (updatedEbook: Ebook, newCoverImage: File | null) => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let newCoverUrl = updatedEbook.cover_image;

      // Upload new cover if provided
      if (newCoverImage) {
        const fileExt = newCoverImage.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${session.user.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('ebook-covers')
          .upload(filePath, newCoverImage);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('ebook-covers')
            .getPublicUrl(filePath);
          newCoverUrl = publicUrl;
        }
      }

      // Update ebook in database
      const { error } = await supabase
        .from("ebooks")
        .update({
          title: updatedEbook.title,
          description: updatedEbook.description,
          author: updatedEbook.author,
          genre: updatedEbook.genre,
          price: updatedEbook.price,
          cover_image: newCoverUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", updatedEbook.id);

      if (error) throw error;

      // Update local state
      setEbook({ ...updatedEbook, cover_image: newCoverUrl });
      setCoverImage(newCoverUrl);
      setStep('editor');

      toast({
        title: "Informações atualizadas!",
        description: "Agora você pode editar o conteúdo do ebook.",
      });
    } catch (error: unknown) {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!ebook) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("ebooks")
        .update({
          template_id: coverTemplate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ebook.id);

      if (error) throw error;

      toast({ title: "Salvo com sucesso!", description: "Seu ebook foi salvo." });
    } catch (error: unknown) {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando editor...</p>
        </div>
      </div>
    );
  }

  if (!ebook) return null;

  // Show metadata form first
  if (step === 'metadata') {
    return (
      <EbookMetadataForm
        ebook={ebook}
        onContinue={handleMetadataContinue}
        onBack={() => navigate("/dashboard")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div 
        className="export-cover-container"
        style={{ position: 'absolute', left: '-9999px', top: 0, width: '8.5in', height: '11in', overflow: 'hidden', backgroundColor: '#ffffff' }}
      >
        <CoverPreview template={coverTemplate} title={ebook.title} author={ebook.author} coverImage={coverImage} genre={ebook.genre} />
      </div>

      <EditorHeader
        title={ebook.title}
        isSaving={saving || editorState.isSaving}
        onSave={handleSave}
        onExportPDF={handleExportPDF}
        onExportDOCX={handleExportDOCX}
        onTogglePreview={() => setIsPreviewMode(!isPreviewMode)}
        isPreviewMode={isPreviewMode}
      />

      <div className="border-b bg-card/50 px-4 py-2 flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setStep('metadata')}
          className="h-8 text-muted-foreground hover:text-foreground"
        >
          Editar Informações
        </Button>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Palette className="h-3.5 w-3.5 mr-1.5" />
              Template: {coverTemplate.charAt(0).toUpperCase() + coverTemplate.slice(1)}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>Escolher Template de Capa</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <CoverTemplateSelector
                selectedTemplate={coverTemplate}
                onSelectTemplate={setCoverTemplate}
                title={ebook.title}
                author={ebook.author}
                coverImage={coverImage}
                genre={ebook.genre}
              />
              <div className="mt-6">
                <h4 className="text-sm font-medium text-foreground mb-3">Prévia</h4>
                <div className="border rounded-lg overflow-hidden shadow-md mx-auto" style={{ width: '300px', height: '388px' }}>
                  <div style={{ transform: 'scale(0.35)', transformOrigin: 'top left', width: '8.5in', height: '11in' }}>
                    <CoverPreview template={coverTemplate} title={ebook.title} author={ebook.author} coverImage={coverImage} genre={ebook.genre} />
                  </div>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <span className="text-xs text-muted-foreground">
          {editorState.chapters.length} capítulo{editorState.chapters.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex-1 overflow-hidden">
        {isPreviewMode ? (
          <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <EditorPreview title={ebook.title} author={ebook.author} genre={ebook.genre} coverImage={coverImage} coverTemplate={coverTemplate} chapters={editorState.chapters} />
          </Suspense>
        ) : (
          <div className="h-full">
            <RobustEditor ebookId={ebook.id} />
          </div>
        )}
      </div>
    </div>
  );
}
