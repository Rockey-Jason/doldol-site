CREATE OR REPLACE FUNCTION public.dori_enqueue_notification_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_trigger_token text;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret
    INTO v_trigger_token
    FROM vault.decrypted_secrets
   WHERE name = 'dori_bank_push_trigger_token'
   LIMIT 1;

  IF COALESCE(v_trigger_token, '') = '' THEN
    RAISE WARNING 'Dori Site push token is missing; notification % was saved without push.', NEW.id;
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://scttowfhygcpdirrekqm.supabase.co/functions/v1/dori-bank-push',
    body := jsonb_build_object('notification_id', NEW.id::text),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-dori-bank-push-token', v_trigger_token
    ),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Dori Site push enqueue failed for notification %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS dori_bank_transfer_push_trigger ON public.dori_bank_transactions;

DROP TRIGGER IF EXISTS dori_notifications_web_push ON public.dori_notifications;
CREATE TRIGGER dori_notifications_web_push
AFTER INSERT ON public.dori_notifications
FOR EACH ROW
EXECUTE FUNCTION public.dori_enqueue_notification_push();

REVOKE EXECUTE ON FUNCTION public.dori_enqueue_notification_push() FROM PUBLIC, anon, authenticated;
