/** Fold case and diacritics, drop punctuation, collapse whitespace. "Château d'Yquem!" -> "chateau d yquem" */
export function foldText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}
