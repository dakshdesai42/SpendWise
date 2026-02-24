interface PlaidLinkExitError {
  error_code?: string;
  error_message?: string;
  error_type?: string;
  display_message?: string;
}

interface PlaidLinkSuccessMetadata {
  institution?: {
    institution_id?: string | null;
    name?: string | null;
    id?: string | null;
  } | null;
  accounts?: Array<{
    id: string;
    name?: string;
    mask?: string;
    subtype?: string;
    type?: string;
  }>;
  link_session_id?: string;
}

interface PlaidLinkExitMetadata {
  institution?: {
    institution_id?: string | null;
    name?: string | null;
    id?: string | null;
  } | null;
  status?: string;
  request_id?: string;
  link_session_id?: string;
}

interface PlaidHandler {
  open: () => void;
  exit: (options?: { force?: boolean }, callback?: () => void) => void;
  destroy: () => void;
}

interface PlaidCreateConfig {
  token: string;
  receivedRedirectUri?: string;
  onSuccess: (publicToken: string, metadata: PlaidLinkSuccessMetadata) => void;
  onExit?: (error: PlaidLinkExitError | null, metadata: PlaidLinkExitMetadata) => void;
}

interface PlaidNamespace {
  create: (config: PlaidCreateConfig) => PlaidHandler;
}

interface Window {
  Plaid?: PlaidNamespace;
}
