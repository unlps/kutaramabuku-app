import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, LogOut, Edit2, BookOpen, UserPlus, UserMinus, Heart, HeartOff, Eye, Download, Edit, Trash2, Globe, Lock, Clock, ArrowLeft, Instagram, Facebook, Linkedin, Twitter, Link2 } from "lucide-react";
import logo from "@/assets/logo-new.png";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { stripHtml } from "@/lib/utils";
import { parseDelimitedList } from "@/lib/author-profile-options";
import { getEbookReviewState, loadLatestSubmissions, type LatestSubmission } from "@/lib/review-status";
interface Profile {
  id: string;
  full_name: string;
  email?: string; // Only available for own profile
  username?: string;
  bio?: string;
  avatar_url?: string;
  social_link?: string;
  is_private?: boolean;
  short_bio?: string;
  detailed_bio?: string;
  nationality?: string;
  languages?: string[];
  writing_genres?: string[];
  content_type?: string;
  writing_style?: string;
  publisher?: string;
  author_status?: string;
  website?: string;
  social_links?: Record<string, string> | null;
}
interface Stats {
  booksCreated: number;
  followers: number;
  following: number;
  booksRead: number;
}

type SelectedBookSource = "owned" | "wishlist" | "library" | "public";

type LibraryFilter = "all" | "paid" | "free";

type LibrarySort = "recent" | "az" | "za" | "price_desc" | "price_asc";

const Account = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({
    booksCreated: 0,
    followers: 0,
    following: 0,
    booksRead: 0
  });
  const [publicBooks, setPublicBooks] = useState<any[]>([]);
  const [privateBooks, setPrivateBooks] = useState<any[]>([]);
  const [reviewBooks, setReviewBooks] = useState<any[]>([]);
  const [libraryBooks, setLibraryBooks] = useState<any[]>([]);
  const [submissionMap, setSubmissionMap] = useState<Record<string, LatestSubmission>>({});
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followRequestPending, setFollowRequestPending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [showBookDialog, setShowBookDialog] = useState(false);
  const [selectedBookSource, setSelectedBookSource] = useState<SelectedBookSource>("owned");
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>("all");
  const [librarySort, setLibrarySort] = useState<LibrarySort>("recent");
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    userId
  } = useParams<{
    userId?: string;
  }>();
  useEffect(() => {
    fetchData();
  }, [userId]);
  const fetchData = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setCurrentUserId(session.user.id);
    const profileId = userId || session.user.id;
    const isOwnProfile = profileId === session.user.id;

    // Fetch profile - use base table for own profile (includes email), public view for others
    if (isOwnProfile) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();
      if (profileData) {
        setProfile(profileData as unknown as Profile);
      }
    } else {
      // Use the public view for other users' profiles (excludes email)
      const { data: profileData } = await supabase
        .from("profiles_public" as any)
        .select("*")
        .eq("id", profileId)
        .single() as { data: Profile | null };
      if (profileData) {
        setProfile(profileData);
      }
    }

    // Fetch stats
    const [booksData, followersData, followingData, purchasesData] = await Promise.all([supabase.from("ebooks").select("id", {
      count: "exact"
    }).eq("user_id", profileId), supabase.from("user_follows").select("id", {
      count: "exact"
    }).eq("following_id", profileId), supabase.from("user_follows").select("id", {
      count: "exact"
    }).eq("follower_id", profileId), supabase.from("purchases").select("id", {
      count: "exact"
    }).eq("user_id", profileId)]);
    setStats({
      booksCreated: booksData.count || 0,
      followers: followersData.count || 0,
      following: followingData.count || 0,
      booksRead: purchasesData.count || 0
    });

    // Fetch books
    const {
      data: books
    } = await supabase.from("ebooks").select("*").eq("user_id", profileId);
    if (books) {
      const latestSubmissions = await loadLatestSubmissions(books.map((book) => book.id));
      const nextSubmissionMap = Object.fromEntries(latestSubmissions.entries());
      setSubmissionMap(nextSubmissionMap);

      setPublicBooks(
        books.filter((book) => getEbookReviewState(book.is_public, nextSubmissionMap[book.id]).stage === "approved")
      );
      setReviewBooks(
        books.filter((book) => getEbookReviewState(book.is_public, nextSubmissionMap[book.id]).stage === "under_review")
      );
      setPrivateBooks(
        books.filter((book) => {
          const state = getEbookReviewState(book.is_public, nextSubmissionMap[book.id]);
          return state.stage === "draft" || state.stage === "changes_requested" || state.stage === "rejected";
        })
      );
    }

    // Fetch wishlist (only for own profile)
    if (isOwnProfile) {
      const {
        data: wishlistData
      } = await supabase.from("wishlist").select("*, ebooks(*)").eq("user_id", session.user.id);
      if (wishlistData) {
        setWishlist(wishlistData.map(w => w.ebooks));
      }

      const {
        data: libraryData
      } = await supabase
        .from("purchases")
        .select("price, purchase_date, ebooks(*)")
        .eq("user_id", session.user.id)
        .order("purchase_date", {
          ascending: false
        });

      if (libraryData) {
        const uniqueLibraryBooks = new Map<string, any>();

        libraryData.forEach((purchase: any) => {
          if (!purchase.ebooks?.id || uniqueLibraryBooks.has(purchase.ebooks.id)) {
            return;
          }

          uniqueLibraryBooks.set(purchase.ebooks.id, {
            ...purchase.ebooks,
            purchase_price: purchase.price,
            purchase_date: purchase.purchase_date
          });
        });

        setLibraryBooks(Array.from(uniqueLibraryBooks.values()));
      }
    } else {
      setWishlist([]);
      setLibraryBooks([]);
    }

    // Check if following (only for other profiles)
    if (!isOwnProfile) {
      const {
        data: followData
      } = await supabase.from("user_follows").select("id, status").eq("follower_id", session.user.id).eq("following_id", profileId).maybeSingle();
      if (followData) {
        const status = (followData as any).status;
        if (status === 'pending') {
          setFollowRequestPending(true);
          setIsFollowing(false);
        } else {
          setIsFollowing(true);
          setFollowRequestPending(false);
        }
      } else {
        setIsFollowing(false);
        setFollowRequestPending(false);
      }
    }
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };
  const handleFollow = async () => {
    if (!currentUserId || !profile) return;
    try {
      if (isFollowing || followRequestPending) {
        // Unfollow or cancel request
        await supabase.from("user_follows").delete().eq("follower_id", currentUserId).eq("following_id", profile.id);
        setIsFollowing(false);
        setFollowRequestPending(false);
        if (isFollowing) {
          setStats(prev => ({
            ...prev,
            followers: prev.followers - 1
          }));
        }
        toast({
          title: isFollowing ? "Deixou de seguir" : "Pedido cancelado"
        });
      } else {
        // Check if target account is private
        if (profile.is_private) {
          // Create pending follow request
          await supabase.from("user_follows").insert({
            follower_id: currentUserId,
            following_id: profile.id,
            status: 'pending'
          });
          setFollowRequestPending(true);

          // Create notification for the target user
          await supabase.rpc('create_system_notification', {
            p_user_id: profile.id,
            p_type: 'follow_request',
            p_title: 'Pedido para seguir',
            p_message: 'AlguÃ©m quer seguir vocÃª',
            p_data: { follower_id: currentUserId }
          });

          toast({
            title: "Pedido para seguir enviado"
          });
        } else {
          // Direct follow for public accounts
          await supabase.from("user_follows").insert({
            follower_id: currentUserId,
            following_id: profile.id,
            status: 'accepted'
          });
          setIsFollowing(true);
          setStats(prev => ({
            ...prev,
            followers: prev.followers + 1
          }));
          toast({
            title: "Seguindo"
          });
        }
      }
    } catch (error) {
      toast({
        title: "Erro ao seguir/deixar de seguir",
        variant: "destructive"
      });
    }
  };
  const handleTogglePublic = async (bookId: string, currentStatus: boolean) => {
    toast({
      title: "Publicaï¿½ï¿½o controlada por revisï¿½o",
      description: "O livro sï¿½ fica pï¿½blico depois de aprovado pelos reviewers."
    });
  };
  const handleDeleteEbook = async () => {
    if (!selectedBook) return;
    const {
      error
    } = await supabase.from("ebooks").delete().eq("id", selectedBook.id);
    if (error) {
      toast({
        title: "Erro ao apagar",
        description: "NÃ£o foi possÃ­vel apagar o ebook",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Ebook apagado",
      description: "O ebook foi apagado com sucesso"
    });
    setSelectedBook(null);
    setShowBookDialog(false);
    fetchData();
  };
  const handleRemoveFromWishlist = async () => {
    if (!selectedBook || !currentUserId) return;
    const { error } = await supabase
      .from("wishlist")
      .delete()
      .eq("ebook_id", selectedBook.id)
      .eq("user_id", currentUserId);
    if (error) {
      toast({
        title: "Erro",
        description: "NÃ£o foi possÃ­vel remover da lista de desejos",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Removido",
      description: "Livro removido da lista de desejos"
    });
    setSelectedBook(null);
    setShowBookDialog(false);
    fetchData();
  };
  const handleDownloadEbook = async () => {
    if (!selectedBook) return;
    try {
      const htmlToText = (html: string) => {
        const temp = document.createElement("div");
        temp.innerHTML = html;
        return temp.textContent || temp.innerText || "";
      };
      const {
        data: chapters
      } = await supabase.from("chapters").select("*").eq("ebook_id", selectedBook.id).order("chapter_order", {
        ascending: true
      });
      const {
        jsPDF
      } = await import("jspdf");
      const pdf = new jsPDF();
      let yPosition = 20;
      if (selectedBook.cover_image) {
        try {
          const img = new Image();
          img.src = selectedBook.cover_image;
          await new Promise<void>(resolve => {
            img.onload = () => resolve();
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
          pdf.addImage(img, "JPEG", xOffset, yOffset, finalWidth, finalHeight);
        } catch (error) {
          console.error("Erro ao adicionar capa ao PDF:", error);
        }
      }
      pdf.addPage();
      yPosition = 20;
      pdf.setFontSize(24);
      const titleText = htmlToText(selectedBook.title);
      const titleLines = pdf.splitTextToSize(titleText, 170);
      pdf.text(titleLines, 20, yPosition);
      yPosition += titleLines.length * 12 + 20;
      if (selectedBook.author) {
        pdf.setFontSize(14);
        pdf.text(`Escrito por ${selectedBook.author}`, 20, yPosition);
      }
      if (selectedBook.description) {
        pdf.addPage();
        yPosition = 20;
        pdf.setFontSize(12);
        const descText = htmlToText(selectedBook.description);
        const descLines = pdf.splitTextToSize(descText, 170);
        pdf.text(descLines, 20, yPosition);
      }
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
      pdf.save(`${htmlToText(selectedBook.title)}.pdf`);
      await supabase.from("ebooks").update({
        downloads: selectedBook.downloads + 1
      }).eq("id", selectedBook.id);
      toast({
        title: "Download concluÃ­do",
        description: "O ebook foi baixado com sucesso"
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Erro no download",
        description: "NÃ£o foi possÃ­vel fazer o download",
        variant: "destructive"
      });
    }
  };
  const isOwnProfile = !userId || userId === currentUserId;
  const selectedBookSubmission = selectedBook ? submissionMap[selectedBook.id] : undefined;
  const selectedBookState = getEbookReviewState(selectedBook?.is_public, selectedBookSubmission);
  const isOwnedSelectedBook = selectedBookSource === "owned";
  const isWishlistBook = selectedBookSource === "wishlist";
  const isLibraryBook = selectedBookSource === "library";
  const languagesList = profile?.languages || [];
  const writingGenresList = profile?.writing_genres || [];
  const writingStyleList = parseDelimitedList(profile?.writing_style);
  const socialLinksMap = (profile?.social_links as Record<string, string> | null) || {};
  const socialEntries = Object.entries(socialLinksMap).filter(([, value]) => Boolean(value));
  const primaryProfileLink = profile?.website || profile?.social_link;
  const hasIdentitySection = Boolean(profile?.nationality || languagesList.length);
  const hasWritingSection = Boolean(
    profile?.content_type ||
    profile?.writing_style ||
    profile?.publisher ||
    profile?.author_status ||
    writingGenresList.length
  );
  const hasPresenceSection = Boolean(primaryProfileLink || socialEntries.length);
  const getSocialMeta = (network: string) => {
    switch (network.toLowerCase()) {
      case 'instagram':
        return { label: 'Instagram', icon: <Instagram className='h-4 w-4' /> };
      case 'facebook':
        return { label: 'Facebook', icon: <Facebook className='h-4 w-4' /> };
      case 'linkedin':
        return { label: 'LinkedIn', icon: <Linkedin className='h-4 w-4' /> };
      case 'x':
      case 'twitter':
        return { label: 'X', icon: <Twitter className='h-4 w-4' /> };
      default:
        return { label: network, icon: <Link2 className='h-4 w-4' /> };
    }
  };

  const filteredLibraryBooks = useMemo(() => {
    const nextBooks = [...libraryBooks]
      .filter((book) => {
        if (libraryFilter === "paid") {
          return Number(book.purchase_price || 0) > 0;
        }

        if (libraryFilter === "free") {
          return Number(book.purchase_price || 0) <= 0;
        }

        return true;
      });

    nextBooks.sort((left, right) => {
      switch (librarySort) {
        case "az":
          return stripHtml(left.title || "").localeCompare(stripHtml(right.title || ""), "pt");
        case "za":
          return stripHtml(right.title || "").localeCompare(stripHtml(left.title || ""), "pt");
        case "price_desc":
          return Number(right.purchase_price || 0) - Number(left.purchase_price || 0);
        case "price_asc":
          return Number(left.purchase_price || 0) - Number(right.purchase_price || 0);
        case "recent":
        default:
          return new Date(right.purchase_date || right.created_at || 0).getTime() - new Date(left.purchase_date || left.created_at || 0).getTime();
      }
    });

    return nextBooks;
  }, [libraryBooks, libraryFilter, librarySort]);

  const hasOwnBooks = publicBooks.length + reviewBooks.length + privateBooks.length > 0;
  const shouldShowOwnTabs = isOwnProfile;
  const canViewPublicContent = isOwnProfile || !profile?.is_private || isFollowing;

  const openBookDialog = (book: any, source: SelectedBookSource) => {
    setSelectedBook(book);
    setSelectedBookSource(source);
    setShowBookDialog(true);
  };

  const renderBookCard = (book: any, source: SelectedBookSource) => (
    <Card
      key={`${source}-${book.id}`}
      className="flex-shrink-0 w-48 p-3 hover:shadow-card transition-shadow cursor-pointer border"
      onClick={() => openBookDialog(book, source)}
    >
      <div className="aspect-[2/3] bg-gradient-primary rounded-lg mb-3 flex items-center justify-center overflow-hidden border">
        {book.cover_image ? (
          <img src={book.cover_image} alt={book.title} className="w-full h-full object-cover" />
        ) : (
          <BookOpen className="h-12 w-12 text-white" />
        )}
      </div>
      <h4 className="font-semibold mb-1 text-sm line-clamp-1">{stripHtml(book.title)}</h4>
      <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
        {book.author || "Autor Desconhecido"}
      </p>
      {source === "library" && (
        <div className="mb-2">
          <Badge variant="secondary" className="rounded-full text-[11px]">
            {Number(book.purchase_price || 0) > 0 ? "Comprado" : "Gratuito"}
          </Badge>
        </div>
      )}
      {source === "owned" && getEbookReviewState(book.is_public, submissionMap[book.id]).stage === "under_review" ? (
        <div className="pt-2 border-t">
          <span className="inline-flex items-center gap-1 text-xs text-amber-700">
            <Clock className="h-3 w-3" />
            Em avaliaÃ§Ã£o
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {book.views || 0}
          </span>
          <span className="flex items-center gap-1">
            <Download className="h-3 w-3" />
            {book.downloads || 0}
          </span>
        </div>
      )}
    </Card>
  );

  const renderBookSection = (
    title: string,
    books: any[],
    source: SelectedBookSource,
    emptyMessage: string,
    icon?: ReactNode
  ) => (
    <section className="space-y-4">
      <h3 className="text-xl font-bold flex items-center gap-2">
        {icon}
        {title} ({books.length})
      </h3>
      {books.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {books.map((book) => book && renderBookCard(book, source))}
        </div>
      ) : (
        <Card className="p-6 border-dashed bg-muted/20">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </Card>
      )}
    </section>
  );
  return <div className="min-h-screen bg-background">
    {/* Header */}
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!isOwnProfile && (
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <img src={logo} alt="Kutara Mabuku" className="w-10 h-10 rounded-lg object-cover" />
          <h1 className="text-2xl font-bold">Perfil</h1>
        </div>
        <div className="flex items-center gap-2">
          {isOwnProfile && <>
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </>}
        </div>
      </div>
    </header>

    <main className="container mx-auto px-4 py-6 pb-24 space-y-6">
      {/* Profile Header */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="bg-gradient-primary text-white text-2xl sm:text-3xl">
              {profile?.full_name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="w-full">
            <h2 className="text-xl sm:text-2xl font-bold">{profile?.full_name || "UsuÃ¡rio"}</h2>
            {profile?.username && <p className="text-muted-foreground text-sm">@{profile.username}</p>}

            {/* Stats */}
            <div className="mt-4 flex justify-center gap-4 sm:gap-6">
              <div className="text-center">
                <div className="text-lg sm:text-xl font-bold">{stats.booksCreated}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">Trabalhos</div>
              </div>
              <div className="text-center cursor-pointer hover:opacity-80">
                <div className="text-lg sm:text-xl font-bold">{stats.followers}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">Seguidores</div>
              </div>
              <div className="text-center cursor-pointer hover:opacity-80">
                <div className="text-lg sm:text-xl font-bold">{stats.following}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">Seguindo</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl font-bold">{stats.booksRead}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">Lidos</div>
              </div>
            </div>
          </div>
        </div>

        {(profile?.short_bio || profile?.detailed_bio || hasIdentitySection || hasWritingSection || hasPresenceSection) && (
          <div className="mx-auto mt-8 w-full max-w-4xl space-y-6">
            {(profile?.short_bio || profile?.detailed_bio) && <div className="space-y-4">
              {profile?.short_bio && <p className="text-base font-semibold leading-relaxed text-foreground text-justify">{profile.short_bio}</p>}
              {profile?.detailed_bio && <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground text-justify">{profile.detailed_bio}</p>}
            </div>}

            {(hasIdentitySection || hasWritingSection || hasPresenceSection) && <div className="border-y border-border/70 py-6">
              <div className="grid gap-x-16 gap-y-6 md:grid-cols-2">
                <div className="space-y-5 text-sm">
                  {profile?.nationality && <div className="space-y-1.5">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Nacionalidade</p>
                    <p className="text-base font-medium text-foreground">{profile.nationality}</p>
                  </div>}
                  {profile?.content_type && <div className="space-y-1.5">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tipo de conteúdo</p>
                    <p className="text-base font-medium text-foreground">{profile.content_type}</p>
                  </div>}
                  {profile?.publisher && <div className="space-y-1.5">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Editora</p>
                    <p className="text-base font-medium text-foreground">{profile.publisher}</p>
                  </div>}
                  {languagesList.length > 0 && <div className="space-y-1.5">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Idiomas</p>
                    <p className="text-base font-medium text-foreground">{languagesList.join(", ")}</p>
                  </div>}
                </div>

                <div className="space-y-5 text-sm">
                  {writingStyleList.length > 0 && <div className="space-y-1.5">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Estilo de escrita</p>
                    <p className="text-base font-medium text-foreground">{writingStyleList.join(", ")}</p>
                  </div>}
                  {profile?.author_status && <div className="space-y-1.5">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Status</p>
                    <p className="text-base font-medium text-foreground">{profile.author_status}</p>
                  </div>}
                  {writingGenresList.length > 0 && <div className="space-y-1.5">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Géneros</p>
                    <p className="text-base font-medium text-foreground">{writingGenresList.join(", ")}</p>
                  </div>}
                  {(profile?.website || profile?.social_link || socialEntries.length > 0) && <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Links</p>
                    <div className="flex flex-wrap gap-3">
                      {profile?.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">
                        <Globe className="h-4 w-4" /> Website
                      </a>}
                      {!profile?.website && profile?.social_link && <a href={profile.social_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">
                        <Link2 className="h-4 w-4" /> Link principal
                      </a>}
                      {socialEntries.map(([network, url]) => {
                        const socialMeta = getSocialMeta(network);
                        return <a key={network} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium capitalize transition-colors hover:bg-muted">
                          {socialMeta.icon}
                          {socialMeta.label}
                        </a>;
                      })}
                    </div>
                  </div>}
                </div>
              </div>
            </div>}
          </div>
        )}

        <div className="mx-auto mt-6 w-full max-w-4xl border-t border-border/70 pt-6">
          {isOwnProfile ? <Button variant="outline" className="w-full" onClick={() => navigate("/edit-profile")}>
            <Edit2 className="h-4 w-4 mr-2" />
            Editar Perfil
          </Button> : <Button
            variant={isFollowing ? "outline" : followRequestPending ? "secondary" : "default"}
            className="w-full"
            onClick={handleFollow}
          >
            {isFollowing ? <>
              <UserMinus className="h-4 w-4 mr-2" />
              Deixar de Seguir
            </> : followRequestPending ? <>
              <Clock className="h-4 w-4 mr-2" />
              Pedido Enviado
            </> : <>
              <UserPlus className="h-4 w-4 mr-2" />
              Seguir
            </>}
          </Button>}
        </div>
      </Card>
      {/* Private Account Message */}
      {!isOwnProfile && profile?.is_private && !isFollowing && (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <Lock className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold mb-2">Conta Privada</h3>
            <p className="text-muted-foreground">
              Siga esta conta para ver os livros publicados.
            </p>
          </div>
        </Card>
      )}

      {shouldShowOwnTabs ? (
        <Tabs defaultValue="my-books" className="space-y-5">
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl bg-muted/60 p-1">
            <TabsTrigger value="my-books" className="rounded-lg py-3 text-sm font-semibold">
              Meus Livros
            </TabsTrigger>
            <TabsTrigger value="library" className="rounded-lg py-3 text-sm font-semibold">
              Biblioteca
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="rounded-lg py-3 text-sm font-semibold">
              Wishlist
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-books" className="space-y-6">
            {renderBookSection(
              "Livros Públicos",
              publicBooks,
              "owned",
              "Ainda não tens livros públicos.",
              <BookOpen className="h-5 w-5" />
            )}
            {renderBookSection(
              "Livros em Avaliação",
              reviewBooks,
              "owned",
              "Ainda não tens livros em avaliação.",
              <Clock className="h-5 w-5" />
            )}
            {renderBookSection(
              "Livros Privados",
              privateBooks,
              "owned",
              "Ainda não tens livros privados.",
              <BookOpen className="h-5 w-5" />
            )}

            {!hasOwnBooks && (
              <Card className="border-dashed p-8">
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <h4 className="text-lg font-semibold">Ainda não tens livros criados</h4>
                    <p className="text-sm text-muted-foreground">
                      Começa do zero ou importa um ficheiro existente para entrares no fluxo de criação.
                    </p>
                  </div>
                  <Button onClick={() => navigate("/create")}>
                    Começar a criar
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="library" className="space-y-5">
            <div className="flex flex-col gap-4 rounded-xl border p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-xl font-bold">Biblioteca ({filteredLibraryBooks.length})</h3>
                  <p className="text-sm text-muted-foreground">
                    Livros comprados ou gratuitos já adicionados à tua conta.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant={libraryFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setLibraryFilter("all")}>
                    Todos
                  </Button>
                  <Button variant={libraryFilter === "paid" ? "default" : "outline"} size="sm" onClick={() => setLibraryFilter("paid")}>
                    Comprados
                  </Button>
                  <Button variant={libraryFilter === "free" ? "default" : "outline"} size="sm" onClick={() => setLibraryFilter("free")}>
                    Gratuitos
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant={librarySort === "recent" ? "secondary" : "ghost"} size="sm" onClick={() => setLibrarySort("recent")}>
                  Recentes
                </Button>
                <Button variant={librarySort === "az" ? "secondary" : "ghost"} size="sm" onClick={() => setLibrarySort("az")}>
                  A a Z
                </Button>
                <Button variant={librarySort === "za" ? "secondary" : "ghost"} size="sm" onClick={() => setLibrarySort("za")}>
                  Z a A
                </Button>
                <Button variant={librarySort === "price_desc" ? "secondary" : "ghost"} size="sm" onClick={() => setLibrarySort("price_desc")}>
                  Mais caro
                </Button>
                <Button variant={librarySort === "price_asc" ? "secondary" : "ghost"} size="sm" onClick={() => setLibrarySort("price_asc")}>
                  Mais barato
                </Button>
              </div>
            </div>

            {renderBookSection(
              "Os teus livros da biblioteca",
              filteredLibraryBooks,
              "library",
              "Ainda não tens livros na biblioteca.",
              <BookOpen className="h-5 w-5" />
            )}
          </TabsContent>

          <TabsContent value="wishlist" className="space-y-6">
            {renderBookSection(
              "Lista de Desejos",
              wishlist.filter(Boolean),
              "wishlist",
              "Ainda não tens livros na wishlist.",
              <Heart className="h-5 w-5" />
            )}
          </TabsContent>
        </Tabs>
      ) : (
        canViewPublicContent &&
        renderBookSection(
          "Livros Públicos",
          publicBooks,
          "public",
          "Este autor ainda não publicou livros visíveis.",
          <BookOpen className="h-5 w-5" />
        )
      )}
    </main>

    {/* Book Details Dialog */}
    <Dialog open={showBookDialog} onOpenChange={setShowBookDialog}>
      <DialogContent className="sm:max-w-[500px]">
        <div className="space-y-4">
          {selectedBook?.cover_image && <div className="flex justify-center">
            <img src={selectedBook.cover_image} alt={selectedBook.title} className="w-48 h-auto rounded-lg border shadow-sm" />
          </div>}

          <div className="space-y-3">
            <h2 className="text-lg font-semibold leading-none tracking-tight">
              {stripHtml(selectedBook?.title || "")}
            </h2>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {stripHtml(selectedBook?.description || "Sem descriÃ§Ã£o")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Criado em</p>
              <p className="font-medium">
                {selectedBook?.created_at ? new Date(selectedBook.created_at).toLocaleDateString("pt-PT", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric"
                }) : "-"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">PÃ¡ginas</p>
              <p className="font-medium">{selectedBook?.pages || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">VisualizaÃ§Ãµes</p>
              <p className="font-medium flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {selectedBook?.views || 0}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Downloads</p>
              <p className="font-medium flex items-center gap-1">
                <Download className="h-4 w-4" />
                {selectedBook?.downloads || 0}
              </p>
            </div>
          </div>

          {isOwnedSelectedBook && <div className="border-t pt-4 space-y-3">
            <div className="space-y-1">
              <p className="font-medium">Estado editorial</p>
              <div className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${selectedBookState.badgeClassName}`}>
                {selectedBookState.label}
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedBookState.description}
              </p>
            </div>
            {selectedBookSubmission?.submitted_at && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Enviado para avaliaï¿½ï¿½o</p>
                <p className="font-medium">
                  {new Date(selectedBookSubmission.submitted_at).toLocaleDateString("pt-PT", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                  })}
                </p>
              </div>
              {selectedBookSubmission.reviewed_at && <div>
                <p className="text-muted-foreground">Respondido em</p>
                <p className="font-medium">
                  {new Date(selectedBookSubmission.reviewed_at).toLocaleDateString("pt-PT", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                  })}
                </p>
              </div>}
            </div>}
          </div>}
        </div>

        {isOwnedSelectedBook ? <DialogFooter className="flex-col sm:flex-row gap-2">
          {selectedBookState.canEdit && <Button variant="destructive" onClick={handleDeleteEbook} className="w-full sm:w-auto">
            <Trash2 className="mr-2 h-4 w-4" />
            Apagar
          </Button>}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={handleDownloadEbook} className="flex-1 sm:flex-none">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            {selectedBookState.canEdit ? <Button onClick={() => {
              navigate(`/editor?id=${selectedBook?.id}`);
              setShowBookDialog(false);
            }} className="flex-1 sm:flex-none">
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button> : <Button onClick={() => {
              setShowBookDialog(false);
              navigate(`/book/${selectedBook?.id}`);
            }} className="flex-1 sm:flex-none">
              <BookOpen className="mr-2 h-4 w-4" />
              Ler
            </Button>}
          </div>
        </DialogFooter> : <DialogFooter className="flex gap-2">
          {isWishlistBook && (
            <Button variant="destructive" onClick={handleRemoveFromWishlist} className="flex-1">
              <HeartOff className="mr-2 h-4 w-4" />
              Remover
            </Button>
          )}
          <Button onClick={() => {
            setShowBookDialog(false);
            navigate(`/book/${selectedBook?.id}`);
          }} className="flex-1">
            {isLibraryBook ? "Ler" : "Ver Detalhes"}
          </Button>
        </DialogFooter>}
      </DialogContent>
    </Dialog>

    {/* Bottom Navigation */}
    <BottomNav />
  </div>;
};
export default Account;


















