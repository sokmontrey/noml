import { Data } from "effect";
import type { PluginId } from "./manifest";

export class PluginError extends Data.TaggedError("PluginError")<{
    pluginId: PluginId;
    message: string;
    cause?: unknown;
}> {}

export class PluginValidationError extends Data.TaggedError(
    "PluginValidationError",
)<{
    pluginId: PluginId;
    message: string;
}> {}

export class CapabilityError extends Data.TaggedError("CapabilityError")<{
    pluginId: PluginId;
    capability: string;
}> {}

export class CommandError extends Data.TaggedError("CommandError")<{
    commandId: string;
    message: string;
}> {}

export class NoteNotFoundError extends Data.TaggedError("NoteNotFoundError")<{
    id: string;
}> {}
