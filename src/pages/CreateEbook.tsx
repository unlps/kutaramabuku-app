import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, BookOpen, Upload, Sparkles, Type, Image, Minus, FileText, ArrowRight, Check, X } from "lucide-react";
import logo from "@/assets/logo-new.png";
import { EBOOK_TEMPLATES } from "@/components/templates/ebooks";
import { ebookSchema, chapterSchema } from "@/lib/validations";
type WizardStep = "origin" | "upload" | "mapping" | "metadata" | "template" | "complete";
type OriginType = "blank" | "import";
interface ParsedChapter {
  id: string;
  title: string;
  content: string;
  order: number;
}
const CreateEbook = () => {
  const [step, setStep] = useState<WizardStep>("origin");
  const [origin, setOrigin] = useState<OriginType | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedChapters, setParsedChapters] = useState<ParsedChapter[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [genres, setGenres] = useState<{
    id: string;
    name: string;
  }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [isFree, setIsFree] = useState<boolean>(true);
  const [price, setPrice] = useState<string>("0");
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    theme
  } = useTheme();
  useEffect(() => {
    checkUser();
    loadUserProfile();
    fetchGenres();
  }, []);
  const fetchGenres = async () => {
    const {
      data
    } = await supabase.from("genres").select("*").order("name");
    if (data) {
      setGenres(data);
    }
  };
  const checkUser = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };
  const loadUserProfile = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (session) {
      const {
        data: profile
      } = await supabase.from("profiles").select("full_name").eq("id", session.user.id).single();
      if (profile?.full_name) {
        setAuthor(profile.full_name);
      }
    }
  };
  const handleCreateEbook = async () => {
    if (!selectedTemplate) {
      toast({
        title: "Informações faltando",
        description: "Por favor, escolha um template",
        variant: "destructive"
      });
      return;
    }

    // Validate ebook metadata
    const validationResult = ebookSchema.safeParse({
      title,
      description,
      author
    });
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast({
        title: "Erro de validação",
        description: firstError.message,
        variant: "destructive"
      });
      return;
    }

    // Validate all chapters if imported
    if (origin === "import" && parsedChapters.length > 0) {
      for (const chapter of parsedChapters) {
        const chapterValidation = chapterSchema.safeParse(chapter);
        if (!chapterValidation.success) {
          const firstError = chapterValidation.error.errors[0];
          toast({
            title: "Erro de validação no capítulo",
            description: `${chapter.title}: ${firstError.message}`,
            variant: "destructive"
          });
          return;
        }
      }
    }
    setLoading(true);
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) return;

      // Upload cover image if provided
      let coverImageUrl = null;
      if (coverImage) {
        const fileExt = coverImage.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${session.user.id}/${fileName}`;
        const {
          error: uploadError
        } = await supabase.storage.from('ebook-covers').upload(filePath, coverImage);
        if (!uploadError) {
          const {
            data: {
              publicUrl
            }
          } = supabase.storage.from('ebook-covers').getPublicUrl(filePath);
          coverImageUrl = publicUrl;
        }
      }

      // Create ebook
      const {
        data: ebook,
        error
      } = await supabase.from("ebooks").insert({
        user_id: session.user.id,
        title,
        description,
        author,
        type: "standard",
        template_id: selectedTemplate,
        cover_image: coverImageUrl,
        genre: selectedGenre || null,
        price: isFree ? 0 : parseFloat(price) || 0,
        pages: origin === "import" ? parsedChapters.length : 0
      }).select().single();
      if (error) throw error;

      // If imported from file, save chapters
      if (origin === "import" && parsedChapters.length > 0) {
        const chaptersToInsert = parsedChapters.map(chapter => ({
          ebook_id: ebook.id,
          title: chapter.title,
          content: chapter.content,
          chapter_order: chapter.order
        }));
        const {
          error: chaptersError
        } = await supabase.from("chapters").insert(chaptersToInsert);
        if (chaptersError) throw chaptersError;
      }
      toast({
        title: "Ebook criado!",
        description: "Redirecionando para o editor..."
      });

      // Redirect to editor
      navigate(`/editor?id=${ebook.id}`);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    setIsUploading(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload file to storage
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const {
        error: uploadError
      } = await supabase.storage.from('ebook-uploads').upload(filePath, file);
      if (uploadError) throw uploadError;

      // Parse the file using edge function
      setIsParsing(true);
      const formData = new FormData();
      formData.append('file', file);
      const {
        data,
        error
      } = await supabase.functions.invoke('parse-ebook', {
        body: formData
      });
      if (error) throw error;
      setParsedChapters(data.chapters || []);
      setStep('mapping');
      toast({
        title: "Sucesso!",
        description: "Arquivo processado com sucesso"
      });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar arquivo",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setIsParsing(false);
    }
  };
  const handleChapterUpdate = (chapterId: string, field: 'title' | 'content', value: string) => {
    // Apply basic length validation on the fly
    if (field === 'title' && value.length > 200) {
      toast({
        title: "Título muito longo",
        description: "O título do capítulo deve ter no máximo 200 caracteres",
        variant: "destructive"
      });
      return;
    }
    if (field === 'content' && value.length > 100000) {
      toast({
        title: "Conteúdo muito longo",
        description: "O conteúdo do capítulo deve ter no máximo 100.000 caracteres",
        variant: "destructive"
      });
      return;
    }
    setParsedChapters(chapters => chapters.map(ch => ch.id === chapterId ? {
      ...ch,
      [field]: value
    } : ch));
  };
  const handleRemoveChapter = (chapterId: string) => {
    setParsedChapters(chapters => chapters.filter(ch => ch.id !== chapterId));
  };
  const handleNext = () => {
    if (step === "origin" && origin) {
      if (origin === "import") {
        setStep("upload");
      } else {
        setStep("metadata");
      }
    } else if (step === "mapping" && parsedChapters.length > 0) {
      setStep("metadata");
    } else if (step === "metadata" && title) {
      setStep("template");
    } else if (step === "template" && selectedTemplate) {
      handleCreateEbook();
    }
  };
  const handleBack = () => {
    if (step === "upload") {
      setStep("origin");
    } else if (step === "mapping") {
      setStep("upload");
    } else if (step === "metadata") {
      if (origin === "import") {
        setStep("mapping");
      } else {
        setStep("origin");
      }
    } else if (step === "template") {
      setStep("metadata");
    }
  };
  const originOptions = [{
    id: "blank" as const,
    name: "Criar do Zero",
    description: "Comece com um eBook em branco e crie seu conteúdo",
    icon: BookOpen,
    gradient: "from-[#70CBD4] to-[#69A1EB]",
    recommended: true
  }, {
    id: "import" as const,
    name: "Importar EPUB/PDF",
    description: "Faça upload de um arquivo existente para converter",
    icon: Upload,
    gradient: "from-[#70CBD4] to-[#69A1EB]",
    recommended: false
  }];
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => step === "origin" ? navigate("/dashboard") : handleBack()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={logo} alt="Kutara Mabuku" className="w-10 h-10 object-cover" />
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Criar Novo Ebook
              </h1>
              
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Step: Upload File */}
        {step === "upload" && <div className="max-w-2xl mx-auto">
            <Card className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold">Upload do Arquivo</h2>
                <p className="text-muted-foreground">
                  Faça upload do seu EPUB ou PDF
                </p>
              </div>

              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
                  <input type="file" accept=".epub,.pdf" onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }} className="hidden" id="file-upload-main" disabled={isUploading || isParsing} />
                  <label htmlFor="file-upload-main" className="cursor-pointer flex flex-col items-center gap-4">
                    <Upload className="w-12 h-12 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-medium">
                        {isUploading ? 'Fazendo upload...' : isParsing ? 'Processando arquivo...' : 'Clique para fazer upload'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Formatos aceitos: EPUB, PDF
                      </p>
                    </div>
                  </label>
                </div>
                {uploadedFile && <p className="text-sm text-center text-muted-foreground">
                    Arquivo selecionado: {uploadedFile.name}
                  </p>}
              </div>

              <Button variant="outline" onClick={handleBack} className="w-full">
                Voltar
              </Button>
            </Card>
          </div>}

        {/* Step: Chapter Mapping */}
        {step === "mapping" && <div className="max-w-4xl mx-auto">
            <Card className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold">Mapeamento de Capítulos</h2>
                <p className="text-muted-foreground">
                  Revise e edite os capítulos detectados
                </p>
              </div>

              <div className="flex items-center justify-between mb-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">
                  {parsedChapters.length} capítulo{parsedChapters.length !== 1 ? 's' : ''} detectado{parsedChapters.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {parsedChapters.map((chapter, index) => <Card key={chapter.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <Label htmlFor={`chapter-title-${chapter.id}`}>
                            Capítulo {index + 1}
                          </Label>
                          <Input id={`chapter-title-${chapter.id}`} value={chapter.title} onChange={e => handleChapterUpdate(chapter.id, 'title', e.target.value)} placeholder="Título do capítulo" />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveChapter(chapter.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div>
                        <Label htmlFor={`chapter-content-${chapter.id}`}>
                          Conteúdo (preview)
                        </Label>
                        <Textarea id={`chapter-content-${chapter.id}`} value={chapter.content.substring(0, 200) + (chapter.content.length > 200 ? '...' : '')} readOnly className="h-20 resize-none bg-muted" />
                      </div>
                    </div>
                  </Card>)}
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  Voltar
                </Button>
                <Button onClick={handleNext} disabled={parsedChapters.length === 0} className="flex-1 bg-gradient-primary hover:opacity-90">
                  Continuar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>}

        {/* Step: Select Origin */}
        {step === "origin" && <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Como deseja criar seu eBook?</h2>
              <p className="text-muted-foreground">
                Escolha entre começar do zero ou importar um arquivo existente
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {originOptions.map(option => <Card key={option.id} className={`p-6 cursor-pointer hover:shadow-glow transition-all border-2 ${origin === option.id ? "border-primary" : "hover:border-primary"}`} onClick={() => setOrigin(option.id)}>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${option.gradient} flex items-center justify-center`}>
                      <option.icon className="h-8 w-8 text-white" />
                    </div>
                    {option.recommended && <span className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-full">
                        Recomendado
                      </span>}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{option.name}</h3>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </Card>)}
            </div>

            <div className="flex justify-center">
              <Button onClick={handleNext} disabled={!origin} size="lg">
                Continuar
              </Button>
            </div>
          </div>}

        {/* Step: Metadata */}
        {step === "metadata" && <div className="max-w-2xl mx-auto">
            <Card className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold">Informações do eBook</h2>
                <p className="text-muted-foreground">
                  Preencha os dados básicos do seu eBook
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Título <span className="text-destructive">*</span>
                  </Label>
                  <Input id="title" placeholder="Digite o título do seu eBook" value={title} onChange={e => setTitle(e.target.value)} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="author">Autor</Label>
                  <Input id="author" placeholder="Nome do autor" value={author} onChange={e => setAuthor(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea id="description" placeholder="Descreva seu eBook..." value={description} onChange={e => setDescription(e.target.value)} rows={4} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="genre">Gênero</Label>
                  <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                    <SelectTrigger id="genre">
                      <SelectValue placeholder="Selecione um gênero" />
                    </SelectTrigger>
                    <SelectContent>
                      {genres.map(genre => <SelectItem key={genre.id} value={genre.name}>
                          {genre.name}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price-type">Tipo de Preço</Label>
                  <Select value={isFree ? "free" : "paid"} onValueChange={value => {
                setIsFree(value === "free");
                if (value === "free") setPrice("0");
              }}>
                    <SelectTrigger id="price-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Grátis</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {!isFree && <div className="space-y-2">
                    <Label htmlFor="price">Preço (MZN)</Label>
                    <Input id="price" type="number" min="0" step="0.01" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} />
                  </div>}

                <div className="space-y-2">
                  <Label htmlFor="cover">Capa (opcional)</Label>
                  <Input id="cover" type="file" accept="image/*" onChange={e => setCoverImage(e.target.files?.[0] || null)} className="cursor-pointer" />
                  {coverImage && <p className="text-sm text-muted-foreground">
                      Imagem selecionada: {coverImage.name}
                    </p>}
                </div>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  Voltar
                </Button>
                <Button onClick={handleNext} disabled={!title} className="flex-1 bg-gradient-primary hover:opacity-90">
                  Continuar
                </Button>
              </div>
            </Card>
          </div>}

        {/* Step: Select Template */}
        {step === "template" && <div className="max-w-6xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                <h2 className="text-3xl font-bold">Escolha um Template</h2>
              </div>
              <p className="text-muted-foreground">
                Selecione o layout visual para o seu eBook
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {EBOOK_TEMPLATES.map(template => {
            const templateIcon = template.id === "classic" ? Type : template.id === "visual" ? Image : template.id === "minimal" ? Minus : BookOpen;
            const TemplateIcon = templateIcon;
            return <Card key={template.id} className={`p-6 cursor-pointer hover:shadow-card transition-all border-2 ${selectedTemplate === template.id ? "border-primary" : ""}`} onClick={() => setSelectedTemplate(template.id)}>
                    {true && <div className="aspect-[3/4] bg-gradient-to-br from-muted to-muted/50 rounded-lg mb-4 flex items-center justify-center border-2 border-border relative overflow-hidden">
                        {template.id === "classic" && <div className="absolute inset-0 p-4 flex flex-col gap-2">
                            <div className="h-3 bg-foreground/80 w-3/4 rounded mx-auto"></div>
                            <div className="h-1 bg-foreground/20 w-full rounded"></div>
                            <div className="h-1 bg-foreground/20 w-full rounded"></div>
                            <div className="h-1 bg-foreground/20 w-4/5 rounded"></div>
                            <div className="flex-1 flex items-center justify-center">
                              <div className="w-16 h-16 bg-primary/20 rounded"></div>
                            </div>
                            <div className="h-1 bg-foreground/20 w-full rounded"></div>
                            <div className="h-1 bg-foreground/20 w-full rounded"></div>
                          </div>}
                        {template.id === "visual" && <div className="absolute inset-0 flex flex-col">
                            <div className="h-1/3 bg-primary/30"></div>
                            <div className="flex-1 p-4 space-y-2">
                              <div className="h-1 bg-foreground/20 w-full rounded"></div>
                              <div className="h-1 bg-foreground/20 w-full rounded"></div>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <div className="aspect-square bg-primary/20 rounded"></div>
                                <div className="aspect-square bg-primary/20 rounded"></div>
                              </div>
                            </div>
                          </div>}
                        {template.id === "minimal" && <div className="absolute inset-0 p-4 flex gap-2">
                            <div className="flex-1 space-y-2">
                              <div className="h-2 bg-foreground/80 w-2/3 rounded"></div>
                              <div className="h-1 bg-foreground/20 w-full rounded"></div>
                              <div className="h-1 bg-foreground/20 w-full rounded"></div>
                              <div className="h-1 bg-foreground/20 w-4/5 rounded"></div>
                              <div className="h-1 bg-foreground/20 w-full rounded"></div>
                            </div>
                            <div className="w-1/3 bg-primary/20 rounded"></div>
                          </div>}
                      </div>}
                    <h3 className="font-semibold mb-2">{template.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {template.description}
                    </p>
                  </Card>;
          })}
            </div>

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={handleBack}>
                Voltar
              </Button>
              <Button onClick={handleNext} disabled={!selectedTemplate || loading} className="bg-gradient-primary hover:opacity-90">
                {loading ? "Criando..." : "Criar eBook"}
              </Button>
            </div>
          </div>}
      </main>
    </div>;
};
export default CreateEbook;