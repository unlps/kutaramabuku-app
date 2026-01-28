import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import AuthorInput from '@/components/AuthorInput';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
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

  const handleContinue = async () => {
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

      const updatedEbook: EbookData = {
        ...ebook,
        title,
        description,
        author: authorString,
        genre: selectedGenre || null,
        price: updatedPrice
      };

      onContinue(updatedEbook, coverImage);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao processar os dados.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
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

      <div className="flex items-center justify-center p-4 pt-8">
        <Card className="w-full max-w-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">Informações do eBook</h2>
            <p className="text-muted-foreground">
              Revise e edite os dados do seu eBook antes de continuar
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Digite o título do seu eBook"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="author">Autores</Label>
              <AuthorInput
                initialAuthors={authors}
                onChange={(newAuthors) => setAuthors(newAuthors)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva seu eBook..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="genre">Gênero</Label>
              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger id="genre">
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

            <div className="space-y-2">
              <Label htmlFor="price-type">Tipo de Preço</Label>
              <Select
                value={isFree ? 'free' : 'paid'}
                onValueChange={(value) => {
                  setIsFree(value === 'free');
                  if (value === 'free') setPrice('0');
                }}
              >
                <SelectTrigger id="price-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Grátis</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!isFree && (
              <div className="space-y-2">
                <Label htmlFor="price">Preço (MZN)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="cover">Alterar Capa (opcional)</Label>
              <Input
                id="cover"
                type="file"
                accept="image/*"
                onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
              {ebook.cover_image && !coverImage && (
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground mb-2">Capa atual:</p>
                  <img 
                    src={ebook.cover_image} 
                    alt="Capa atual" 
                    className="w-32 h-auto rounded-md border"
                  />
                </div>
              )}
              {coverImage && (
                <p className="text-sm text-muted-foreground">
                  Nova imagem: {coverImage.name}
                </p>
              )}
            </div>
          </div>

          <Button
            onClick={handleContinue}
            disabled={!title || saving}
            className="w-full bg-gradient-primary hover:opacity-90"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar e Continuar
              </>
            )}
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default EbookMetadataForm;
