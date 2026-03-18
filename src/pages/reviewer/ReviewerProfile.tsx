import { useState, useRef } from "react";
import { reviewerTable, supabase } from "@/integrations/supabase/reviewer-client";
import { useReviewerAuth } from "@/hooks/useReviewerAuth";
import ReviewerLayout from "@/components/reviewer/ReviewerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Copy,
  Check,
  Calendar,
  Building,
  Phone,
  User,
  Save,
  KeyRound,
  Camera,
  Trash2,
  Loader2,
} from "lucide-react";

const SUPABASE_URL = (supabase as any).supabaseUrl || "https://urlumqeyyeeuxsnnhbcn.supabase.co";

const ReviewerProfile = () => {
  const { reviewerProfile, isLoading } = useReviewerAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [publisherName, setPublisherName] = useState("");
  const [phone, setPhone] = useState("");
  const [secondaryContact, setSecondaryContact] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form fields from profile
  if (reviewerProfile && !initialized) {
    setFullName(reviewerProfile.full_name || "");
    setPublisherName(reviewerProfile.publisher_name || "");
    setPhone(reviewerProfile.phone || "");
    setSecondaryContact(reviewerProfile.secondary_contact || "");
    setDateOfBirth(reviewerProfile.date_of_birth || "");
    setAvatarUrl(reviewerProfile.avatar_url || null);
    setInitialized(true);
  }

  const handleCopySecretId = async () => {
    if (!reviewerProfile?.editor_secret_id) return;
    await navigator.clipboard.writeText(reviewerProfile.editor_secret_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copiado!", description: "ID Secreto copiado para a área de transferência." });
  };

  // ── Avatar Upload ──
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !reviewerProfile) return;

    // Validate file
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast({
        title: "Ficheiro demasiado grande",
        description: "A foto deve ter no máximo 2MB.",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Tipo inválido",
        description: "Por favor selecione uma imagem (JPG, PNG, etc.).",
        variant: "destructive",
      });
      return;
    }

    setUploadingAvatar(true);

    try {
      const ext = file.name.split(".").pop();
      const filePath = `${reviewerProfile.id}/avatar.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("reviewer-avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("reviewer-avatars")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`; // bust cache

      // Update profile
      const { error: updateError } = await reviewerTable("reviewer_profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", reviewerProfile.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast({
        title: "Foto actualizada",
        description: "A sua foto de perfil foi actualizada com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar foto",
        description: error.message || "Não foi possível carregar a foto.",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAvatarRemove = async () => {
    if (!reviewerProfile) return;
    setUploadingAvatar(true);

    try {
      // List and remove files from the user's folder
      const { data: files } = await supabase.storage
        .from("reviewer-avatars")
        .list(reviewerProfile.id);

      if (files && files.length > 0) {
        const filePaths = files.map((f: any) => `${reviewerProfile.id}/${f.name}`);
        await supabase.storage.from("reviewer-avatars").remove(filePaths);
      }

      // Update profile
      const { error } = await reviewerTable("reviewer_profiles")
        .update({ avatar_url: null })
        .eq("id", reviewerProfile.id);

      if (error) throw error;

      setAvatarUrl(null);
      toast({
        title: "Foto removida",
        description: "A sua foto de perfil foi removida.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover foto",
        description: error.message || "Não foi possível remover a foto.",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerProfile) return;

    setSaving(true);
    try {
      const { error } = await reviewerTable("reviewer_profiles")
        .update({
          full_name: fullName,
          publisher_name: publisherName || null,
          phone: phone || null,
          secondary_contact: secondaryContact || null,
          date_of_birth: dateOfBirth || null,
        })
        .eq("id", reviewerProfile.id);

      if (error) throw error;

      toast({
        title: "Perfil actualizado",
        description: "As suas informações foram guardadas com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao guardar",
        description: error.message || "Não foi possível actualizar o perfil.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return null;

  const roleBadgeColor =
    reviewerProfile?.role === "admin"
      ? "bg-red-500/10 text-red-500 border-red-500/20"
      : reviewerProfile?.role === "senior_reviewer"
      ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
      : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";

  const roleLabel =
    reviewerProfile?.role === "admin"
      ? "Administrador"
      : reviewerProfile?.role === "senior_reviewer"
      ? "Reviewer Sénior"
      : "Reviewer";

  const initials = reviewerProfile?.full_name?.charAt(0)?.toUpperCase() || "R";

  return (
    <ReviewerLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Meu Perfil</h2>
          <p className="text-muted-foreground mt-1">
            Gerir as suas informações de Reviewer.
          </p>
        </div>

        {/* Profile Card with Avatar */}
        <Card className="p-6 bg-gradient-card">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-primary flex items-center justify-center text-white font-bold text-2xl shadow-glow">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              {/* Hover overlay */}
              <div
                className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </div>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-bold">{reviewerProfile?.full_name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${roleBadgeColor}`}
                >
                  <Shield className="h-3 w-3" />
                  {roleLabel}
                </span>
                <span className="text-xs text-muted-foreground">
                  Desde{" "}
                  {new Date(reviewerProfile?.created_at || "").toLocaleDateString("pt-PT", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>

              {/* Avatar action buttons */}
              <div className="flex items-center gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 px-3"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  ) : (
                    <Camera className="h-3 w-3 mr-1.5" />
                  )}
                  {avatarUrl ? "Alterar Foto" : "Adicionar Foto"}
                </Button>
                {avatarUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 px-3 text-destructive hover:text-destructive"
                    onClick={handleAvatarRemove}
                    disabled={uploadingAvatar}
                  >
                    <Trash2 className="h-3 w-3 mr-1.5" />
                    Remover
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Editor Secret ID */}
        <Card className="p-6 border-2 border-primary/10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">ID Secreto de Editor</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Use este ID para verificação de identidade. Não o partilhe com terceiros.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex-1 bg-muted rounded-lg px-4 py-2.5 font-mono text-sm tracking-widest font-bold select-all">
                  {reviewerProfile?.editor_secret_id || "—"}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={handleCopySecretId}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Edit Form */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-6">Informações Pessoais</h3>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="prof-name" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Nome Completo *
              </Label>
              <Input
                id="prof-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prof-publisher" className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                Editora
              </Label>
              <Input
                id="prof-publisher"
                type="text"
                placeholder="Nome da editora onde trabalha"
                value={publisherName}
                onChange={(e) => setPublisherName(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prof-phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Contacto Principal
                </Label>
                <Input
                  id="prof-phone"
                  type="tel"
                  placeholder="+258 84 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prof-secondary" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Contacto Secundário
                </Label>
                <Input
                  id="prof-secondary"
                  type="text"
                  placeholder="Outro contacto"
                  value={secondaryContact}
                  onChange={(e) => setSecondaryContact(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prof-dob" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Data de Nascimento
              </Label>
              <Input
                id="prof-dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="h-11 max-w-xs"
              />
            </div>

            <div className="pt-4 border-t">
              <Button
                type="submit"
                className="bg-gradient-primary hover:opacity-90 h-11 px-8"
                disabled={saving}
              >
                {saving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    A guardar...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Guardar Alterações
                  </div>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </ReviewerLayout>
  );
};

export default ReviewerProfile;
