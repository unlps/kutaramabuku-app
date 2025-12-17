import { useState, useEffect, useRef } from "react";
import { X, Plus, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Author {
  id: string;
  name: string;
  userId?: string;
  status?: 'pending' | 'accepted' | 'rejected';
  isNew?: boolean;
}

interface AuthorInputProps {
  ebookId?: string;
  initialAuthors?: Author[];
  onChange?: (authors: Author[]) => void;
  disabled?: boolean;
}

interface ProfileSuggestion {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
}

export default function AuthorInput({ 
  ebookId, 
  initialAuthors = [], 
  onChange,
  disabled = false 
}: AuthorInputProps) {
  const [authors, setAuthors] = useState<Author[]>(initialAuthors);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<ProfileSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load existing book authors if ebookId is provided
  useEffect(() => {
    if (ebookId) {
      loadBookAuthors();
    }
  }, [ebookId]);

  // Search for users as the user types
  useEffect(() => {
    const searchUsers = async () => {
      if (inputValue.length < 2) {
        setSuggestions([]);
        return;
      }

      setSearchLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .or(`full_name.ilike.%${inputValue}%,username.ilike.%${inputValue}%`)
          .limit(5);

        if (error) throw error;

        // Filter out already added authors
        const filteredSuggestions = (data || []).filter(
          profile => !authors.some(
            a => a.userId === profile.id || 
                 a.name.toLowerCase() === (profile.full_name || profile.username || '').toLowerCase()
          )
        );

        setSuggestions(filteredSuggestions);
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [inputValue, authors]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadBookAuthors = async () => {
    if (!ebookId) return;

    try {
      const { data, error } = await supabase
        .from("book_authors")
        .select(`
          id,
          user_id,
          status,
          profiles:user_id (
            id,
            full_name,
            username
          )
        `)
        .eq("ebook_id", ebookId);

      if (error) throw error;

      const loadedAuthors: Author[] = (data || []).map((ba: any) => ({
        id: ba.id,
        name: ba.profiles?.full_name || ba.profiles?.username || 'Unknown',
        userId: ba.user_id,
        status: ba.status
      }));

      setAuthors(loadedAuthors);
      onChange?.(loadedAuthors);
    } catch (error) {
      console.error("Error loading book authors:", error);
    }
  };

  const isDuplicate = (name: string): boolean => {
    return authors.some(a => a.name.toLowerCase() === name.toLowerCase());
  };

  const addAuthorFromSuggestion = async (profile: ProfileSuggestion) => {
    const name = profile.full_name || profile.username || '';
    
    if (isDuplicate(name)) {
      toast({
        title: "Autor duplicado",
        description: "Este autor já foi adicionado.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // If we have an ebookId, save to database and create notification
      if (ebookId) {
        // Add to book_authors table
        const { data: bookAuthor, error: insertError } = await supabase
          .from("book_authors")
          .insert({
            ebook_id: ebookId,
            user_id: profile.id,
            status: 'pending'
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Get ebook title for notification
        const { data: ebook } = await supabase
          .from("ebooks")
          .select("title")
          .eq("id", ebookId)
          .single();

        // Create notification for the author
        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_id: profile.id,
            type: 'collaboration_request',
            title: 'Convite de Colaboração',
            message: `Você foi adicionado como autor do livro "${ebook?.title || 'Sem título'}". Aceite ou rejeite o convite.`,
            data: { 
              ebook_id: ebookId, 
              book_author_id: bookAuthor.id,
              ebook_title: ebook?.title 
            }
          });

        if (notifError) console.error("Error creating notification:", notifError);

        const newAuthor: Author = {
          id: bookAuthor.id,
          name,
          userId: profile.id,
          status: 'pending'
        };

        const updatedAuthors = [...authors, newAuthor];
        setAuthors(updatedAuthors);
        onChange?.(updatedAuthors);

        toast({
          title: "Autor adicionado",
          description: `${name} foi convidado como colaborador.`
        });
      } else {
        // Just add to local state for CreateEbook flow
        const newAuthor: Author = {
          id: crypto.randomUUID(),
          name,
          userId: profile.id,
          status: 'pending'
        };

        const updatedAuthors = [...authors, newAuthor];
        setAuthors(updatedAuthors);
        onChange?.(updatedAuthors);
      }

      setInputValue("");
      setSuggestions([]);
      setShowSuggestions(false);
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar autor",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addNewAuthor = async () => {
    const name = inputValue.trim();
    
    if (!name) return;
    
    if (isDuplicate(name)) {
      toast({
        title: "Autor duplicado",
        description: "Este autor já foi adicionado.",
        variant: "destructive"
      });
      return;
    }

    // For new authors that don't exist in the system
    const newAuthor: Author = {
      id: crypto.randomUUID(),
      name,
      isNew: true
    };

    const updatedAuthors = [...authors, newAuthor];
    setAuthors(updatedAuthors);
    onChange?.(updatedAuthors);

    setInputValue("");
    setSuggestions([]);
    setShowSuggestions(false);

    toast({
      title: "Autor adicionado",
      description: `${name} foi adicionado como autor (sem conta no sistema).`
    });
  };

  const removeAuthor = async (authorId: string) => {
    const authorToRemove = authors.find(a => a.id === authorId);
    
    if (ebookId && authorToRemove?.userId) {
      try {
        const { error } = await supabase
          .from("book_authors")
          .delete()
          .eq("id", authorId);

        if (error) throw error;
      } catch (error: any) {
        toast({
          title: "Erro ao remover autor",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
    }

    const updatedAuthors = authors.filter(a => a.id !== authorId);
    setAuthors(updatedAuthors);
    onChange?.(updatedAuthors);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0) {
        addAuthorFromSuggestion(suggestions[0]);
      } else if (inputValue.trim()) {
        addNewAuthor();
      }
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30';
      case 'rejected':
        return 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'accepted':
        return 'Aceito';
      case 'rejected':
        return 'Rejeitado';
      case 'pending':
        return 'Pendente';
      default:
        return '';
    }
  };

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Author tags */}
      <div className="flex flex-wrap gap-2">
        {authors.map(author => (
          <Badge
            key={author.id}
            variant="outline"
            className={cn(
              "flex items-center gap-1.5 py-1.5 px-3 text-sm",
              getStatusColor(author.status)
            )}
          >
            <span>{author.name}</span>
            {author.status && (
              <span className="text-xs opacity-70">({getStatusLabel(author.status)})</span>
            )}
            {author.isNew && (
              <span className="text-xs opacity-70">(Novo)</span>
            )}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeAuthor(author.id)}
                className="ml-1 hover:bg-background/50 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>

      {/* Input with autocomplete */}
      {!disabled && (
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder="Digite o nome do autor..."
                disabled={loading}
              />
              {searchLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={addNewAuthor}
              disabled={!inputValue.trim() || loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && (suggestions.length > 0 || (inputValue.length >= 2 && !searchLoading)) && (
            <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
              {suggestions.map(profile => (
                <button
                  key={profile.id}
                  type="button"
                  className="w-full px-4 py-3 text-left hover:bg-accent flex items-center gap-3 transition-colors"
                  onClick={() => addAuthorFromSuggestion(profile)}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                    {(profile.full_name || profile.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{profile.full_name || profile.username}</p>
                    {profile.username && profile.full_name && (
                      <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
                    )}
                  </div>
                  <Check className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
              
              {inputValue.length >= 2 && !searchLoading && suggestions.length === 0 && (
                <button
                  type="button"
                  className="w-full px-4 py-3 text-left hover:bg-accent flex items-center gap-3 transition-colors border-t border-border"
                  onClick={addNewAuthor}
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Adicionar "{inputValue}"</p>
                    <p className="text-xs text-muted-foreground">Como novo autor (sem conta)</p>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
