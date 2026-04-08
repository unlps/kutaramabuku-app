import { supabase } from '@/integrations/supabase/client';

function isMissingCreateNotificationFunctionError(error: any) {
  const errorText = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  return errorText.includes('create_system_notification');
}

async function createLibraryNotification(userId: string, ebookId: string) {
  const { data: ebookData } = await supabase
    .from('ebooks')
    .select('title')
    .eq('id', ebookId)
    .maybeSingle();

  const ebookTitle = ebookData?.title || 'Livro';
  const notificationPayload = {
    ebook_id: ebookId,
    ebook_title: ebookTitle,
  };

  const { error: rpcError } = await (supabase as any).rpc('create_system_notification', {
    p_user_id: userId,
    p_type: 'book_downloaded',
    p_title: 'Livro adicionado a biblioteca',
    p_message: `"${ebookTitle}" foi adicionado a tua biblioteca.`,
    p_data: notificationPayload,
  });

  if (!rpcError) return;

  if (!isMissingCreateNotificationFunctionError(rpcError)) {
    throw rpcError;
  }

  const { error: insertError } = await supabase.from('notifications').insert({
    user_id: userId,
    type: 'book_downloaded',
    title: 'Livro adicionado a biblioteca',
    message: `"${ebookTitle}" foi adicionado a tua biblioteca.`,
    data: notificationPayload,
  });

  if (insertError) {
    throw insertError;
  }
}

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

  await createLibraryNotification(user.id, ebookId);

  return insertedPurchase.id;
}
