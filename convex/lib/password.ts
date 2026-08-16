import { hash, compare } from 'bcryptjs'
import { ConvexError } from 'convex/values'

/**
 * Minimum password length. Enforced here so every call site that hashes a
 * password inherits the policy; signUp throws a ConvexError whose message
 * survives to the browser.
 */
const MIN_PASSWORD_LENGTH = 8

/**
 * Hash a plaintext password with bcrypt.
 *
 * This must only be called from a Convex **action** (or an action's internal
 * mutation via runMutation): bcryptjs's salt generation reads
 * `crypto.getRandomValues`, which the Convex mutation/query runtime does not
 * expose. If bcryptjs is invoked from a mutation the salt is deterministic and
 * every account with the same password ends up with an identical hash — a
 * catastrophic offline-rotation risk. The signUp/signIn actions in auth.ts
 * therefore call this through ctx.runMutation(internal.auth.insertUser, ...)
 * where `password_hash` is produced by hashing the raw password here, in the
 * action runtime, before the hash ever touches the database.
 */
export async function hashPassword(password: string): Promise<string> {
  if (
    !password ||
    typeof password !== 'string' ||
    password.length < MIN_PASSWORD_LENGTH
  ) {
    throw new ConvexError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    )
  }
  return hash(password, 10)
}

/**
 * Compare a plaintext password against a stored bcrypt hash.
 *
 * Uses bcryptjs's constant-time `compare` so the timing of the response does
 * not leak whether the underlying salt/hash matched. sign-in returns a single
 * "Invalid email or password." failure for both "no such user" and "wrong
 * password" so the endpoint cannot be used to enumerate registered emails.
 */
export async function verifyPassword(
  password: string,
  password_hash: string,
): Promise<boolean> {
  if (!password || !password_hash) return false
  return compare(password, password_hash)
}

export const PASSWORD_REGEX = {
  min: MIN_PASSWORD_LENGTH,
}
