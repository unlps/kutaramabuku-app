import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Heart, Star, Download, FileText, Calendar, User, ThumbsUp, ThumbsDown, MessageSquare, MoreVertical } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BookCard } from "@/components/BookCard";
import BottomNav from "@/components/BottomNav";
import { stripHtml, sanitizeHtml } from "@/lib/utils";
interface Ebook {
  id: string;
  title: string;
  description?: string;
  author?: string;
  cover_image?: string;
  genre?: string;
  price?: number;
  pages?: number;
  formats?: string[];
  published_at?: string;
  rating?: number;
  downloads?: number;
  preview_content?: string;
  user_id: string;
}
interface Review {
  id: string;
  rating: number;
  comment?: string;
  created_at: string;
  likes_count: number;
  dislikes_count: number;
  profiles: {
    full_name?: string;
    avatar_url?: string;
  };
}
export default function BookDetails() {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<Ebook | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [similarBooks, setSimilarBooks] = useState<Ebook[]>([]);
  const [authorBooks, setAuthorBooks] = useState<Ebook[]>([]);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: ""
  });
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "highest">("recent");
  const [authorProfile, setAuthorProfile] = useState<{ full_name?: string; avatar_url?: string; bio?: string } | null>(null);
  useEffect(() => {
    fetchBookDetails();
    checkWishlistStatus();
    fetchCurrentUser();
  }, [id]);
  const fetchCurrentUser = async () => {
    const {
      data
    } = await supabase.auth.getUser();
    setCurrentUser(data.user?.id || null);
  };
  const fetchBookDetails = async () => {
    try {
      const {
        data: bookData,
        error: bookError
      } = await supabase.from("ebooks").select("*").eq("id", id).single();
      if (bookError) throw bookError;
      setBook(bookData);

      // Fetch reviews
      const {
        data: reviewsData,
        error: reviewsError
      } = await supabase.from("reviews").select(`
          id,
          rating,
          comment,
          created_at,
          user_id,
          likes_count,
          dislikes_count,
          profiles (
            full_name,
            avatar_url
          )
        `).eq("ebook_id", id).order("created_at", {
        ascending: false
      });
      console.log("Reviews data:", reviewsData);
      console.log("Reviews error:", reviewsError);
      if (reviewsError) {
        console.error("Error fetching reviews:", reviewsError);
      }
      setReviews(reviewsData as any || []);

      // Fetch similar books (same genre)
      if (bookData.genre) {
        const {
          data: similarData
        } = await supabase.from("ebooks").select("*").eq("genre", bookData.genre).eq("is_public", true).neq("id", id).limit(4);
        setSimilarBooks(similarData || []);
      }

      // Fetch author's other books
      if (bookData.user_id) {
        const { data: authorData } = await supabase
          .from("ebooks")
          .select("*")
          .eq("user_id", bookData.user_id)
          .eq("is_public", true)
          .neq("id", id)
          .limit(4);
        setAuthorBooks(authorData || []);

        // Fetch author profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, bio")
          .eq("id", bookData.user_id)
          .single();
        setAuthorProfile(profileData);
      }
    } catch (error) {
      console.error("Error fetching book:", error);
      toast.error("Erro ao carregar detalhes do livro");
    } finally {
      setLoading(false);
    }
  };
  const checkWishlistStatus = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) return;
    const {
      data
    } = await supabase.from("wishlist").select("id").eq("user_id", user.id).eq("ebook_id", id).maybeSingle();
    setIsInWishlist(!!data);
  };
  const toggleWishlist = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Faça login para adicionar à wishlist");
      return;
    }
    if (isInWishlist) {
      await supabase.from("wishlist").delete().eq("user_id", user.id).eq("ebook_id", id);
      setIsInWishlist(false);
      toast.success("Removido da wishlist");
    } else {
      await supabase.from("wishlist").insert({
        user_id: user.id,
        ebook_id: id
      });
      setIsInWishlist(true);
      toast.success("Adicionado à wishlist");
    }
  };
  const handleReaction = async (reviewId: string, reactionType: "like" | "dislike") => {
    if (!currentUser) {
      toast.error("Faça login para reagir");
      return;
    }
    try {
      // Check if user already reacted
      const {
        data: existing
      } = await supabase.from("review_reactions").select("*").eq("review_id", reviewId).eq("user_id", currentUser).maybeSingle();
      if (existing) {
        if (existing.reaction_type === reactionType) {
          // Remove reaction
          await supabase.from("review_reactions").delete().eq("id", existing.id);
        } else {
          // Update reaction
          await supabase.from("review_reactions").update({
            reaction_type: reactionType
          }).eq("id", existing.id);
        }
      } else {
        // Add new reaction
        await supabase.from("review_reactions").insert({
          review_id: reviewId,
          user_id: currentUser,
          reaction_type: reactionType
        });
      }

      // Refresh reviews
      fetchBookDetails();
    } catch (error) {
      console.error("Error handling reaction:", error);
      toast.error("Erro ao processar reação");
    }
  };
  const getSortedReviews = () => {
    const sorted = [...reviews];
    switch (sortBy) {
      case "oldest":
        return sorted.reverse();
      case "highest":
        return sorted.sort((a, b) => b.rating - a.rating);
      default:
        return sorted;
    }
  };

  const handleDownloadFreeBook = async () => {
    if (!book || book.price !== 0) {
      toast.error("Este livro não é gratuito");
      return;
    }

    try {
      toast.info("Preparando download...");
      
      const htmlToText = (html: string) => {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.textContent || temp.innerText || '';
      };

      const { data: chapters } = await supabase
        .from("chapters")
        .select("*")
        .eq("ebook_id", book.id)
        .order("chapter_order", { ascending: true });

      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF();
      let yPosition = 20;

      // Cover page with image
      if (book.cover_image) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = book.cover_image;
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject();
          });

          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const imgRatio = img.width / img.height;
          const pageRatio = pageWidth / pageHeight;
          let finalWidth, finalHeight, xOffset, yOffset;
          
          if (imgRatio > pageRatio) {
            finalHeight = pageHeight;
            finalWidth = finalHeight * imgRatio;
            xOffset = (pageWidth - finalWidth) / 2;
            yOffset = 0;
          } else {
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

      // Title page
      pdf.addPage();
      yPosition = 20;
      pdf.setFontSize(24);
      const titleText = htmlToText(book.title);
      const titleLines = pdf.splitTextToSize(titleText, 170);
      pdf.text(titleLines, 20, yPosition);
      yPosition += titleLines.length * 12 + 20;
      
      if (book.author) {
        pdf.setFontSize(14);
        pdf.text(`Escrito por ${book.author}`, 20, yPosition);
      }

      // Description page
      if (book.description) {
        pdf.addPage();
        yPosition = 20;
        pdf.setFontSize(12);
        const descText = htmlToText(book.description);
        const descLines = pdf.splitTextToSize(descText, 170);
        pdf.text(descLines, 20, yPosition);
      }

      // Chapters
      chapters?.forEach(chapter => {
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

      pdf.save(`${htmlToText(book.title)}.pdf`);

      // Update download count
      await supabase
        .from("ebooks")
        .update({ downloads: (book.downloads || 0) + 1 })
        .eq("id", book.id);

      toast.success("Download concluído!");
    } catch (error) {
      console.error("Error downloading ebook:", error);
      toast.error("Erro ao baixar o ebook");
    }
  };

  const submitReview = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Faça login para deixar uma avaliação");
      return;
    }
    console.log("Submitting review for user:", user.id, "ebook:", id);
    const {
      data,
      error
    } = await supabase.from("reviews").insert({
      ebook_id: id,
      user_id: user.id,
      rating: newReview.rating,
      comment: newReview.comment
    }).select();
    console.log("Insert result:", data, error);
    if (error) {
      console.error("Error submitting review:", error);
      toast.error("Erro ao enviar avaliação: " + error.message);
    } else {
      toast.success("Avaliação enviada!");
      setNewReview({
        rating: 5,
        comment: ""
      });
      fetchBookDetails();
    }
  };
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Carregando...</p>
      </div>;
  }
  if (!book) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Livro não encontrado</p>
      </div>;
  }
  return <div className="min-h-screen bg-background pb-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        {/* Top Section - Cover and Info Side by Side */}
        <div className="grid md:grid-cols-[200px_1fr] lg:grid-cols-[200px_1fr] gap-1 mb-12 text-center md:text-left">
          {/* Left - Book Cover */}
          <Dialog>
            <DialogTrigger asChild>
              <div className="bg-muted flex items-center justify-center w-36 h-60 rounded-lg overflow-hidden mx-auto md:mx-0 cursor-pointer hover:opacity-90 transition-opacity">
                {book.cover_image ? <img src={book.cover_image} alt={book.title} className="object-cover w-full h-full border border-border rounded-lg" /> : <FileText className="h-20 w-20 text-muted-foreground" />}
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <img src={book.cover_image} alt={book.title} className="w-full h-auto rounded-lg" />
            </DialogContent>
          </Dialog>

          {/* Right - Book Info and Actions */}
          <div className="space-y-6 text-center md:text-left">
            <div>
              <h1 className="text-4xl font-bold mb-2">{stripHtml(book.title)}</h1>
              <p className="text-xl text-muted-foreground mb-4">{book.author}</p>

              <div className="flex flex-wrap gap-4 mb-6 justify-center md:justify-start items-center md:items-start text-center md:text-left">
                {book.genre && <Badge variant="secondary">{book.genre}</Badge>}
                {book.rating && book.rating > 0 && <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                    <span className="font-medium">{book.rating.toFixed(1)}</span>
                  </div>}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Download className="h-4 w-4" />
                  <span>{book.downloads} downloads</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{book.pages} páginas</span>
                </div>
                {book.published_at && <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(book.published_at), "dd MMM yyyy", {
                    locale: ptBR
                  })}
                    </span>
                  </div>}
              </div>

              {book.formats && book.formats.length > 0 && <div className="mb-6">
                  <span className="text-sm font-medium">Formatos disponíveis: </span>
                  <span className="text-sm">{book.formats.join(", ")}</span>
                </div>}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                size="lg" 
                className="flex-1 py-[8px]"
                onClick={book.price === 0 ? handleDownloadFreeBook : undefined}
                disabled={book.price !== 0}
              >
                <Download className="h-4 w-4 mr-2" />
                {book.price === 0 ? "Baixar Grátis" : `Comprar - ${book.price?.toFixed(2)} MZN`}
              </Button>
              <Button variant="outline" size="lg" onClick={toggleWishlist} className="flex-1 py-[8px]">
                <Heart className={`h-4 w-4 mr-2 ${isInWishlist ? "fill-current" : ""}`} />
                {isInWishlist ? "Na Wishlist" : "Adicionar à Wishlist"}
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Section - Description and More */}
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">Descrição</h2>
            <div className="text-muted-foreground leading-relaxed text-justify" dangerouslySetInnerHTML={{
            __html: sanitizeHtml(book.description || "Sem descrição disponível")
          }} />
          </div>

          {/* Preview */}
          {book.preview_content && <div>
              <Separator className="my-6" />
              <h2 className="text-2xl font-bold mb-4">Leitura de Amostra</h2>
              <Card className="p-6 bg-muted/50">
                <p className="whitespace-pre-line">{book.preview_content}</p>
              </Card>
            </div>}

          {/* About Author */}
          <div>
            <Separator className="my-6" />
            <h2 className="text-2xl font-bold mb-4">Sobre o Autor</h2>
            <div className="flex items-start gap-4">
              {authorProfile?.avatar_url ? (
                <img 
                  src={authorProfile.avatar_url} 
                  alt={authorProfile?.full_name || book.author || "Autor"}
                  className="h-16 w-16 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold flex-shrink-0 text-xl">
                  <User className="h-8 w-8" />
                </div>
              )}
              <div className="flex-1">
                <h3 
                  className="font-semibold text-lg mb-2 hover:text-primary cursor-pointer transition-colors"
                  onClick={() => navigate(`/account/${book.user_id}`)}
                >
                  {authorProfile?.full_name || book.author}
                </h3>
                {authorProfile?.bio && <p className="text-muted-foreground">{authorProfile.bio}</p>}
              </div>
            </div>
          </div>

          {/* More from Author */}
          {authorBooks.length > 0 && <div>
              <Separator className="my-6" />
              <h2 className="text-2xl font-bold mb-4">Mais do Autor</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {authorBooks.map(authorBook => <BookCard key={authorBook.id} id={authorBook.id} title={authorBook.title} author={authorBook.author || ""} coverImage={authorBook.cover_image} genre={authorBook.genre} price={authorBook.price} rating={authorBook.rating} />)}
              </div>
            </div>}

          {/* Similar Books */}
          {similarBooks.length > 0 && <div>
              <Separator className="my-6" />
              <h2 className="text-2xl font-bold mb-4">Livros Semelhantes</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {similarBooks.map(similarBook => <BookCard key={similarBook.id} id={similarBook.id} title={similarBook.title} author={similarBook.author || ""} coverImage={similarBook.cover_image} genre={similarBook.genre} price={similarBook.price} rating={similarBook.rating} />)}
              </div>
            </div>}

          {/* Reviews */}
          <div>
            <Separator className="my-6" />
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">Avaliações</h2>
                {reviews.length > 0 && <Badge variant="secondary" className="rounded-full">
                    {reviews.length}
                  </Badge>}
              </div>
              {reviews.length > 0 && <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-3 py-2 rounded-md border bg-background text-sm">
                  <option value="recent">Mais recentes</option>
                  <option value="oldest">Mais antigas</option>
                  <option value="highest">Melhor avaliadas</option>
                </select>}
            </div>

            {/* Add Review */}
            {currentUser && <Card className="p-6 mb-6">
                <h3 className="font-semibold mb-4">Deixe sua avaliação</h3>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(star => <button key={star} onClick={() => setNewReview({
                  ...newReview,
                  rating: star
                })}>
                        <Star className={`h-6 w-6 ${star <= newReview.rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} />
                      </button>)}
                  </div>
                  <Textarea placeholder="Escreva sua avaliação..." value={newReview.comment} onChange={e => setNewReview({
                ...newReview,
                comment: e.target.value
              })} />
                  <Button onClick={submitReview}>Enviar Avaliação</Button>
                </div>
              </Card>}

            {/* Reviews List */}
            <div className="space-y-6">
              {reviews.length === 0 ? <p className="text-muted-foreground">Ainda não há avaliações</p> : <>
                  {(showAllReviews ? getSortedReviews() : getSortedReviews().slice(0, 5)).map(review => <div key={review.id} className="flex gap-4">
                      <div 
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigate(`/account/${(review as any).user_id}`)}
                      >
                        {review.profiles?.avatar_url ? (
                          <img 
                            src={review.profiles.avatar_url} 
                            alt={review.profiles?.full_name || "Avatar"}
                            className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold flex-shrink-0">
                            {review.profiles?.full_name?.charAt(0).toUpperCase() || "U"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span 
                            className="font-semibold hover:text-primary cursor-pointer transition-colors"
                            onClick={() => navigate(`/account/${(review as any).user_id}`)}
                          >
                            {review.profiles?.full_name || "Anônimo"}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(review.created_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(star => <Star key={star} className={`h-4 w-4 ${star <= review.rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} />)}
                        </div>
                        {review.comment && <p className="text-foreground">{review.comment}</p>}
                        <div className="flex items-center gap-4 pt-2">
                          <Button variant="ghost" size="sm" className="h-8 gap-2 px-2 text-stone-500">
                            <MessageSquare className="h-4 w-4" />
                            <span>Responder</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 gap-2 px-2" onClick={() => handleReaction(review.id, "like")}>
                            <ThumbsUp className="h-4 w-4" />
                            {review.likes_count > 0 && <span>{review.likes_count}</span>}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 gap-2 px-2" onClick={() => handleReaction(review.id, "dislike")}>
                            <ThumbsDown className="h-4 w-4" />
                            {review.dislikes_count > 0 && <span>{review.dislikes_count}</span>}
                          </Button>

                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>)}
                  {reviews.length > 5 && !showAllReviews && <Button variant="outline" onClick={() => setShowAllReviews(true)} className="w-full">
                      Ver mais avaliações ({reviews.length - 5} restantes)
                    </Button>}
                  {showAllReviews && reviews.length > 5 && <Button variant="outline" onClick={() => setShowAllReviews(false)} className="w-full">
                      Ver menos
                    </Button>}
                </>}
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>;
}