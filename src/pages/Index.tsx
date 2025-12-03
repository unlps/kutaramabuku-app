import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import heroBooks from "@/assets/hero-books.png";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen, Star } from "lucide-react";
import { stripHtml } from "@/lib/utils";
const Index = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [featuredBooks, setFeaturedBooks] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [showBookDialog, setShowBookDialog] = useState(false);
  const heroImage = heroBooks;
  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const {
        error
      } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Erro no login com Google:', error);
      toast.error('Erro ao fazer login com Google. Tente novamente.');
      setIsLoading(false);
    }
  };
  const messages = ["Crie ebooks padrão, interativos e profissionais incríveis com facilidade", "Projete layouts bonitos com nosso editor intuitivo", "Adicione elementos interativos para envolver seus leitores", "Exporte em múltiplos formatos para qualquer dispositivo", "Colabore com sua equipe em tempo real"];
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % messages.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [messages.length]);
  useEffect(() => {
    fetchFeaturedBooks();
  }, []);
  const fetchFeaturedBooks = async () => {
    const {
      data
    } = await supabase.from("ebooks").select("*").eq("is_public", true).order("rating", {
      ascending: false
    }).limit(5);
    if (data) {
      setFeaturedBooks(data);
    }
  };
  const handleBookClick = (book: any) => {
    setSelectedBook(book);
    setShowBookDialog(true);
  };
  return <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Image */}
      <div className="relative w-full h-[45vh] overflow-hidden">
        <img src={heroImage} alt="Book covers collection" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pt-8 pb-12 flex flex-col items-center">
        <h1 className="text-3xl font-bold text-center mb-3">
          Bem-vindo ao <span className="bg-gradient-primary bg-clip-text text-transparent">Kutara Mabuku</span>
        </h1>
        
        <div className="text-center mb-8 max-w-md h-16 flex items-center justify-center">
          <p className="text-muted-foreground transition-opacity duration-500">
            {messages[currentSlide]}
          </p>
        </div>

        {/* Message Slider Dots */}
        <div className="flex gap-2 mb-12">
          {messages.map((_, index) => <div key={index} onClick={() => setCurrentSlide(index)} className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${index === currentSlide ? "w-8 bg-primary" : "w-2 bg-muted hover:bg-muted-foreground/50"}`} />)}
        </div>

        {/* Featured Books */}
        {featuredBooks.length > 0}

        {/* Action Buttons */}
        <div className="w-full max-w-md space-y-4">
          
          <Button onClick={handleGoogleLogin} disabled={isLoading} variant="outline" className="w-full h-14 text-base bg-background border-border hover:bg-accent rounded-xl">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continuar com Google
          </Button>

          <Button onClick={() => navigate("/auth")} className="w-full h-14 text-base bg-gradient-primary hover:opacity-90 text-white rounded-xl font-semibold">
            Começar
          </Button>

          <Button onClick={() => navigate("/auth")} variant="ghost" className="w-full h-14 text-base text-primary hover:text-primary-hover hover:bg-accent rounded-xl">
            Já Tenho uma Conta
          </Button>
        </div>
      </div>

      {/* Book Details Dialog */}
      <Dialog open={showBookDialog} onOpenChange={setShowBookDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{stripHtml(selectedBook?.title || "")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedBook?.cover_image && <div className="aspect-[2/3] w-full max-w-xs mx-auto rounded-lg overflow-hidden">
                <img src={selectedBook.cover_image} alt={selectedBook.title} className="w-full h-full object-cover" />
              </div>}
            
            <div className="space-y-2">
              {selectedBook?.author && <p className="text-sm">
                  <span className="font-semibold">Autor:</span> {selectedBook.author}
                </p>}
              
              {selectedBook?.genre && <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Gênero:</span>
                  <Badge variant="secondary">{selectedBook.genre}</Badge>
                </div>}
              
              {selectedBook?.price !== undefined && <p className="text-sm">
                  <span className="font-semibold">Preço:</span>{" "}
                  {selectedBook.price > 0 ? `${selectedBook.price} MZN` : "Grátis"}
                </p>}
              
              {selectedBook?.rating > 0 && <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Avaliação:</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm">{selectedBook.rating}</span>
                  </div>
                </div>}
              
              {selectedBook?.description && <div>
                  <p className="text-sm font-semibold mb-1">Descrição:</p>
                  <p className="text-sm text-muted-foreground">{selectedBook.description}</p>
                </div>}
            </div>

            <Button onClick={() => {
            setShowBookDialog(false);
            navigate("/auth");
          }} className="w-full bg-primary hover:bg-primary-hover text-primary-foreground">
              Começar a Ler
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};
export default Index;