import type {Carrier} from "./domain.ts";
import type {KaijuApplication} from "./main.ts";
declare global {
  interface FlagConfig {
    JournalEntry: {"kaiju-vinculo": {carrier: Carrier}};
  }
  interface ModuleConfig {
    "kaiju-vinculo": {api: {open:()=>KaijuApplication;version:string}};
    "holosuite-core": {api: unknown};
  }
}
