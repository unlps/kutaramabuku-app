import { supabase } from '@/integrations/supabase/client';

export async function openStoredEbookExport(ebookId: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    throw new Error('Sessao invalida.');
  }

  const formats: Array<'pdf' | 'docx'> = ['pdf', 'docx'];

  for (const format of formats) {
    const path = `${session.user.id}/${ebookId}/exports/latest.${format}`;
    const { data, error } = await supabase.storage.from('ebook-uploads').createSignedUrl(path, 60 * 60);

    if (!error && data?.signedUrl) {
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      return format;
    }
  }

  throw new Error('Nenhuma exportacao foi encontrada para este ebook.');
}
