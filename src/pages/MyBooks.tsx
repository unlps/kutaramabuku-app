import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Eye, Download, ArrowLeft, Trash2, Edit, Globe, Lock } from "lucide-react";
import logo from "@/assets/logo-new.png";
import BottomNav from "@/components/BottomNav";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import jsPDF from "jspdf";
import { stripHtml } from "@/lib/utils";

interface Ebook {
  id: string;
  title: string;
  description: string;
  type: string;
  pages: number;
  views: number;
  downloads: number;
  cover_image: string;
  created_at: string;
  author: string | null;
  is_public: boolean;
}

const MyBooks = () => {
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [selectedEbook, setSelectedEbook] = useState<Ebook | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme } = useTheme();

  useEffect(() => {
    checkUser();
    fetchEbooks();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
  };

  const fetchEbooks = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: ebooksData } = await supabase
      .from("ebooks")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (ebooksData) {
      setEbooks(ebooksData);
    }
  };

  const handleTogglePublic = async (ebookId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("ebooks")
      .update({ is_public: !currentStatus })
      .eq("id", ebookId);
    
    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar a visibilidade",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: currentStatus ? "Livro privado" : "Livro público",
      description: currentStatus 
        ? "Agora apenas você pode ver este livro" 
        : "Agora todos podem ver este livro no Discover"
    });
    
    fetchEbooks();
    if (selectedEbook && selectedEbook.id === ebookId) {
      setSelectedEbook({ ...selectedEbook, is_public: !currentStatus });
    }
  };

  const handleDeleteEbook = async () => {
    if (!selectedEbook) return;

    const { error } = await supabase.from("ebooks").delete().eq("id", selectedEbook.id);
    
    if (error) {
      toast({
        title: "Erro ao apagar",
        description: "Não foi possível apagar o ebook",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Ebook apagado",
      description: "O ebook foi apagado com sucesso"
    });
    
    setSelectedEbook(null);
    fetchEbooks();
  };

  const handleDownloadEbook = async () => {
    if (!selectedEbook) return;

    try {
      const htmlToText = (html: string) => {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.textContent || temp.innerText || '';
      };

      const { data: chapters } = await supabase
        .from("chapters")
        .select("*")
        .eq("ebook_id", selectedEbook.id)
        .order("chapter_order", { ascending: true });

      const pdf = new jsPDF();
      let yPosition = 20;

      if (selectedEbook.cover_image) {
        try {
          const img = new Image();
          img.src = selectedEbook.cover_image;
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
          });
          
          // Get page dimensions
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          
          // Calculate dimensions to cover entire page
          const imgRatio = img.width / img.height;
          const pageRatio = pageWidth / pageHeight;
          
          let finalWidth, finalHeight, xOffset, yOffset;
          
          if (imgRatio > pageRatio) {
            // Image is wider - fit to height and crop width
            finalHeight = pageHeight;
            finalWidth = finalHeight * imgRatio;
            xOffset = (pageWidth - finalWidth) / 2;
            yOffset = 0;
          } else {
            // Image is taller - fit to width and crop height
            finalWidth = pageWidth;
            finalHeight = finalWidth / imgRatio;
            xOffset = 0;
            yOffset = (pageHeight - finalHeight) / 2;
          }
          
          pdf.addImage(img, 'JPEG', xOffset, yOffset, finalWidth, finalHeight);
        } catch (error) {
          console.error('Erro ao adicionar capa ao PDF:', error);
        }
      }

      pdf.addPage();
      yPosition = 20;

      pdf.setFontSize(24);
      const titleText = htmlToText(selectedEbook.title);
      const titleLines = pdf.splitTextToSize(titleText, 170);
      pdf.text(titleLines, 20, yPosition);
      yPosition += titleLines.length * 12 + 20;

      if (selectedEbook.author) {
        pdf.setFontSize(14);
        pdf.text(`Escrito por ${selectedEbook.author}`, 20, yPosition);
      }

      if (selectedEbook.description) {
        pdf.addPage();
        yPosition = 20;
        pdf.setFontSize(12);
        const descText = htmlToText(selectedEbook.description);
        const descLines = pdf.splitTextToSize(descText, 170);
        pdf.text(descLines, 20, yPosition);
      }

      chapters?.forEach((chapter) => {
        pdf.addPage();
        yPosition = 20;

        pdf.setFontSize(18);
        const chapterTitle = htmlToText(chapter.title);
        pdf.text(chapterTitle, 20, yPosition);
        yPosition += 15;

        pdf.setFontSize(12);
        const plainText = htmlToText(chapter.content);
        const contentLines = pdf.splitTextToSize(plainText, 170);
        
        contentLines.forEach((line: string) => {
          if (yPosition > 280) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(line, 20, yPosition);
          yPosition += 7;
        });
      });

      pdf.save(`${htmlToText(selectedEbook.title)}.pdf`);
      
      await supabase
        .from("ebooks")
        .update({ downloads: selectedEbook.downloads + 1 })
        .eq("id", selectedEbook.id);

      toast({
        title: "Download concluído",
        description: "O ebook foi baixado com sucesso"
      });
      
      fetchEbooks();
    } catch (error) {
      toast({
        title: "Erro no download",
        description: "Não foi possível fazer o download",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={logo} alt="Kutara Mabuku" className="w-10 h-10" />
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">Meus Livros</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pb-24">
        {ebooks.length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h4 className="text-lg font-semibold mb-2">Nenhum ebook ainda</h4>
            <p className="text-muted-foreground mb-4">
              Crie seu primeiro ebook para começar
            </p>
            <Button onClick={() => navigate("/create")}>
              Criar Ebook
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {ebooks.map(ebook => (
              <Card 
                key={ebook.id}
                className="p-3 hover:shadow-card transition-shadow cursor-pointer"
                onClick={() => setSelectedEbook(ebook)}
              >
                <div className="aspect-[2/3] bg-gradient-primary rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                  {ebook.cover_image ? (
                    <img src={ebook.cover_image} alt={ebook.title} className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="h-12 w-12 text-white" />
                  )}
                </div>
                <h4 className="font-semibold mb-1 text-sm line-clamp-1">
                  {stripHtml(ebook.title)}
                </h4>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                  {stripHtml(ebook.description || "Sem descrição")}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {ebook.views}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {ebook.downloads}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="flex items-center gap-1 text-xs">
                    {ebook.is_public ? (
                      <>
                        <Globe className="h-3 w-3 text-green-600" />
                        <span className="text-green-600">Público</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3 text-orange-600" />
                        <span className="text-orange-600">Privado</span>
                      </>
                    )}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <BottomNav />

      <Dialog open={!!selectedEbook} onOpenChange={() => setSelectedEbook(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="space-y-4">
            {selectedEbook?.cover_image && (
              <div className="flex justify-center">
                <img 
                  src={selectedEbook.cover_image} 
                  alt={selectedEbook.title}
                  className="w-48 h-auto rounded-lg border shadow-sm"
                />
              </div>
            )}
            
            <div className="space-y-3">
              <h2 className="text-lg font-semibold leading-none tracking-tight">
                {stripHtml(selectedEbook?.title || "")}
              </h2>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {stripHtml(selectedEbook?.description || "Sem descrição")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Criado em</p>
                <p className="font-medium">
                  {selectedEbook?.created_at 
                    ? new Date(selectedEbook.created_at).toLocaleDateString('pt-PT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })
                    : '-'
                  }
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Páginas</p>
                <p className="font-medium">{selectedEbook?.pages || 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Visualizações</p>
                <p className="font-medium flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {selectedEbook?.views}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Downloads</p>
                <p className="font-medium flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  {selectedEbook?.downloads}
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Visibilidade</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedEbook?.is_public 
                      ? "Livro visível para todos no Discover" 
                      : "Livro visível apenas para você"}
                  </p>
                </div>
                <Switch
                  checked={selectedEbook?.is_public || false}
                  onCheckedChange={() => selectedEbook && handleTogglePublic(selectedEbook.id, selectedEbook.is_public)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="destructive"
              onClick={handleDeleteEbook}
              className="w-full sm:w-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Apagar
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={handleDownloadEbook}
                className="flex-1 sm:flex-none"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button
                onClick={() => {
                  navigate(`/editor?id=${selectedEbook?.id}`);
                  setSelectedEbook(null);
                }}
                className="flex-1 sm:flex-none"
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyBooks;
