import { supabase } from '@/integrations/supabase/client';

export async function ensureBookInLibrary(ebookId: string, price = 0) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Faca login para adicionar este livro a biblioteca.');
  }

  const { data: existingPurchase, error: selectError } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', user.id)
    .eq('ebook_id', ebookId)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existingPurchase) {
    return existingPurchase.id;
  }

  const { data: insertedPurchase, error: insertError } = await supabase
    .from('purchases')
    .insert({
      user_id: user.id,
      ebook_id: ebookId,
      price,
    })
    .select('id')
    .single();

  if (insertError) {
    throw insertError;
  }

  return insertedPurchase.id;
}
