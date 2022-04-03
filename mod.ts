import * as path from "https://deno.land/std@0.133.0/path/mod.ts";
import { readLines } from "https://deno.land/std@0.133.0/io/mod.ts";
import { EventEmitter } from "https://deno.land/x/event@2.0.0/mod.ts";
import Debug from "https://deno.land/x/debuglog@v1.0.0/debug.ts";

const debug = Debug("deno-systray");

export type MenuItem = {
  title: string;
  tooltip: string;
  checked: boolean;
  enabled: boolean;
};

export type Menu = {
  icon: string;
  title: string;
  tooltip: string;
  items: MenuItem[];
};

export type ClickEvent = {
  type: "clicked";
  item: MenuItem;
  seq_id: number;
};

export type ReadyEvent = {
  type: "ready";
};

export type Event = ClickEvent | ReadyEvent;

export type UpdateItemAction = {
  type: "update-item";
  item: MenuItem;
  seq_id: number;
};

export type UpdateMenuAction = {
  type: "update-menu";
  menu: Menu;
  seq_id: number;
};

export type UpdateMenuAndItemAction = {
  type: "update-menu-and-item";
  menu: Menu;
  item: MenuItem;
  seq_id: number;
};

export type Action =
  | UpdateItemAction
  | UpdateMenuAction
  | UpdateMenuAndItemAction;

export type Conf = {
  menu: Menu;
  copyDir?: boolean | string;
};

const OS = Deno.build.os;

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
console.log(__dirname);
const getTrayBinPath = () => {
  const binName = {
    windows: "tray_windows.exe",
    darwin: "tray_darwin",
    linux: "tray_linux",
  }[OS];
  const binPath = path.join(__dirname, `./traybin/${binName}`);
  return binPath;
};

const CHECK_STR = " (√)";
function updateCheckedInLinux(item: MenuItem) {
  if (OS !== "linux") {
    return item;
  }
  if (item.checked) {
    item.title += CHECK_STR;
  } else {
    item.title = (item.title || "").replace(RegExp(CHECK_STR + "$"), "");
  }
  return item;
}

export default class SysTray extends EventEmitter<Record<never, never>> {
  protected _conf: Conf;
  protected _process: Deno.Process;
  protected _binPath: string;

  constructor(conf: Conf) {
    super();
    this._conf = conf;
    this._binPath = getTrayBinPath();
    this._process = Deno.run({
      cmd: [this._binPath],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });
    conf.menu.items = conf.menu.items.map(updateCheckedInLinux);

    this.onReady(() => {
      this.writeLine(JSON.stringify(conf.menu));
    });
  }

  onReady(listener: () => void) {
    const { stdout } = this._process;
    (async function () {
      for await (const line of readLines(stdout as Deno.Reader)) {
        const action: Event = JSON.parse(line);
        if (action.type === "ready") {
          listener();
          debug("onReady", action);
        }
      }
    })();

    return this;
  }

  onClick(listener: (action: ClickEvent) => void) {
    const { stdout } = this._process;
    (async function () {
      for await (const line of readLines(stdout as Deno.Reader)) {
        const action: ClickEvent = JSON.parse(line);
        if (action.type === "clicked") {
          listener(action);
        }
      }
    })();
    return this;
  }

  writeLine(line: string) {
    if (line) {
      debug("writeLine", line + "\n", "=====");
      const encoded = new TextEncoder().encode(`${line.trim()}\n`);
      this._process.stdin?.write(encoded);
    }

    return this;
  }

  sendAction(action: Action) {
    switch (action.type) {
      case "update-item":
        action.item = updateCheckedInLinux(action.item);
        break;
      case "update-menu":
        action.menu.items = action.menu.items.map(updateCheckedInLinux);
        break;
      case "update-menu-and-item":
        action.menu.items = action.menu.items.map(updateCheckedInLinux);
        action.item = updateCheckedInLinux(action.item);
        break;
    }
    debug("sendAction", action);
    this.writeLine(JSON.stringify(action));
    return this;
  }

  /**
   * Kill the systray process
   * @param exitNode Exit current node process after systray process is killed, default is true
   */
  kill(exitNode = true) {
    if (exitNode) {
      this.onExit(() => Deno.exit());
    }

    this._process.close();
    this._process.kill("SIGTERM");
  }

  onExit(listener: (code: number | null, signal: string | null) => void) {
    const { stdout, pid } = this._process;
    (async function () {
      for await (const line of readLines(stdout as Deno.Reader)) {
        if (line === "exit") {
          listener(pid, "SIGTERM");
        }
      }
    })();
  }

  onError(listener: (err: Error) => void) {
    const _process = this._process;
    const binPath = this.binPath;
    (async function () {
      for await (const line of readLines(_process.stdout as Deno.Reader)) {
        if (line === "error") {
          const stderr = await _process.stderrOutput();
          const decoded = new TextDecoder().decode(stderr);
          debug("onError", decoded, "binPath", binPath);
          listener(new Error(decoded));
        }
      }
    })();
  }

  get binPath() {
    return this._binPath;
  }
}
