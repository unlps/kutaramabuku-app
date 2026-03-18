import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRobustEditor } from "@/hooks/useRobustEditor";
import { useEditorExport } from "@/hooks/useEditorExport";
import { RobustEditor, EditorHeader, EditorPreview, EbookMetadataForm } from "@/components/Editor";
import CoverPreview from "@/components/CoverPreview";
import { coverTemplates, CoverTemplate } from "@/components/templates/covers";
import { ArrowLeft, Loader2, Palette, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getEbookReviewState,
  loadLatestSubmissions,
  type LatestSubmission,
} from "@/lib/review-status";

interface Ebook {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  template_id: string | null;
  author: string | null;
  genre: string | null;
  price: number | null;
  is_public: boolean | null;
  published_at: string | null;
}

type EditorStep = "metadata" | "template" | "editor";

export default function Editor() {
  const [searchParams] = useSearchParams();
  const ebookId = searchParams.get("id");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [ebook, setEbook] = useState<Ebook | null>(null);
  const [latestSubmission, setLatestSubmission] = useState<LatestSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [coverTemplate, setCoverTemplate] = useState<CoverTemplate>("none");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [step, setStep] = useState<EditorStep>("editor");

  const reviewState = useMemo(
    () => getEbookReviewState(ebook?.is_public, latestSubmission),
    [ebook?.is_public, latestSubmission]
  );

  const editorState = useRobustEditor(ebookId || "", reviewState.canEdit);

  const { handleExportPDF, handleExportDOCX } = useEditorExport({
    title: ebook?.title || "Sem titulo",
    author: ebook?.author,
    genre: ebook?.genre,
    coverImage,
    coverTemplate,
    chapters: editorState.chapters,
  });

  const loadEbook = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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

      const submissionMap = await loadLatestSubmissions(ebookId ? [ebookId] : []);
      setLatestSubmission(ebookId ? submissionMap.get(ebookId) || null : null);

      setEbook(ebookData);
      setCoverImage(ebookData.cover_image);

      if (ebookData.template_id) {
        setCoverTemplate(ebookData.template_id as CoverTemplate);
      }
    } catch (error: unknown) {
      toast({
        title: "Erro ao carregar ebook",
        description: error instanceof Error ? error.message : "Erro desconhecido",
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

  useEffect(() => {
    if (reviewState.readOnlyOnly) {
      setIsPreviewMode(true);
      setStep("editor");
    }
  }, [reviewState.readOnlyOnly]);

  const handleMetadataContinue = async (updatedEbook: Ebook, newCoverImage: File | null) => {
    if (!reviewState.canEdit) {
      toast({
        title: "Edição bloqueada",
        description: reviewState.description,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      let newCoverUrl = updatedEbook.cover_image;

      if (newCoverImage) {
        const fileExt = newCoverImage.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${session.user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("ebook-covers")
          .upload(filePath, newCoverImage);

        if (!uploadError) {
          const {
            data: { publicUrl },
          } = supabase.storage.from("ebook-covers").getPublicUrl(filePath);
          newCoverUrl = publicUrl;
        }
      }

      const { error } = await supabase
        .from("ebooks")
        .update({
          title: updatedEbook.title,
          description: updatedEbook.description,
          author: updatedEbook.author,
          genre: updatedEbook.genre,
          price: updatedEbook.price,
          cover_image: newCoverUrl,
          is_public: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", updatedEbook.id);

      if (error) throw error;

      setEbook({ ...updatedEbook, cover_image: newCoverUrl });
      setCoverImage(newCoverUrl);
      setStep("editor");

      toast({
        title: "Informações atualizadas",
        description: "Dados atualizados com sucesso.",
      });
    } catch (error: unknown) {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!ebook) return;

    if (!reviewState.canEdit) {
      toast({
        title: "Edição bloqueada",
        description: reviewState.description,
        variant: "destructive",
      });
      return;
    }

    if (!coverImage && coverTemplate === "none") {
      toast({
        title: "Template obrigatório",
        description: "Sem imagem de capa, selecione um template diferente de Nenhum.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("ebooks")
        .update({
          template_id: coverTemplate,
          is_public: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ebook.id);

      if (error) throw error;

      toast({
        title: "Salvo com sucesso",
        description: "O livro continua privado até aprovação dos reviewers.",
      });
    } catch (error: unknown) {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateContinue = async () => {
    if (!ebook) return;

    if (!reviewState.canEdit) {
      toast({
        title: "Edição bloqueada",
        description: reviewState.description,
        variant: "destructive",
      });
      return;
    }

    if (!coverImage && coverTemplate === "none") {
      toast({
        title: "Template obrigatório",
        description: "Sem imagem de capa, selecione um template diferente de Nenhum.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("ebooks")
        .update({
          template_id: coverTemplate,
          is_public: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ebook.id);

      if (error) throw error;

      toast({
        title: "Template salvo",
        description: "Template aplicado com sucesso.",
      });
      setStep("editor");
    } catch (error: unknown) {
      toast({
        title: "Erro ao salvar template",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!ebook) return;

    if (!coverImage && coverTemplate === "none") {
      toast({
        title: "Template obrigatório",
        description: "Sem imagem de capa, selecione um template diferente de Nenhum antes de submeter.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await (supabase as any).rpc("submit_book_for_review", {
        p_ebook_id: ebook.id,
      });

      toast({
        title: "Livro enviado para avaliação",
        description: "O livro ficou bloqueado até resposta dos reviewers.",
      });

      setShowSubmitDialog(false);
      await loadEbook();
      setIsPreviewMode(true);
    } catch (error: unknown) {
      toast({
        title: "Erro ao submeter",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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

  if (step === "metadata") {
    return (
      <EbookMetadataForm
        ebook={ebook}
        onContinue={handleMetadataContinue}
        onBack={() => setStep("editor")}
      />
    );
  }

  if (step === "template") {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setStep("editor")} className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-sm font-medium text-foreground">Template de Capa</h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                <h2 className="text-3xl font-bold">Escolher Template de Capa</h2>
              </div>
              <p className="text-muted-foreground">
                Se você fez upload de uma capa personalizada, selecione "Nenhum" para usar sua imagem sem sobreposição de template.
              </p>
            </div>

            <div className="border rounded-xl bg-card p-4 md:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
                <div className="space-y-3 max-h-[540px] overflow-auto pr-1">
                  {coverTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setCoverTemplate(template.id)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        coverTemplate === template.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                      title={template.description}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-20 rounded-md overflow-hidden border bg-muted flex-shrink-0 relative">
                          {template.id === "none" && coverImage ? (
                            <img src={coverImage} alt="Capa selecionada" className="w-full h-full object-cover" />
                          ) : (
                            <div className="absolute inset-0 origin-top-left scale-[0.08]" style={{ width: "8.5in", height: "11in" }}>
                              <CoverPreview
                                template={template.id}
                                title={ebook.title || "Titulo"}
                                author={ebook.author}
                                coverImage={coverImage}
                                genre={ebook.genre}
                              />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{template.name}</p>
                          <p className="text-xs text-muted-foreground">{template.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex flex-col items-center justify-center">
                  <h4 className="text-sm font-medium text-foreground mb-3">Prévia</h4>
                  <div className="border rounded-lg overflow-hidden shadow-md" style={{ width: "300px", height: "388px" }}>
                    {coverTemplate === "none" && coverImage ? (
                      <img src={coverImage} alt={ebook.title} className="w-full h-full object-cover" />
                    ) : (
                      <div style={{ transform: "scale(0.35)", transformOrigin: "top left", width: "8.5in", height: "11in" }}>
                        <CoverPreview
                          template={coverTemplate}
                          title={ebook.title}
                          author={ebook.author}
                          coverImage={coverImage}
                          genre={ebook.genre}
                        />
                      </div>
                    )}
                  </div>
                  {!coverImage && coverTemplate === "none" && (
                    <p className="text-xs text-destructive mt-3 text-center">
                      Sem imagem de capa, selecione um template diferente de Nenhum.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={handleTemplateContinue}
                disabled={saving || (!coverImage && coverTemplate === "none")}
                className="bg-gradient-primary hover:opacity-90"
              >
                {saving ? "Salvando..." : "Continuar"}
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const submitLabel =
    latestSubmission?.status === "revision_requested" || latestSubmission?.status === "rejected"
      ? "Submeter novamente"
      : "Submeter para publicação";

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      <div
        className="export-cover-container"
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: "8.5in",
          height: "11in",
          overflow: "hidden",
          backgroundColor: "#ffffff",
        }}
      >
        <CoverPreview
          template={coverTemplate}
          title={ebook.title}
          author={ebook.author}
          coverImage={coverImage}
          genre={ebook.genre}
        />
      </div>

      <EditorHeader
        title={ebook.title}
        isSaving={saving || editorState.isSaving || submitting}
        onSave={handleSave}
        onExportPDF={handleExportPDF}
        onExportDOCX={handleExportDOCX}
        onTogglePreview={() => setIsPreviewMode((prev) => !prev)}
        isPreviewMode={isPreviewMode}
        statusLabel={reviewState.label}
        statusClassName={reviewState.badgeClassName}
        canSave={reviewState.canEdit}
        canSubmit={reviewState.canSubmit}
        submitLabel={submitLabel}
        onSubmitForReview={() => setShowSubmitDialog(true)}
      />

      <div className="border-b bg-card/50 px-4 py-2 flex items-center gap-4 flex-wrap">
        {reviewState.canEdit ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep("metadata")}
              className="h-8 text-muted-foreground hover:text-foreground"
            >
              Editar Informações
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setStep("template")}>
              <Palette className="h-3.5 w-3.5 mr-1.5" />
              Editar Template: {coverTemplate !== "none" ? coverTemplate : "Nenhum"}
            </Button>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">{reviewState.description}</span>
        )}
        <span className="text-xs text-muted-foreground">
          {editorState.chapters.length} capítulo{editorState.chapters.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex-1 overflow-hidden">
        {isPreviewMode || reviewState.readOnlyOnly ? (
          <div className="h-full overflow-hidden">
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              }
            >
              <EditorPreview
                title={ebook.title}
                author={ebook.author}
                genre={ebook.genre}
                coverImage={coverImage}
                coverTemplate={coverTemplate}
                chapters={editorState.chapters}
              />
            </Suspense>
          </div>
        ) : (
          <div className="h-full">
            <RobustEditor editorState={editorState} />
          </div>
        )}
      </div>

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar submissão</AlertDialogTitle>
            <AlertDialogDescription>
              Depois de submeter este livro para publicação, o editor ficará bloqueado até a resposta dos reviewers.
              Tem certeza que quer enviar o livro para avaliação?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitForReview}>
              Confirmar submissão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
