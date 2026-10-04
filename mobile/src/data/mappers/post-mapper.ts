import { Post } from '@/domain/models';

export class DataMappingError extends Error {
  constructor(field: string, reason: string) {
    super(`Invalid data field "${field}": ${reason}`);
    this.name = 'DataMappingError';
  }
}

function record(input: unknown): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new DataMappingError('row', 'expected an object');
  }
  return input as Record<string, unknown>;
}

function stringField(row: Record<string, unknown>, field: string): string {
  const value = row[field];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new DataMappingError(field, 'expected a non-empty string');
  }
  return value;
}

function nullableStringField(
  row: Record<string, unknown>,
  field: string,
): string | null {
  const value = row[field];
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new DataMappingError(field, 'expected a string or null');
  }
  return value;
}

function nonNegativeInteger(
  row: Record<string, unknown>,
  field: string,
): number {
  const value = row[field];
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new DataMappingError(field, 'expected a non-negative integer');
  }
  return value as number;
}

function positiveInteger(row: Record<string, unknown>, field: string): number {
  const value = nonNegativeInteger(row, field);
  if (value === 0) throw new DataMappingError(field, 'expected a positive integer');
  return value;
}

function sqliteBoolean(row: Record<string, unknown>, field: string): boolean {
  const value = row[field];
  if (value !== 0 && value !== 1 && typeof value !== 'boolean') {
    throw new DataMappingError(field, 'expected 0, 1, or boolean');
  }
  return value === 1 || value === true;
}

function timestamp(row: Record<string, unknown>, field: string): string {
  const value = stringField(row, field);
  if (Number.isNaN(Date.parse(value))) {
    throw new DataMappingError(field, 'expected an ISO timestamp');
  }
  return value;
}

export function mapPostRow(input: unknown): Post {
  const row = record(input);

  return {
    id: stringField(row, 'id'),
    author: {
      id: stringField(row, 'author_id'),
      username: stringField(row, 'author_username'),
      displayName: stringField(row, 'author_display_name'),
      avatarUrl: nullableStringField(row, 'author_avatar_url'),
      isPrivate: sqliteBoolean(row, 'author_is_private'),
    },
    caption: nullableStringField(row, 'caption') ?? '',
    media: {
      url: stringField(row, 'media_url'),
      width: positiveInteger(row, 'media_width'),
      height: positiveInteger(row, 'media_height'),
    },
    likeCount: nonNegativeInteger(row, 'like_count'),
    commentCount: nonNegativeInteger(row, 'comment_count'),
    viewerHasLiked: sqliteBoolean(row, 'viewer_has_liked'),
    createdAt: timestamp(row, 'created_at'),
  };
}
