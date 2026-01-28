import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import AuthorInput from '@/components/AuthorInput';
import { ArrowLeft, Loader2, Save, ArrowRight, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Author {
  id: string;
  name: string;
  userId?: string;
  status?: 'pending' | 'accepted' | 'rejected';
  isNew?: boolean;
}

interface EbookData {
  id: string;
  title: string;
  description: string | null;
  author: string | null;
  genre: string | null;
  price: number | null;
  cover_image: string | null;
}

interface EbookMetadataFormProps {
  ebook: EbookData;
  onContinue: (updatedEbook: EbookData, newCoverImage: File | null) => void;
  onBack: () => void;
}

const EbookMetadataForm: React.FC<EbookMetadataFormProps> = ({ ebook, onContinue, onBack }) => {
  const { toast } = useToast();
  const [title, setTitle] = useState(ebook.title || '');
  const [description, setDescription] = useState(ebook.description || '');
  const [authors, setAuthors] = useState<Author[]>([]);
  const [selectedGenre, setSelectedGenre] = useState(ebook.genre || '');
  const [isFree, setIsFree] = useState((ebook.price || 0) === 0);
  const [price, setPrice] = useState(String(ebook.price || 0));
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(ebook.cover_image);
  const [genres, setGenres] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGenres();
    parseAuthors();
  }, []);

  const fetchGenres = async () => {
    const { data } = await supabase.from('genres').select('*').order('name');
    if (data) {
      setGenres(data);
    }
  };

  const parseAuthors = () => {
    if (ebook.author) {
      const authorNames = ebook.author.split(',').map(name => name.trim());
      setAuthors(authorNames.map(name => ({
        id: crypto.randomUUID(),
        name,
        status: 'accepted' as const
      })));
    }
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      setCoverImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveCoverImage = () => {
    setCoverImage(null);
    setCoverImagePreview(null);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: 'Título obrigatório',
        description: 'Por favor, insira um título para o ebook.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const authorString = authors.map(a => a.name).join(', ');
      const updatedPrice = isFree ? 0 : parseFloat(price) || 0;

      // Upload cover image if new one was selected
      let coverUrl = ebook.cover_image;
      if (coverImage) {
        const fileExt = coverImage.name.split('.').pop();
        const fileName = `${ebook.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('ebook-covers')
          .upload(fileName, coverImage, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('ebook-covers')
          .getPublicUrl(fileName);
        coverUrl = publicUrl;
      } else if (!coverImagePreview) {
        coverUrl = null;
      }

      const { error } = await supabase
        .from('ebooks')
        .update({
          title,
          description,
          author: authorString,
          genre: selectedGenre || null,
          price: updatedPrice,
          cover_image: coverUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', ebook.id);

      if (error) throw error;

      toast({
        title: 'Salvo com sucesso!',
        description: 'As informações do ebook foram atualizadas.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Ocorreu um erro ao salvar as informações.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = () => {
    if (!title.trim()) {
      toast({
        title: 'Título obrigatório',
        description: 'Por favor, insira um título para o ebook.',
        variant: 'destructive'
      });
      return;
    }

    const authorString = authors.map(a => a.name).join(', ');
    const updatedPrice = isFree ? 0 : parseFloat(price) || 0;

    const updatedEbook: EbookData = {
      ...ebook,
      title,
      description,
      author: authorString,
      genre: selectedGenre || null,
      price: updatedPrice,
      cover_image: coverImagePreview
    };

    onContinue(updatedEbook, coverImage);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with back button */}
      <div className="border-b bg-card px-4 py-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Voltar</span>
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Ebook</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Título */}
            <div>
              <label className="text-sm font-medium mb-2 block">Título</label>
              <Input
                value={title.replace(/<[^>]*>/g, '')}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título do ebook"
                className="w-full"
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="text-sm font-medium mb-2 block">Descrição</label>
              <Textarea
                value={description.replace(/<[^>]*>/g, '')}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição do ebook"
                className="w-full min-h-[200px]"
              />
            </div>

            {/* Autores */}
            <div>
              <label className="text-sm font-medium mb-2 block">Autores</label>
              <AuthorInput
                initialAuthors={authors}
                onChange={(newAuthors) => setAuthors(newAuthors)}
              />
            </div>

            {/* Gênero */}
            <div className="space-y-2">
              <Label htmlFor="genre-edit">Gênero</Label>
              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger id="genre-edit">
                  <SelectValue placeholder="Selecione um gênero" />
                </SelectTrigger>
                <SelectContent>
                  {genres.map((genre) => (
                    <SelectItem key={genre.id} value={genre.name}>
                      {genre.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Preço */}
            <div className="space-y-2">
              <Label htmlFor="price-type-edit">Tipo de Preço</Label>
              <Select
                value={isFree ? 'free' : 'paid'}
                onValueChange={(value) => {
                  const free = value === 'free';
                  setIsFree(free);
                  if (free) setPrice('0');
                }}
              >
                <SelectTrigger id="price-type-edit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Grátis</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preço */}
            {!isFree && (
              <div className="space-y-2">
                <Label htmlFor="price-edit">Preço (MZN)</Label>
                <Input
                  id="price-edit"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            )}

            {/* Capa do Ebook */}
            <div>
              <label className="text-sm font-medium mb-2 block">Capa do Ebook</label>
              {coverImagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={coverImagePreview}
                    alt="Capa"
                    className="w-full max-w-xs h-auto rounded-lg border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveCoverImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageChange}
                    className="hidden"
                    id="cover-upload"
                  />
                  <label
                    htmlFor="cover-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Clique para fazer upload da capa
                    </p>
                  </label>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={!title || saving}
                variant="outline"
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleContinue}
                disabled={!title || saving}
                className="flex-1 bg-gradient-primary hover:opacity-90"
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EbookMetadataForm;
