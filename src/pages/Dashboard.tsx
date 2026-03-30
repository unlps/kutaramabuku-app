import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { stripHtml } from "@/lib/utils";
import {
  getEbookReviewState,
  loadLatestSubmissions,
  type LatestSubmission,
} from "@/lib/review-status";
import {
  Plus,
  BookOpen,
  Eye,
  Download,
  MessageSquare,
  ChevronRight,
  Trash2,
  Edit,
  Globe,
  Lock,
  Clock,
} from "lucide-react";
import logo from "@/assets/logo-new.png";
import BottomNav from "@/components/BottomNav";
import { openStoredEbookExport } from "@/services/ebookDownloadService";

interface Profile {
  full_name: string;
  email?: string;
}

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
  genre: string | null;
  price: number | null;
  is_public: boolean | null;
}

interface Template {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  suggested_pages: string;
}

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const Dashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedEbook, setSelectedEbook] = useState<Ebook | null>(null);
  const [submissionMap, setSubmissionMap] = useState<Record<string, LatestSubmission>>({});
  const [stats, setStats] = useState({
    totalViews: 0,
    totalDownloads: 0,
    totalEbooks: 0,
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
    fetchData();
  }, []);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    if (data) setProfile(data);
  };

  const fetchData = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return;

    const { data: ebooksData } = await supabase
      .from("ebooks")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(6);

    if (ebooksData) {
      setEbooks(ebooksData);
      setStats({
        totalViews: ebooksData.reduce((sum, book) => sum + (book.views || 0), 0),
        totalDownloads: ebooksData.reduce((sum, book) => sum + (book.downloads || 0), 0),
        totalEbooks: ebooksData.length,
      });

      const latestSubmissions = await loadLatestSubmissions(ebooksData.map((book) => book.id));
      setSubmissionMap(Object.fromEntries(latestSubmissions.entries()));
    }

    const { data: templatesData } = await supabase.from("templates").select("*").limit(3);
    if (templatesData) setTemplates(templatesData);
  };

  const handleDeleteEbook = async () => {
    if (!selectedEbook) return;

    const selectedState = getEbookReviewState(
      selectedEbook.is_public,
      submissionMap[selectedEbook.id]
    );

    if (!selectedState.canEdit) {
      toast({
        title: "Edicao bloqueada",
        description: selectedState.description,
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("ebooks").delete().eq("id", selectedEbook.id);

    if (error) {
      toast({
        title: "Erro ao apagar",
        description: "Nao foi possivel apagar o ebook.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Ebook apagado",
      description: "O ebook foi apagado com sucesso.",
    });

    setSelectedEbook(null);
    fetchData();
  };

  const handleDownloadEbook = async () => {
    if (!selectedEbook) return;

    try {
      await openStoredEbookExport(selectedEbook.id);

      await supabase
        .from("ebooks")
        .update({ downloads: (selectedEbook.downloads || 0) + 1 })
        .eq("id", selectedEbook.id);

      toast({
        title: "Download concluido",
        description: "O ebook foi aberto a partir do aplicativo.",
      });

      fetchData();
    } catch {
      toast({
        title: "Erro no download",
        description: "Exporte primeiro o ebook no editor para guardalo no aplicativo.",
        variant: "destructive",
      });
    }
  };

  const renderStateBadge = (ebook: Ebook) => {
    const state = getEbookReviewState(ebook.is_public, submissionMap[ebook.id]);
    const icon =
      state.stage === "approved" ? (
        <Globe className="h-3 w-3" />
      ) : state.stage === "under_review" ? (
        <Clock className="h-3 w-3" />
      ) : (
        <Lock className="h-3 w-3" />
      );

    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium ${state.badgeClassName}`}>
        {icon}
        {state.label}
      </span>
    );
  };

  const selectedSubmission = selectedEbook ? submissionMap[selectedEbook.id] : undefined;
  const selectedState = getEbookReviewState(selectedEbook?.is_public, selectedSubmission);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Kutara Mabuku" className="h-10 w-10 object-cover" />
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">Kutara Mabuku</h1>
          </div>
          <Button onClick={() => navigate("/conversas")} variant="ghost" size="icon">
            <MessageSquare className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto space-y-8 px-4 py-8 pb-24">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="bg-gradient-card p-6 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Ebooks</p>
                <p className="text-2xl font-bold">{stats.totalEbooks}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-card p-6 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
                <Eye className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Visualizacoes</p>
                <p className="text-2xl font-bold">{stats.totalViews}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-card p-6 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Download className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Downloads</p>
                <p className="text-2xl font-bold">{stats.totalDownloads}</p>
              </div>
            </div>
          </Card>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold">Meus Livros</h3>
            <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate("/my-books")}>
              Ver todos <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          {ebooks.length === 0 ? (
            <Card className="p-12 text-center">
              <BookOpen className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h4 className="mb-2 text-lg font-semibold">Nenhum ebook ainda</h4>
              <p className="mb-4 text-muted-foreground">Crie seu primeiro ebook para comecar.</p>
              <Button onClick={() => navigate("/create")}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Ebook
              </Button>
            </Card>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {ebooks.map((ebook) => (
                <Card
                  key={ebook.id}
                  className="w-48 flex-shrink-0 cursor-pointer border p-3 transition-shadow hover:shadow-card"
                  onClick={() => setSelectedEbook(ebook)}
                >
                  <div className="mb-3 aspect-[2/3] overflow-hidden rounded-lg border bg-gradient-primary flex items-center justify-center">
                    {ebook.cover_image ? (
                      <img src={ebook.cover_image} alt={ebook.title} className="h-full w-full object-cover" />
                    ) : (
                      <BookOpen className="h-12 w-12 text-white" />
                    )}
                  </div>
                  <h4 className="mb-1 line-clamp-1 text-sm font-semibold">{stripHtml(ebook.title)}</h4>
                  <p className="mb-2 line-clamp-1 text-xs text-muted-foreground">
                    {stripHtml(ebook.description || "Sem descricao")}
                  </p>
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {ebook.views || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {ebook.downloads || 0}
                    </span>
                  </div>
                  <div className="border-t pt-2">{renderStateBadge(ebook)}</div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold">Explorar por Genero</h3>
            <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate("/discover")}>
              Ver todos <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {["Romance", "Thriller", "Inspiracao", "Ficcao Cientifica", "Misterio", "Fantasia", "Biografia", "Autoajuda"].map((genre) => (
              <Card
                key={genre}
                className="w-36 flex-shrink-0 cursor-pointer bg-gradient-secondary p-6 transition-shadow hover:shadow-card"
                onClick={() => navigate(`/discover?genre=${genre}`)}
              >
                <h4 className="text-center font-semibold text-white">{genre}</h4>
              </Card>
            ))}
          </div>
        </div>

        {templates.length > 0 && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">Templates</h3>
              <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate("/create")}>
                Usar templates <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {templates.map((template) => (
                <Card key={template.id} className="border p-5">
                  <h4 className="font-semibold">{template.name}</h4>
                  <p className="mt-2 text-sm text-muted-foreground">{template.description}</p>
                  <p className="mt-3 text-xs text-muted-foreground">Categoria: {template.category}</p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      <BottomNav />

      <Dialog open={!!selectedEbook} onOpenChange={() => setSelectedEbook(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <div className="space-y-4">
            {selectedEbook?.cover_image && (
              <div className="flex justify-center">
                <img src={selectedEbook.cover_image} alt={selectedEbook.title} className="h-auto w-48 rounded-lg border shadow-sm" />
              </div>
            )}

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold leading-none tracking-tight">
                  {stripHtml(selectedEbook?.title || "")}
                </h2>
                {selectedEbook && renderStateBadge(selectedEbook)}
              </div>
              <p className="line-clamp-3 text-sm text-muted-foreground">
                {stripHtml(selectedEbook?.description || "Sem descricao")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Criado em</p>
                <p className="font-medium">{formatDate(selectedEbook?.created_at)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Paginas</p>
                <p className="font-medium">{selectedEbook?.pages || 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Genero</p>
                <p className="font-medium">{selectedEbook?.genre || "Nao definido"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Preco</p>
                <p className="font-medium">
                  {selectedEbook?.price && selectedEbook.price > 0 ? `${selectedEbook.price} MZN` : "Gratis"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Enviado para avaliacao</p>
                <p className="font-medium">{formatDate(selectedSubmission?.submitted_at)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Respondido em</p>
                <p className="font-medium">{formatDate(selectedSubmission?.reviewed_at)}</p>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-sm font-medium">Estado editorial</p>
              <p className="mt-1 text-sm text-muted-foreground">{selectedState.description}</p>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {selectedState.canEdit && (
              <Button variant="destructive" onClick={handleDeleteEbook} className="w-full sm:w-auto">
                <Trash2 className="mr-2 h-4 w-4" />
                Apagar
              </Button>
            )}
            <div className="flex w-full gap-2 sm:w-auto">
              <Button variant="outline" onClick={handleDownloadEbook} className="flex-1 sm:flex-none">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              {selectedState.canEdit ? (
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
              ) : (
                <Button
                  onClick={() => {
                    navigate(`/book/${selectedEbook?.id}`);
                    setSelectedEbook(null);
                  }}
                  className="flex-1 sm:flex-none"
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Ler
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
