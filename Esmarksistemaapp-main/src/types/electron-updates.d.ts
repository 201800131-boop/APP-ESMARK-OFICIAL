declare global {
  interface Window {
    esmarkUpdates?: {
      onStatus: (cb: (payload: any) => void) => () => void;
      check: () => Promise<any>;
      install: () => Promise<any>;
    };
  }
}
export {};
