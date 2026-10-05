import type { GatewayAdapter } from "@/lib/payments/types";

const adapters = new Map<string, GatewayAdapter>();

export function registerGatewayAdapter(adapter: GatewayAdapter) {
  if (adapters.has(adapter.code)) throw new Error(`Gateway adapter already registered: ${adapter.code}`);
  adapters.set(adapter.code, adapter);
}

export function getGatewayAdapter(code: string) {
  return adapters.get(code);
}

export class InvalidGatewayWebhookError extends Error {
  constructor(message = "Invalid gateway webhook") {
    super(message);
    this.name = "InvalidGatewayWebhookError";
  }
}
