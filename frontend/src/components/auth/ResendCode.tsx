import { useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { Button, Spinner } from '@/components/common';
import { getResendSeconds, startResendCooldown, type OtpFlow } from '@/utils/authFlow';

export default function ResendCode({ flow, email, onResend, onSuccess }: {
  flow: OtpFlow;
  email: string;
  onResend: () => Promise<void>;
  onSuccess: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(() => getResendSeconds(flow, email));
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState('');
  const inFlight = useRef(false);

  useEffect(() => {
    const update = () => setSecondsLeft(getResendSeconds(flow, email));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [flow, email]);

  const resend = async () => {
    if (inFlight.current || getResendSeconds(flow, email) > 0) return;
    inFlight.current = true;
    setPending(true);
    setFeedback('');
    try {
      await onResend();
      onSuccess();
      startResendCooldown(flow, email);
      setSecondsLeft(getResendSeconds(flow, email));
      setFeedback(flow === 'reset' ? 'If an account exists for this email, a new code has been sent.' : 'A new code has been sent to your email.');
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 429) {
        const retryAfter = Number(error.response.headers['retry-after']);
        if (Number.isFinite(retryAfter) && retryAfter > 0) {
          startResendCooldown(flow, email, retryAfter);
          setSecondsLeft(getResendSeconds(flow, email));
        }
        setFeedback('Please wait before requesting another code.');
      } else {
        setFeedback('Unable to send a new code right now. Please try again.');
      }
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  return (
    <div className="text-center">
      <p className="text-sm text-content-muted">Didn't receive the code?</p>
      <Button type="button" variant="ghost" size="sm" className="mt-1 min-w-44 text-accent" disabled={pending || secondsLeft > 0} aria-busy={pending} onClick={resend}>
        {pending && <Spinner />}
        {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : 'Resend code'}
      </Button>
      {feedback && <p role="status" className={`mt-2 text-xs ${feedback.startsWith('Unable') || feedback.startsWith('Please wait') ? 'text-danger' : 'text-success'}`}>{feedback}</p>}
    </div>
  );
}
