export class InvalidStateTransitionError extends Error {
  constructor() {
    super("Transaction state changed during processing");
    this.name = "InvalidStateTransitionError";
  }
}
