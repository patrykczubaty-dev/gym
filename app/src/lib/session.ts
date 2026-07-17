import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey = process.env.SESSION_SECRET;
if (!secretKey) {
  throw new Error("SESSION_SECRET ist nicht gesetzt (siehe .env.example)");
}
const encodedKey = new TextEncoder().encode(secretKey);

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// Zwei getrennte Cookies/Session-Typen mit Absicht: ein Gym-Mitarbeiter und
// ein Plattform-Admin sind grundverschiedene Akteure (siehe PlatformAdmin in
// schema.prisma) - ein gemeinsames Cookie/Payload-Format waere ein
// Sicherheitsrisiko (Verwechslungsgefahr zwischen den beiden Session-Arten).

const EMPLOYEE_COOKIE = "session";
const PLATFORM_COOKIE = "platform_session";

export interface EmployeeSessionPayload {
  employeeId: string;
  gymId: string;
  [key: string]: unknown;
}

export interface PlatformSessionPayload {
  platformAdminId: string;
  [key: string]: unknown;
}

async function encrypt(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

async function decrypt<T>(session: string | undefined): Promise<T | null> {
  if (!session) return null;
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as T;
  } catch {
    return null;
  }
}

// --- Gym-Mitarbeiter-Session ---------------------------------------------

export async function createSession(employeeId: string, gymId: string) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const session = await encrypt({ employeeId, gymId });
  const cookieStore = await cookies();

  cookieStore.set(EMPLOYEE_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function getSessionPayload(): Promise<EmployeeSessionPayload | null> {
  const cookieStore = await cookies();
  return decrypt<EmployeeSessionPayload>(cookieStore.get(EMPLOYEE_COOKIE)?.value);
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(EMPLOYEE_COOKIE);
}

// --- Plattform-Admin-Session ----------------------------------------------

export async function createPlatformSession(platformAdminId: string) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const session = await encrypt({ platformAdminId });
  const cookieStore = await cookies();

  cookieStore.set(PLATFORM_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function getPlatformSessionPayload(): Promise<PlatformSessionPayload | null> {
  const cookieStore = await cookies();
  return decrypt<PlatformSessionPayload>(cookieStore.get(PLATFORM_COOKIE)?.value);
}

export async function deletePlatformSession() {
  const cookieStore = await cookies();
  cookieStore.delete(PLATFORM_COOKIE);
}

// --- Mobile-App-Kunden-Session ---------------------------------------------
//
// Dritter, wieder bewusst getrennter Akteurstyp (siehe Kommentar oben) -
// zusaetzlich anders als Employee/PlatformAdmin: kein Cookie, sondern ein
// Bearer-Token im Authorization-Header, da eine native App keinen Cookie-Jar
// hat. `type`-Feld im Payload verhindert, dass ein Employee-/Platform-Token
// versehentlich als Kunden-Token akzeptiert wird (beide durchlaufen dieselbe
// generische decrypt()-Funktion, die die Payload-Form nicht selbst prueft).

const CUSTOMER_TOKEN_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export interface CustomerTokenPayload {
  type: "mobile-customer";
  customerId: string;
  gymId: string;
  [key: string]: unknown;
}

export async function createCustomerToken(
  customerId: string,
  gymId: string,
): Promise<string> {
  return new SignJWT({ type: "mobile-customer", customerId, gymId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + CUSTOMER_TOKEN_DURATION_MS) / 1000))
    .sign(encodedKey);
}

export async function verifyCustomerToken(
  token: string | undefined,
): Promise<CustomerTokenPayload | null> {
  const payload = await decrypt<CustomerTokenPayload>(token);
  if (!payload || payload.type !== "mobile-customer") return null;
  return payload;
}
