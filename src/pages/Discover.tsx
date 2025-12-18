import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, SlidersHorizontal, User } from "lucide-react";
import logo from "@/assets/logo-new.png";
import BottomNav from "@/components/BottomNav";
import { BookCard } from "@/components/BookCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BookCardSkeleton } from "@/components/BookCardSkeleton";
interface Genre {
  id: string;
  name: string;
}
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
  created_at?: string;
}
interface Profile {
  id: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
}
const Discover = () => {
  const {
    theme
  } = useTheme();
  const navigate = useNavigate();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [books, setBooks] = useState<Ebook[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Ebook[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [filterPrice, setFilterPrice] = useState("all");
  const [filterRating, setFilterRating] = useState("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"books" | "profiles">("books");
  useEffect(() => {
    fetchGenres();
    fetchCurrentUser();
  }, []);
  useEffect(() => {
    if (currentUserId !== null) {
      fetchBooks();
      fetchProfiles();
    }
  }, [currentUserId]);
  useEffect(() => {
    applyFilters();
    applyProfileFilters();
  }, [books, profiles, selectedGenre, searchQuery, sortBy, filterPrice, filterRating]);
  const fetchCurrentUser = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };
  const fetchGenres = async () => {
    const {
      data
    } = await supabase.from("genres").select("*").order("name");
    if (data) setGenres(data);
  };
  const fetchBooks = async () => {
    setLoading(true);
    const {
      data
    } = await supabase.from("ebooks").select("*").or(`is_public.eq.true,user_id.eq.${currentUserId}`).order("created_at", {
      ascending: false
    });
    if (data) {
      setBooks(data);
    }
    setLoading(false);
  };
  const fetchProfiles = async () => {
    const {
      data
    } = await supabase.from("profiles").select("id, full_name, username, avatar_url, bio").neq("id", currentUserId).order("full_name");
    if (data) {
      setProfiles(data);
    }
  };
  const applyProfileFilters = () => {
    let filtered = [...profiles];
    if (searchQuery) {
      filtered = filtered.filter(profile => profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || profile.username?.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    setFilteredProfiles(filtered);
  };
  const applyFilters = () => {
    let filtered = [...books];

    // Genre filter
    if (selectedGenre !== "all") {
      filtered = filtered.filter(book => book.genre === selectedGenre);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(book => book.title.toLowerCase().includes(searchQuery.toLowerCase()) || book.author?.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Price filter
    if (filterPrice === "free") {
      filtered = filtered.filter(book => book.price === 0);
    } else if (filterPrice === "paid") {
      filtered = filtered.filter(book => (book.price || 0) > 0);
    }

    // Rating filter
    if (filterRating !== "all") {
      const minRating = parseInt(filterRating);
      filtered = filtered.filter(book => (book.rating || 0) >= minRating);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "alphabetical":
          return a.title.localeCompare(b.title);
        case "alphabetical-reverse":
          return b.title.localeCompare(a.title);
        case "recent":
          return new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime();
        case "oldest":
          return new Date(a.published_at || a.created_at).getTime() - new Date(b.published_at || b.created_at).getTime();
        case "popular":
          return (b.downloads || 0) - (a.downloads || 0);
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        default:
          return 0;
      }
    });

    // Priorizar livros de outros usuários quando não há pesquisa
    if (!searchQuery && currentUserId) {
      filtered.sort((a, b) => {
        const aIsOwn = a.user_id === currentUserId;
        const bIsOwn = b.user_id === currentUserId;
        if (aIsOwn && !bIsOwn) return 1;
        if (!aIsOwn && bIsOwn) return -1;
        return 0;
      });
    }
    setFilteredBooks(filtered);
  };
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Kutara Mabuku" className="w-10 h-10 object-cover" />
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Kutara Mabuku
              </h1>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={activeTab === "books" ? "Pesquisar livros ou autores..." : "Pesquisar usuários..."} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pb-24">
        {/* Genre Filter */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Explorar por Género</h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant={selectedGenre === "all" ? "default" : "outline"} className="cursor-pointer px-4 py-2" onClick={() => setSelectedGenre("all")}>
              Todos
            </Badge>
            {genres.map(genre => <Badge key={genre.id} variant={selectedGenre === genre.name ? "default" : "outline"} className="cursor-pointer px-4 py-2" onClick={() => setSelectedGenre(genre.name)}>
                {genre.name}
              </Badge>)}
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais Recentes</SelectItem>
                <SelectItem value="oldest">Mais Antigos</SelectItem>
                <SelectItem value="alphabetical">A-Z</SelectItem>
                <SelectItem value="alphabetical-reverse">Z-A</SelectItem>
                <SelectItem value="popular">Mais Populares</SelectItem>
                <SelectItem value="rating">Melhor Avaliados</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPrice} onValueChange={setFilterPrice}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Preço" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="free">Grátis</SelectItem>
                <SelectItem value="paid">Pagos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterRating} onValueChange={setFilterRating}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Avaliação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Avaliação</SelectItem>
                <SelectItem value="5">★★★★★ (5)</SelectItem>
                <SelectItem value="4">★★★★☆ (4+)</SelectItem>
                <SelectItem value="3">★★★☆☆ (3+)</SelectItem>
                <SelectItem value="2">★★☆☆☆ (2+)</SelectItem>
                <SelectItem value="1">★☆☆☆☆ (1+)</SelectItem>
              </SelectContent>
            </Select>

            {(selectedGenre !== "all" || searchQuery || filterPrice !== "all" || filterRating !== "all" || sortBy !== "recent") && <Button variant="outline" onClick={() => {
            setSelectedGenre("all");
            setSearchQuery("");
            setSortBy("recent");
            setFilterPrice("all");
            setFilterRating("all");
          }}>
                Limpar Filtros
              </Button>}
          </div>
        </div>

        {/* Tabs with underline style - only show when searching */}
        {searchQuery && <div className="mb-8">
            <div className="flex gap-8 border-b">
              <button onClick={() => setActiveTab("books")} className={`pb-3 px-2 text-lg font-medium transition-colors relative ${activeTab === "books" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                Livros
                {activeTab === "books" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
              <button onClick={() => setActiveTab("profiles")} className={`pb-3 px-2 text-lg font-medium transition-colors relative ${activeTab === "profiles" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                Perfis
                {activeTab === "profiles" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
            </div>
          </div>}

        {/* Books Content */}
        {(activeTab === "books" || !searchQuery) && <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <span className="font-medium">{filteredBooks.length}</span>
              <span>{filteredBooks.length === 1 ? "livro encontrado" : "livros encontrados"}</span>
            </div>

            {loading ? <div className="flex flex-wrap gap-4 justify-start">
                {[...Array(10)].map((_, i) => <BookCardSkeleton key={i} />)}
              </div> : filteredBooks.length === 0 ? <div className="flex flex-col items-center justify-center min-h-[40vh]">
                <Search className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-bold mb-2">Nenhum livro encontrado</h2>
                <p className="text-muted-foreground text-center">
                  Tente ajustar os filtros ou pesquisa
                </p>
              </div> : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredBooks.map(book => <BookCard key={book.id} id={book.id} title={book.title} author={book.author || "Autor Desconhecido"} coverImage={book.cover_image} description={book.description} genre={book.genre} price={book.price} downloads={book.downloads} pages={book.pages} formats={book.formats} publishedAt={book.published_at} rating={book.rating} />)}
              </div>}
          </>}

        {/* Profiles Content */}
        {searchQuery && activeTab === "profiles" && <>
            <div className="mb-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">{filteredProfiles.length}</span>
                <span>{filteredProfiles.length === 1 ? "perfil encontrado" : "perfis encontrados"}</span>
              </div>
            </div>

            {loading ? <div className="grid gap-4">
                {[...Array(5)].map((_, i) => <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-1/3" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>)}
              </div> : filteredProfiles.length === 0 ? <div className="flex flex-col items-center justify-center min-h-[40vh]">
                <User className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-bold mb-2">Nenhum perfil encontrado</h2>
                <p className="text-muted-foreground text-center">
                  Tente ajustar a pesquisa
                </p>
              </div> : <div className="grid gap-4">
                {filteredProfiles.map(profile => <div key={profile.id} onClick={() => navigate(`/account/${profile.id}`)} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={profile.avatar_url} alt={profile.full_name || profile.username} />
                      <AvatarFallback>
                        {(profile.full_name || profile.username || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">
                        {profile.full_name || profile.username || "Usuário"}
                      </h3>
                      {profile.bio && <p className="text-sm text-muted-foreground line-clamp-2">{profile.bio}</p>}
                    </div>
                  </div>)}
              </div>}
          </>}
      </main>

      <BottomNav />
    </div>;
};
export default Discover;