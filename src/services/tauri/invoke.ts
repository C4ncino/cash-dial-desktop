import { invoke } from "@tauri-apps/api/core";

export type CommandArguments = Record<string, unknown>;

export function invokeCommand<Result>(command: string, args?: object): Promise<Result> {
  return args === undefined
    ? invoke<Result>(command)
    : invoke<Result>(command, args as CommandArguments);
}

export { invoke as rawInvoke };
