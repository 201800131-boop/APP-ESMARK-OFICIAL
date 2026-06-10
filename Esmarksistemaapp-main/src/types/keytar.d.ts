declare module 'keytar' {
  /**
   * Get the stored password for the service and account.
   */
  export function getPassword(service: string, account: string): Promise<string | null>;

  /**
   * Save the password for the service and account to the keychain.
   */
  export function setPassword(service: string, account: string, password: string): Promise<void>;

  /**
   * Delete the stored password for the service and account.
   */
  export function deletePassword(service: string, account: string): Promise<boolean>;

  /**
   * Find all accounts for the service in the keychain.
   */
  export function findCredentials(service: string): Promise<Array<{ account: string; password: string }>>;

  /**
   * Find a password for the service in the keychain.
   */
  export function findPassword(service: string): Promise<string | null>;
}
