import { diff as justDiff } from "just-diff";

export function reverse(type: string) {
  if (type === "create") {
    return "remove";
  }
  return "update";
}

export function update(
  type: string,
  current: string[],
  accountId: string,
  operations: Record<string, unknown>
) {
  if (type === "remove") {
    return current.map((c) => (c === accountId ? "" : c));
  }
  if (current.includes(accountId)) {
    return current;
  }
  if (Object.keys(operations).length === 0) {
    const index = current.findIndex((c) => c === "");
    if (index > -1) {
      const clone = [...current];
      clone.splice(index, 1, accountId);
      return clone;
    }
  }
  return [...current, accountId];
}

export function parse(ref: string | undefined, debug = (m: string) => {}) {
  debug(`parse: ${ref}`);
  if (!ref) {
    return undefined;
  }
  const matches = /^.*?canary(\d+)\/([^/]+?)\/(develop|master)$/.exec(ref);
  if (matches !== null) {
    return matches[2];
  }
  return undefined;
}

export function diff(
  typeDetail: string,
  canaries: string[],
  accountId: string,
  operations: Record<string, unknown>
) {
  const type = reverse(typeDetail);
  const target =
    typeDetail === "remove" && !canaries.includes(accountId)
      ? canaries
      : update(type, canaries, accountId, operations);
  return justDiff(canaries, target);
}
