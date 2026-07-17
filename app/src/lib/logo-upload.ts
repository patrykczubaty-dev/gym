import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Echter Datei-Upload (nicht nur eine URL wie bei Customer/Employee-Fotos):
// die automatische Favicon-Generierung braucht die tatsaechlichen Bilddaten.
// Dateien landen unter public/uploads/gyms/<gymId>/ und werden von Next.js
// wie jede andere public-Datei direkt ausgeliefert.

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "gyms");
const ALLOWED_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};
const MAX_BYTES = 5 * 1024 * 1024;

export class LogoUploadError extends Error {}

async function readValidatedFile(file: File): Promise<{ buffer: Buffer; ext: string }> {
  if (file.size === 0) throw new LogoUploadError("Datei ist leer.");
  if (file.size > MAX_BYTES) {
    throw new LogoUploadError("Datei ist zu groß (max. 5 MB).");
  }
  const ext = ALLOWED_MIME[file.type];
  if (!ext) {
    throw new LogoUploadError("Nur SVG, PNG, JPG oder WebP sind erlaubt.");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    await sharp(buffer).metadata();
  } catch {
    throw new LogoUploadError("Datei konnte nicht als Bild gelesen werden.");
  }
  return { buffer, ext };
}

// Speichert einen hochgeladenen Logo-Datei-Upload und gibt die oeffentliche
// URL zurueck. `field` unterscheidet Standard-/Dark-/Light-Variante im
// Dateinamen, damit mehrere Uploads desselben Gyms sich nicht ueberschreiben.
export async function saveGymLogo(
  gymId: string,
  field: "default" | "on-dark" | "on-light",
  file: File,
): Promise<string> {
  const { buffer, ext } = await readValidatedFile(file);
  const dir = path.join(UPLOAD_ROOT, gymId);
  await mkdir(dir, { recursive: true });
  const filename = `logo-${field}-${Date.now()}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/gyms/${gymId}/${filename}`;
}

// Generiert ein 32x32-PNG-Favicon aus dem Haupt-Logo. Wird immer aus dem
// Standard-Logo abgeleitet, nie separat hochgeladen (siehe Spezifikation).
export async function generateFaviconFromLogo(gymId: string, file: File): Promise<string> {
  const { buffer } = await readValidatedFile(file);
  const dir = path.join(UPLOAD_ROOT, gymId);
  await mkdir(dir, { recursive: true });
  const filename = `favicon-${Date.now()}.png`;
  const favicon = await sharp(buffer)
    .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await writeFile(path.join(dir, filename), favicon);
  return `/uploads/gyms/${gymId}/${filename}`;
}

// Best-effort Aufraeumen alter Dateien beim Ersetzen/Zuruecksetzen - kein
// Fehler, falls die Datei schon weg ist oder ausserhalb des Upload-Bereichs
// liegt (z.B. weil noch nie hochgeladen wurde).
export async function deleteGymUpload(url: string | null | undefined): Promise<void> {
  if (!url || !url.startsWith("/uploads/gyms/")) return;
  const filePath = path.join(process.cwd(), "public", url);
  try {
    await unlink(filePath);
  } catch {
    // Datei existierte nicht (mehr) - ignorieren.
  }
}
