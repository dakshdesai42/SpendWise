export interface BankLinkedAccount {
  id: string;
  name?: string;
  mask?: string;
  subtype?: string;
  type?: string;
}

export interface BankConnection {
  id: string;
  provider: string;
  institutionName: string;
  status: string;
  accountCount: number;
  accounts: BankLinkedAccount[];
  createdAt: string | null;
  updatedAt: string | null;
  lastSyncedAt: string | null;
}

export interface PlaidInstitutionMetadata {
  name?: string | null;
  institution_id?: string | null;
  id?: string | null;
}

export interface PlaidLinkSuccessMetadata {
  institution?: PlaidInstitutionMetadata | null;
  accounts?: BankLinkedAccount[];
  link_session_id?: string;
}

export interface BankSyncResult {
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  lastSyncAt?: string | null;
}

export interface BankSyncEventDetail extends BankSyncResult {
  source?: 'manual' | 'auto' | 'background';
}
