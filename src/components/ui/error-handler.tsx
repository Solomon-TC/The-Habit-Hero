"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ErrorHandlerProps {
  fallback?: React.ReactNode;
}

export function ErrorHandler({ fallback }: ErrorHandlerProps) {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Caught error:", event.error);
      setHasError(true);
      setErrorMessage(event.error?.message || "An unknown error occurred");
      event.preventDefault();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Caught promise rejection:", event.reason);
      setHasError(true);
      setErrorMessage(
        event.reason?.message || "An unhandled promise rejection occurred",
      );
      event.preventDefault();
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, []);

  if (!hasError) return null;

  if (fallback) return <>{fallback}</>;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        {errorMessage || "Something went wrong. Please try again."}
      </AlertDescription>
    </Alert>
  );
}
