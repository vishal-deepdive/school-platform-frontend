// Mirrors app/shared/utils.py::parse_photo_filename on the backend, so a
// mis-named photo is rejected instantly in the browser instead of round
// tripping to the server. The server re-validates independently — this is a
// UX fast-path, not the source of truth.

const SAFE_ID_RE = /^[a-zA-Z0-9\-_]+$/;
const SAFE_PHOTO_NAME_RE = /^[A-Za-z][A-Za-z0-9 ._'-]{0,99}$/;
const TRAILING_INDEX_RE = /^(.+)_(\d{1,3})$/;
const PHOTO_EXTS = [".jpg", ".jpeg", ".png"];

export interface PhotoIdentity {
  rollNo: string;
  name: string;
}

/**
 * Parse a directly-uploaded student photo filename of the form
 * 'RollNo_Name.jpg' or 'RollNo_Name_2.jpg' (an optional trailing numeric
 * index distinguishes multiple photos of the same student).
 */
export function parsePhotoFilename(filename: string): PhotoIdentity | null {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return null;
  const ext = filename.slice(dot).toLowerCase();
  if (!PHOTO_EXTS.includes(ext)) return null;

  const stem = filename.slice(0, dot);
  const sep = stem.indexOf("_");
  if (sep < 0) return null;

  const rollNo = stem.slice(0, sep).trim();
  let name = stem.slice(sep + 1).trim();
  if (!rollNo || !name || !SAFE_ID_RE.test(rollNo)) return null;

  const idxMatch = name.match(TRAILING_INDEX_RE);
  if (idxMatch) name = idxMatch[1];

  if (!SAFE_PHOTO_NAME_RE.test(name)) return null;
  return { rollNo, name };
}
