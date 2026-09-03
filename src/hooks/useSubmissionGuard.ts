import { useCallback, useEffect, useRef, useState } from "react";

const useSubmissionGuard = () => {
  const submittingRef = useRef(false);
  const mountedRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const begin = useCallback(() => {
    if (submittingRef.current) return false;
    submittingRef.current = true;
    if (mountedRef.current) setSubmitting(true);
    return true;
  }, []);

  const finish = useCallback(() => {
    submittingRef.current = false;
    if (mountedRef.current) setSubmitting(false);
  }, []);

  const isMounted = useCallback(() => mountedRef.current, []);

  return { submitting, begin, finish, isMounted };
};

export default useSubmissionGuard;
