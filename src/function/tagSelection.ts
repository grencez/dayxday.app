export interface Tag {
  id: string;
  name: string;
  archived?: true;
}

export interface TagGroup {
  id: string;
  name: string;
  tags: Tag[];
  exclusive?: true;
}

export function selectionKey(tagIds: readonly string[]): string {
  return [...new Set(tagIds)].sort().join("\u001f");
}

export function selectionsEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return selectionKey(left) === selectionKey(right);
}

export function canonicalTagIds(
  tagIds: readonly string[],
  groups: readonly TagGroup[],
): string[] {
  const selected = new Set(tagIds);
  const result: string[] = [];
  for (const group of groups) {
    for (const tag of group.tags) {
      if (selected.has(tag.id)) result.push(tag.id);
    }
  }
  return result;
}

export function normalizeSelection(
  tagIds: readonly string[],
  groups: readonly TagGroup[],
  activeOnly = true,
): string[] {
  const selected = new Set(tagIds);
  const result: string[] = [];

  for (const group of groups) {
    for (const tag of group.tags) {
      if (!selected.has(tag.id) || (activeOnly && tag.archived === true)) {
        continue;
      }
      result.push(tag.id);
      if (group.exclusive === true) break;
    }
  }
  return result;
}

export function isValidSelection(
  tagIds: readonly string[],
  groups: readonly TagGroup[],
  activeOnly = true,
): boolean {
  if (tagIds.length === 0 || new Set(tagIds).size !== tagIds.length)
    return false;
  const normalized = normalizeSelection(tagIds, groups, activeOnly);
  return (
    normalized.length === tagIds.length && selectionsEqual(normalized, tagIds)
  );
}

export function selectionTitle(
  tagIds: readonly string[],
  groups: readonly TagGroup[],
): string {
  const selected = new Set(tagIds);
  const names: string[] = [];
  for (const group of groups) {
    for (const tag of group.tags) {
      if (selected.has(tag.id)) names.push(tag.name);
    }
  }
  return names.join(" · ");
}

export function findTagGroup(
  tagId: string,
  groups: readonly TagGroup[],
): TagGroup | undefined {
  return groups.find((group) => group.tags.some((tag) => tag.id === tagId));
}
