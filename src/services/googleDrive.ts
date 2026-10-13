import { Category, CreditCard, Transaction } from '../types/finance';

export interface BackupData {
  version: string;
  exportedAt: string;
  source?: string;
  categories: Category[];
  cards: CreditCard[];
  transactions: Transaction[];
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
}

/**
 * Uploads a complete backup JSON file to Google Drive using multipart upload
 */
export async function uploadBackupToDrive(
  token: string,
  backupData: BackupData
): Promise<GoogleDriveFile> {
  const boundary = '-------FinanPlanDriveBoundary_' + Math.random().toString(36).substring(2);
  const now = new Date();
  const dateFormatted = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `finanplan_backup_${dateFormatted}.json`;

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: `Backup do FinanPlan realizado em ${now.toLocaleString('pt-BR')}`,
    properties: {
      app: 'finanplan',
      type: 'backup',
      transactionsCount: String(backupData.transactions?.length || 0),
    },
  };

  const multipartBody =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(backupData, null, 2) +
    `\r\n--${boundary}--`;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime,modifiedTime,size,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Falha ao salvar no Google Drive (${res.status}): ${errorText}`);
  }

  const uploadedFile: GoogleDriveFile = await res.json();
  return uploadedFile;
}

/**
 * Lists backups stored in the user's Google Drive
 */
export async function listDriveBackups(token: string): Promise<GoogleDriveFile[]> {
  const query = encodeURIComponent("trashed = false and name contains 'finanplan_backup'");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime,modifiedTime,size,webViewLink)&orderBy=createdTime desc&pageSize=30`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Falha ao listar backups do Google Drive (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return (data.files || []) as GoogleDriveFile[];
}

/**
 * Downloads and parses backup data from Google Drive
 */
export async function downloadBackupFromDrive(
  token: string,
  fileId: string
): Promise<BackupData> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Falha ao baixar backup do Google Drive (${res.status}): ${errorText}`);
  }

  const json = await res.json();
  if (!json || (!Array.isArray(json.categories) && !Array.isArray(json.transactions))) {
    throw new Error('O arquivo selecionado não contém uma estrutura de backup válida do FinanPlan.');
  }

  return {
    version: json.version || '1.0',
    exportedAt: json.exportedAt || new Date().toISOString(),
    categories: Array.isArray(json.categories) ? json.categories : [],
    cards: Array.isArray(json.cards) ? json.cards : [],
    transactions: Array.isArray(json.transactions) ? json.transactions : [],
  };
}

/**
 * Deletes a backup file from Google Drive
 * Must be preceded by explicit user confirmation in the UI
 */
export async function deleteDriveBackup(token: string, fileId: string): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;

  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok && res.status !== 404) {
    const errorText = await res.text();
    throw new Error(`Falha ao remover arquivo do Google Drive (${res.status}): ${errorText}`);
  }
}
