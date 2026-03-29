import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, CheckCircle2, Globe, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

type StepKey = "identity" | "writing" | "presence" | "trust";

const STEP_ORDER: StepKey[] = ["identity", "writing", "presence", "trust"];

const STEP_META: Record<StepKey, { title: string; subtitle: string }> = {
  identity: {
    title: "Identidade",
    subtitle: "Foto, bios, nacionalidade e idiomas.",
  },
  writing: {
    title: "Escrita",
    subtitle: "Como escreves e que tipo de conteudo publicas.",
  },
  presence: {
    title: "Presenca online",
    subtitle: "Website, redes sociais e visibilidade do perfil.",
  },
  trust: {
    title: "Confianca",
    subtitle: "Configuracao avancada e verificacao opcional.",
  },
};

const LANGUAGE_OPTIONS = ["Portugues", "Ingles", "Frances", "Espanhol", "Suaile", "Xitsonga"];
const GENRE_OPTIONS = [
  "Romance",
  "Poesia",
  "Fantasia",
  "Misterio",
  "Thriller",
  "Biografia",
  "Autoajuda",
  "Infantil",
  "Educativo",
];
const CONTENT_TYPE_OPTIONS = ["Livros", "Poesia", "Contos", "Ensaios", "Guias", "Cronicas"];
const AUTHOR_STATUS_OPTIONS = ["Independente", "Publicado", "Iniciante"];

interface SocialLinksState {
  instagram: string;
  facebook: string;
  linkedin: string;
  x: string;
}

const toggleArrayValue = (values: string[], value: string) => {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
};

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [shortBio, setShortBio] = useState("");
  const [detailedBio, setDetailedBio] = useState("");
  const [nationality, setNationality] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);

  const [writingGenres, setWritingGenres] = useState<string[]>([]);
  const [contentType, setContentType] = useState("");
  const [writingStyle, setWritingStyle] = useState("");
  const [publisher, setPublisher] = useState("");
  const [authorStatus, setAuthorStatus] = useState("");

  const [website, setWebsite] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLinksState>({
    instagram: "",
    facebook: "",
    linkedin: "",
    x: "",
  });
  const [isPrivate, setIsPrivate] = useState(false);

  const [identityVerificationRequested, setIdentityVerificationRequested] = useState(false);

  const currentStep = STEP_ORDER[currentStepIndex];
  const progressValue = ((currentStepIndex + 1) / STEP_ORDER.length) * 100;

  const progressLabel = useMemo(() => {
    return `Perfil ${Math.round(progressValue)}% completo`;
  }, [progressValue]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          navigate("/auth", { replace: true });
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select(
            "full_name, avatar_url, short_bio, detailed_bio, nationality, languages, writing_genres, content_type, writing_style, publisher, author_status, website, social_links, is_private, identity_verification_requested, profile_completed"
          )
          .eq("id", session.user.id)
          .single();

        if (error) throw error;

        if (!isMounted) return;

        if (profile.profile_completed) {
          navigate("/dashboard", { replace: true });
          return;
        }

        setSessionUserId(session.user.id);
        setFullName(profile.full_name || session.user.user_metadata?.full_name || "");
        setAvatarPreview(profile.avatar_url || "");
        setShortBio(profile.short_bio || "");
        setDetailedBio(profile.detailed_bio || "");
        setNationality(profile.nationality || "");
        setLanguages(profile.languages || []);
        setWritingGenres(profile.writing_genres || []);
        setContentType(profile.content_type || "");
        setWritingStyle(profile.writing_style || "");
        setPublisher(profile.publisher || "");
        setAuthorStatus(profile.author_status || "");
        setWebsite(profile.website || "");
        setIsPrivate(Boolean(profile.is_private));
        setIdentityVerificationRequested(Boolean(profile.identity_verification_requested));

        const savedSocialLinks = (profile.social_links as Partial<SocialLinksState> | null) || {};
        setSocialLinks({
          instagram: savedSocialLinks.instagram || "",
          facebook: savedSocialLinks.facebook || "",
          linkedin: savedSocialLinks.linkedin || "",
          x: savedSocialLinks.x || "",
        });
      } catch (error: any) {
        toast({
          title: "Erro ao carregar perfil",
          description: error.message || "Nao foi possivel carregar o onboarding de perfil.",
          variant: "destructive",
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [navigate, toast]);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatarIfNeeded = async () => {
    if (!avatarFile || !sessionUserId) {
      return avatarPreview || null;
    }

    const fileExt = avatarFile.name.split(".").pop();
    const fileName = `${sessionUserId}/profile-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, avatarFile, { upsert: true });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName);

    return publicUrl;
  };

  const persistProfile = async (markAsComplete: boolean) => {
    if (!sessionUserId) return;

    setSaving(true);
    try {
      const avatarUrl = await uploadAvatarIfNeeded();

      const primarySocialLink =
        socialLinks.instagram || socialLinks.facebook || socialLinks.linkedin || socialLinks.x || null;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName || null,
          avatar_url: avatarUrl,
          short_bio: shortBio || null,
          detailed_bio: detailedBio || null,
          bio: detailedBio || shortBio || null,
          nationality: nationality || null,
          languages,
          writing_genres: writingGenres,
          content_type: contentType || null,
          writing_style: writingStyle || null,
          publisher: publisher || null,
          author_status: authorStatus || null,
          website: website || null,
          social_link: primarySocialLink,
          social_links: socialLinks,
          is_private: isPrivate,
          identity_verification_requested: identityVerificationRequested,
          profile_completed: markAsComplete,
        })
        .eq("id", sessionUserId);

      if (error) throw error;

      if (markAsComplete) {
        toast({
          title: "Perfil concluido",
          description: "O teu perfil esta pronto e ja podes continuar.",
        });
        navigate("/dashboard", { replace: true });
        return;
      }

      setAvatarFile(null);
    } catch (error: any) {
      toast({
        title: "Erro ao guardar perfil",
        description: error.message || "Nao foi possivel guardar o perfil.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const isLastStep = currentStepIndex === STEP_ORDER.length - 1;

    try {
      await persistProfile(isLastStep);
      if (!isLastStep) {
        setCurrentStepIndex((prev) => prev + 1);
      }
    } catch {
      return;
    }
  };

  const handleBack = () => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const renderToggleGroup = (
    values: string[],
    setValues: (values: string[]) => void,
    options: string[]
  ) => {
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = values.includes(option);

          return (
            <Button
              key={option}
              type="button"
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => setValues(toggleArrayValue(values, option))}
              className={isActive ? "bg-gradient-primary hover:opacity-90" : ""}
            >
              {option}
            </Button>
          );
        })}
      </div>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case "identity":
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24 border shadow-sm">
                <AvatarImage src={avatarPreview} />
                <AvatarFallback className="bg-gradient-primary text-2xl text-white">
                  {fullName?.charAt(0) || "A"}
                </AvatarFallback>
              </Avatar>
              <Label htmlFor="profile-avatar" className="cursor-pointer">
                <div className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted">
                  <Camera className="h-4 w-4" />
                  Foto de perfil
                </div>
                <Input
                  id="profile-avatar"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </Label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="short-bio">Biografia curta</Label>
                <Textarea
                  id="short-bio"
                  value={shortBio}
                  onChange={(event) => setShortBio(event.target.value)}
                  placeholder="Uma apresentacao curta para o teu perfil."
                  rows={3}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="detailed-bio">Biografia completa</Label>
                <Textarea
                  id="detailed-bio"
                  value={detailedBio}
                  onChange={(event) => setDetailedBio(event.target.value)}
                  placeholder="Conta mais sobre a tua trajetoria, influencias e percurso."
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nationality">Nacionalidade</Label>
                <Input
                  id="nationality"
                  value={nationality}
                  onChange={(event) => setNationality(event.target.value)}
                  placeholder="Ex: Mocambicana"
                />
              </div>

              <div className="space-y-2">
                <Label>Idioma(s)</Label>
                {renderToggleGroup(languages, setLanguages, LANGUAGE_OPTIONS)}
              </div>
            </div>
          </div>
        );

      case "writing":
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Generos</Label>
              {renderToggleGroup(writingGenres, setWritingGenres, GENRE_OPTIONS)}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo de conteudo</Label>
                <Select value={contentType || undefined} onValueChange={setContentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleciona um tipo de conteudo" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="writing-style">Estilo de escrita</Label>
                <Input
                  id="writing-style"
                  value={writingStyle}
                  onChange={(event) => setWritingStyle(event.target.value)}
                  placeholder="Ex: Poetico, academico, minimalista..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="publisher">Editora</Label>
                <Input
                  id="publisher"
                  value={publisher}
                  onChange={(event) => setPublisher(event.target.value)}
                  placeholder="Se tiver, indica a editora."
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={authorStatus || undefined} onValueChange={setAuthorStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleciona o teu estado atual" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTHOR_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case "presence":
        return (
          <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  placeholder="https://teusite.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  type="url"
                  value={socialLinks.instagram}
                  onChange={(event) =>
                    setSocialLinks((prev) => ({ ...prev, instagram: event.target.value }))
                  }
                  placeholder="https://instagram.com/teuperfil"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  type="url"
                  value={socialLinks.facebook}
                  onChange={(event) =>
                    setSocialLinks((prev) => ({ ...prev, facebook: event.target.value }))
                  }
                  placeholder="https://facebook.com/teuperfil"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  type="url"
                  value={socialLinks.linkedin}
                  onChange={(event) =>
                    setSocialLinks((prev) => ({ ...prev, linkedin: event.target.value }))
                  }
                  placeholder="https://linkedin.com/in/teuperfil"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="x-profile">X / Twitter</Label>
                <Input
                  id="x-profile"
                  type="url"
                  value={socialLinks.x}
                  onChange={(event) =>
                    setSocialLinks((prev) => ({ ...prev, x: event.target.value }))
                  }
                  placeholder="https://x.com/teuperfil"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-4">
              <div className="space-y-1">
                <p className="font-medium">Perfil publico / privado</p>
                <p className="text-sm text-muted-foreground">
                  {isPrivate
                    ? "O teu perfil fica privado e novos seguidores precisam de aprovacao."
                    : "O teu perfil fica publico para todos."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {isPrivate ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
              </div>
            </div>
          </div>
        );

      case "trust":
        return (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-muted/30 p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                <div className="space-y-2">
                  <p className="font-medium">Verificacao de identidade (opcional)</p>
                  <p className="text-sm text-muted-foreground">
                    Ativa esta opcao se quiseres sinalizar interesse em verificacao futura da tua identidade.
                  </p>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={identityVerificationRequested}
                      onCheckedChange={setIdentityVerificationRequested}
                    />
                    <span className="text-sm">
                      {identityVerificationRequested
                        ? "Quero solicitar verificacao de identidade."
                        : "Posso tratar disso mais tarde."}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Card className="border-dashed bg-card/70 p-5">
              <p className="font-medium">Tudo opcional</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Podes concluir agora sem preencher tudo. Depois editas o teu perfil quando quiseres.
              </p>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">A carregar onboarding...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-36">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-2xl font-bold">Completa o teu perfil (+ visibilidade)</h1>
            <p className="text-sm text-muted-foreground">
              Preenche o essencial para terminares a configuracao da tua conta de autor.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            {STEP_ORDER.map((stepKey, index) => {
              const isActive = index === currentStepIndex;
              const isDone = index < currentStepIndex;

              return (
                <div
                  key={stepKey}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    isActive ? "border-primary bg-primary/5" : isDone ? "border-emerald-500/30 bg-emerald-500/5" : "border-border"
                  }`}
                >
                  <p className="font-medium">{STEP_META[stepKey].title}</p>
                  <p className="text-xs text-muted-foreground">{STEP_META[stepKey].subtitle}</p>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Card className="rounded-2xl border p-6 shadow-sm sm:p-8">
          <div className="mb-8">
            <p className="text-sm font-medium text-primary">
              Etapa {currentStepIndex + 1} de {STEP_ORDER.length}
            </p>
            <h2 className="mt-1 text-2xl font-semibold">{STEP_META[currentStep].title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{STEP_META[currentStep].subtitle}</p>
          </div>

          {renderStep()}
        </Card>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-4 sm:px-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{progressLabel}</span>
              <span className="text-muted-foreground">{Math.round(progressValue)}%</span>
            </div>
            <Progress value={progressValue} className="h-2" />
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStepIndex === 0 || saving}
            >
              Voltar
            </Button>

            <Button type="button" onClick={handleNext} disabled={saving}>
              {saving
                ? "A guardar..."
                : currentStepIndex === STEP_ORDER.length - 1
                  ? "Concluir perfil"
                  : "Proxima etapa"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
