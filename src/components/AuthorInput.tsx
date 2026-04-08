import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Author {
  id: string;
  name: string;
  userId?: string;
  status?: "pending" | "accepted" | "rejected";
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
  disabled = false,
}: AuthorInputProps) {
  const [authors, setAuthors] = useState<Author[]>(initialAuthors);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<ProfileSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const isMissingCancelInviteFunctionError = (error: any) => {
    const errorText = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
    return errorText.includes("cancel_book_collaboration_invite");
  };

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };

    getCurrentUser();
  }, []);

  useEffect(() => {
    if (ebookId) {
      loadBookAuthors();
    }
  }, [ebookId]);

  useEffect(() => {
    if (!ebookId) {
      setAuthors(initialAuthors);
    }
  }, [ebookId, initialAuthors]);

  useEffect(() => {
    const searchUsers = async () => {
      if (inputValue.length < 2) {
        setSuggestions([]);
        return;
      }

      setSearchLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles_public")
          .select("id, full_name, username, avatar_url")
          .or(`full_name.ilike.%${inputValue}%,username.ilike.%${inputValue}%`)
          .limit(5);

        if (error) throw error;

        const filteredSuggestions = (data || []).filter(
          (profile) =>
            !authors.some(
              (author) =>
                author.userId === profile.id ||
                author.name.toLowerCase() ===
                  (profile.full_name || profile.username || "").toLowerCase()
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
  }, [authors, inputValue]);

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
          profiles_public:user_id (
            id,
            full_name,
            username
          )
        `)
        .eq("ebook_id", ebookId);

      if (error) throw error;

      const loadedAuthors: Author[] = (data || []).map((bookAuthor: any) => ({
        id: bookAuthor.id,
        name:
          bookAuthor.profiles_public?.full_name ||
          bookAuthor.profiles_public?.username ||
          "Unknown",
        userId: bookAuthor.user_id,
        status: bookAuthor.status,
      }));

      setAuthors(loadedAuthors);
      onChange?.(loadedAuthors);
    } catch (error) {
      console.error("Error loading book authors:", error);
    }
  };

  const isDuplicate = (name: string) => {
    return authors.some((author) => author.name.toLowerCase() === name.toLowerCase());
  };

  const addAuthorFromSuggestion = async (profile: ProfileSuggestion) => {
    const name = profile.full_name || profile.username || "";

    if (isDuplicate(name)) {
      toast({
        title: "Autor duplicado",
        description: "Este autor ja foi adicionado.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const isCurrentUser = profile.id === currentUserId;

    try {
      if (ebookId) {
        let bookAuthorId = "";

        if (isCurrentUser) {
          const { data: bookAuthor, error: insertError } = await supabase
            .from("book_authors")
            .insert({
              ebook_id: ebookId,
              user_id: profile.id,
              status: "accepted",
              is_primary: true,
            })
            .select("id")
            .single();

          if (insertError) throw insertError;
          bookAuthorId = bookAuthor.id;
        } else {
          const { data: invitedBookAuthorId, error: inviteError } = await supabase.rpc(
            "invite_book_collaborator",
            {
              p_ebook_id: ebookId,
              p_invited_user_id: profile.id,
            }
          );

          if (inviteError) throw inviteError;
          bookAuthorId = invitedBookAuthorId;
        }

        const newAuthor: Author = {
          id: bookAuthorId,
          name,
          userId: profile.id,
          status: isCurrentUser ? "accepted" : "pending",
        };

        const updatedAuthors = [...authors, newAuthor];
        setAuthors(updatedAuthors);
        onChange?.(updatedAuthors);

        toast({
          title: "Autor adicionado",
          description: isCurrentUser
            ? `${name} foi adicionado como autor principal.`
            : `${name} foi convidado como colaborador.`,
        });
      } else {
        const newAuthor: Author = {
          id: crypto.randomUUID(),
          name,
          userId: profile.id,
          status: isCurrentUser ? "accepted" : "pending",
          isNew: false,
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
        variant: "destructive",
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
        description: "Este autor ja foi adicionado.",
        variant: "destructive",
      });
      return;
    }

    const newAuthor: Author = {
      id: crypto.randomUUID(),
      name,
      isNew: true,
    };

    const updatedAuthors = [...authors, newAuthor];
    setAuthors(updatedAuthors);
    onChange?.(updatedAuthors);

    setInputValue("");
    setSuggestions([]);
    setShowSuggestions(false);

    toast({
      title: "Autor adicionado",
      description: `${name} foi adicionado como autor (sem conta no sistema).`,
    });
  };

  const removeAuthor = async (authorId: string) => {
    const authorToRemove = authors.find((author) => author.id === authorId);

    if (ebookId && authorToRemove?.userId) {
      try {
        if (authorToRemove.status === "pending") {
          const { error: cancelError } = await supabase.rpc("cancel_book_collaboration_invite", {
            p_book_author_id: authorId,
          });

          if (cancelError) {
            if (!isMissingCancelInviteFunctionError(cancelError)) {
              throw cancelError;
            }

            const { error: fallbackDeleteError } = await supabase
              .from("book_authors")
              .delete()
              .eq("id", authorId);

            if (fallbackDeleteError) throw fallbackDeleteError;
          }

          toast({
            title: "Convite cancelado",
            description: `${authorToRemove.name} foi removido dos convites pendentes.`,
          });
        } else {
          const { error } = await supabase.from("book_authors").delete().eq("id", authorId);
          if (error) throw error;
        }
      } catch (error: any) {
        toast({
          title: "Erro ao remover autor",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
    }

    const updatedAuthors = authors.filter((author) => author.id !== authorId);
    setAuthors(updatedAuthors);
    onChange?.(updatedAuthors);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (suggestions.length > 0) {
        addAuthorFromSuggestion(suggestions[0]);
      } else if (inputValue.trim()) {
        addNewAuthor();
      }
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30";
      case "rejected":
        return "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30";
      case "pending":
        return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30";
      default:
        return "bg-primary/20 text-primary border-primary/30";
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "accepted":
        return "Aceito";
      case "rejected":
        return "Rejeitado";
      case "pending":
        return "Pendente";
      default:
        return "";
    }
  };

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {authors.map((author) => (
          <Badge
            key={author.id}
            variant="outline"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm",
              getStatusColor(author.status)
            )}
          >
            <span>{author.name}</span>
            {author.status && (
              <span className="text-xs opacity-70">({getStatusLabel(author.status)})</span>
            )}
            {author.isNew && <span className="text-xs opacity-70">(Novo)</span>}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeAuthor(author.id)}
                className="ml-1 rounded-full p-0.5 hover:bg-background/50"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>

      {!disabled && (
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(event) => {
                  setInputValue(event.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder="Digite o nome do autor..."
                disabled={loading}
              />
              {searchLoading && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={addNewAuthor}
              disabled={!inputValue.trim() || loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {showSuggestions &&
            (suggestions.length > 0 || (inputValue.length >= 2 && !searchLoading)) && (
              <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
                {suggestions.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
                    onClick={() => addAuthorFromSuggestion(profile)}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-medium">
                      {(profile.full_name || profile.username || "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{profile.full_name || profile.username}</p>
                      {profile.username && profile.full_name && (
                        <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
                      )}
                    </div>
                    <Check className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}

                {inputValue.length >= 2 && !searchLoading && suggestions.length === 0 && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 border-t border-border px-4 py-3 text-left transition-colors hover:bg-accent"
                    onClick={addNewAuthor}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
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
