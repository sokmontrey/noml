export { NomlDatabase, openDatabase } from "./db/database";
export { NOTE_STORES, type NoteRow } from "./db/schema";
export { makeNoteRepository } from "./db/note.repository";
export { makeFractionalIndexAdapter } from "./fractional-index/fractional-index.adapter";
export {
    makeSystemClock,
    makeUuidIds,
    makeConsoleLogger,
    type ConsoleLoggerOptions,
} from "./platform/platform";
export {
    makeLocalSettingsPersistence,
    makeMemorySettingsPersistence,
} from "./settings/settings.persistence";
