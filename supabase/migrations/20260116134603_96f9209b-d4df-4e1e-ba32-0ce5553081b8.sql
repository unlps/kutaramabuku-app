-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Create a restricted policy that only allows users to create notifications for themselves
CREATE POLICY "Users can create their own notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create a secure function for system-generated notifications (e.g., collaboration requests)
CREATE OR REPLACE FUNCTION public.create_system_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;