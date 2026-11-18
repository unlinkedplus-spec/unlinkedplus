import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { isUUID } from 'class-validator';

export function certificateDirectory(storagePath?: string): string {
  return join(resolve(storagePath || 'storage'), 'certificates');
}

export function newCertificateBasename(id: string): string {
  if (!isUUID(id)) throw new Error('Invalid certificate ID');
  // Separate generation names prevent an expired worker from deleting another attempt's output.
  return `${id}.${randomUUID()}.png`;
}

export function certificateFilePath(storagePath: string | undefined, id: string, imagePath: string): string {
  if (!isUUID(id)) throw new Error('Invalid certificate ID');
  const prefix = `${id}.`;
  const generation = imagePath.slice(prefix.length, -4);
  if (!imagePath.startsWith(prefix) || !imagePath.endsWith('.png') || !isUUID(generation, '4')) {
    throw new Error('Invalid certificate filename');
  }
  return join(certificateDirectory(storagePath), imagePath);
}
