import {
  base64Encode,
  configureCache,
  debug,
  downloadAndCache,
  EventEmitter,
  readLines,
  TextLineStream,
  withoutEnv,
} from './deps.ts';

const version = Deno.env.get('TRAY_VERSION') ?? 'v0.2.0';
const url = Deno.env.get('TRAY_URL') ??
  `https://github.com/wobsoriano/systray-portable/releases/download/${version}`;

const debugName = 'systray';
const log = debug(debugName);

export interface MenuItem {
  title: string;
  tooltip: string;
  checked?: boolean;
  enabled?: boolean;
  hidden?: boolean;
  items?: MenuItem[];
  icon?: string;
  isTemplateIcon?: boolean;
}

interface MenuItemEx extends MenuItem {
  __id: number;
  items?: MenuItemEx[];
}

export interface Menu {
  icon: string;
  title: string;
  tooltip: string;
  items: MenuItem[];
  isTemplateIcon?: boolean;
}

export interface ClickEvent {
  type: 'clicked';
  item: MenuItem;
  seq_id: number;
  __id: number;
}

export interface ReadyEvent {
  type: 'ready';
}

export type Event = ClickEvent | ReadyEvent;

export interface UpdateItemAction {
  type: 'update-item';
  item: MenuItem;
  seq_id?: number;
}

export interface UpdateMenuAction {
  type: 'update-menu';
  menu: Menu;
}

export interface UpdateMenuAndItemAction {
  type: 'update-menu-and-item';
  menu: Menu;
  item: MenuItem;
  seq_id?: number;
}

export interface ExitAction {
  type: 'exit';
}

export type Action =
  | UpdateItemAction
  | UpdateMenuAction
  | UpdateMenuAndItemAction
  | ExitAction;

export interface Conf {
  menu: Menu;
  debug?: boolean;
  directory?: string | undefined;
}

const CHECK_STR = ' (√)';
function updateCheckedInLinux(item: MenuItem) {
  if (Deno.build.os !== 'linux') {
    return;
  }
  if (item.checked) {
    item.title += CHECK_STR;
  } else {
    item.title = (item.title || '').replace(RegExp(CHECK_STR + '$'), '');
  }
  if (item.items != null) {
    item.items.forEach(updateCheckedInLinux);
  }
}

async function loadIcon(fileName: string) {
  const bytes = await Deno.readFile(fileName);
  return base64Encode(bytes);
}

async function resolveIcon(item: MenuItem | Menu) {
  const icon = item.icon;
  if (icon) {
    try {
      item.icon = await loadIcon(icon);
    } catch (_e) {
      // Image not found
    }
  }
  if (item.items) {
    await Promise.all(item.items.map((_) => resolveIcon(_)));
  }
  return item;
}

function addInternalId(
  internalIdMap: Map<number, MenuItem>,
  item: MenuItemEx,
  counter = { id: 1 },
) {
  const id = counter.id++;
  internalIdMap.set(id, item);
  if (item.items != null) {
    item.items.forEach((_) => addInternalId(internalIdMap, _, counter));
  }
  item.__id = id;
}

function itemTrimmer(item: MenuItem) {
  return {
    title: item.title,
    tooltip: item.tooltip,
    checked: item.checked,
    enabled: item.enabled === undefined ? true : item.enabled,
    hidden: item.hidden,
    items: item.items,
    icon: item.icon,
    isTemplateIcon: item.isTemplateIcon,
    __id: (item as MenuItemEx).__id,
  };
}

function menuTrimmer(menu: Menu) {
  return {
    icon: menu.icon,
    title: menu.title,
    tooltip: menu.tooltip,
    items: menu.items.map(itemTrimmer),
    isTemplateIcon: menu.isTemplateIcon,
  };
}

function actionTrimer(action: Action) {
  if (action.type === 'update-item') {
    return {
      type: action.type,
      item: itemTrimmer(action.item),
      seq_id: action.seq_id,
    };
  } else if (action.type === 'update-menu') {
    return {
      type: action.type,
      menu: menuTrimmer(action.menu),
    };
  } else if (action.type === 'update-menu-and-item') {
    return {
      type: action.type,
      item: itemTrimmer(action.item),
      menu: menuTrimmer(action.menu),
      seq_id: action.seq_id,
    };
  } else {
    return {
      type: action.type,
    };
  }
}

const getTrayPath = async () => {
  let binName: string;
  const { arch, os } = Deno.build;

  switch (os) {
    case 'windows':
      binName = arch === 'x86_64'
        ? `${url}/tray_windows_amd64.exe`
        : `${url}/tray_windows_386.exe`;
      break;
    case 'darwin':
      binName = arch === 'x86_64'
        ? `${url}/tray_darwin_amd64`
        : `${url}/tray_darwin_arm64`;
      break;
    case 'linux':
      binName = arch === 'x86_64'
        ? `${url}/tray_linux_arm64`
        : `${url}/tray_linux_amd64`;
      break;
    default:
      throw new Error('Unsupported OS for tray application');
  }

  const file = await downloadAndCache(binName);
  return file.path;
};

type Events = {
  data: [string];
  error: [string];
  exit: [Deno.CommandStatus];
  click: [ClickEvent];
  ready: [];
};

export default class SysTray extends EventEmitter<Events> {
  static separator: MenuItem = {
    title: '<SEPARATOR>',
    tooltip: '',
    enabled: true,
  };
  protected _conf: Conf;
  private _command: Deno.Command;
  public get process(): Deno.Command {
    return this._command;
  }
  protected _binPath: string;
  private _ready: Promise<void>;
  private internalIdMap = new Map<number, MenuItem>();

  constructor(conf: Conf) {
    super();
    this._conf = conf;
    this._command = null!;
    this._binPath = null!;

    if (this._conf.debug) {
      withoutEnv(debugName);
    }

    if (this._conf.directory) {
      configureCache({
        directory: this._conf.directory,
      });
    }

    this._ready = this.init();
  }

  private async run(...cmd: string[]) {
    const [mainCmd, ...args] = cmd;
    this._command = new Deno.Command(mainCmd, {
      args,
      stdin: 'piped',
      stderr: 'piped',
      stdout: 'piped',
    });

    const child_command = this._command.spawn();

    const stdout = child_command.stdout.pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream());
    const stderr = child_command.stderr.pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream());

    for await (const line of stdout) {
      if (line.trim()) {
        this.emit('data', line);
      }
    }

    for await (const line of stderr) {
      if (line.trim()) {
        if (this._conf.debug) {
          log('onError', line, 'binPath', this.binPath);
        }
        this.emit('error', line);
      }
    }

    const status = await child_command.status;
    this.emit('exit', status);
    await child_command.stdin.close();
  }

  private async init() {
    const conf = this._conf;
    try {
      this._binPath = await getTrayPath();
      await Deno.chmod(this._binPath, 0o755);
    } catch (_error) {
      // This API currently throws on Windows
    }

    try {
      this.run(this._binPath);

      conf.menu.items.forEach(updateCheckedInLinux);
      const counter = { id: 1 };
      conf.menu.items.forEach((_) => {
        addInternalId(this.internalIdMap, _ as MenuItemEx, counter);
      });
      await resolveIcon(conf.menu);

      this.once('ready', () => {
        this.writeLine(JSON.stringify(menuTrimmer(conf.menu)));
      });

      this.on('data', (line: string) => {
        console.log(line);
        const action: Event = JSON.parse(line);
        if (action.type === 'clicked') {
          const item = this.internalIdMap.get(action.__id)!;
          action.item = Object.assign(item, action.item);
          if (this._conf.debug) {
            log('%s, %o', 'onClick', action);
          }
          this.emit('click', action);
        } else if (action.type === 'ready') {
          if (this._conf.debug) {
            log('%s %o', 'onReady', action);
          }
          this.emit('ready');
        }
      });
    } catch (error) {
      throw error;
    }
  }

  ready() {
    return this._ready;
  }

  private async writeLine(line: string) {
    if (line) {
      if (this._conf.debug) {
        log('%s %o', 'writeLine', line + '\n', '=====');
      }
      const process = this._command.spawn();
      const encoded = new TextEncoder().encode(`${line.trim()}\n`);
      const writer = await process.stdin.getWriter();
      await writer.write(encoded);
      writer.releaseLock();
    }
  }

  async sendAction(action: Action) {
    console.log('SENDING ACTION', action);
    switch (action.type) {
      case 'update-item':
        updateCheckedInLinux(action.item);
        if (action.seq_id == null) {
          action.seq_id = -1;
        }
        break;
      case 'update-menu':
        action.menu = await resolveIcon(action.menu) as Menu;
        action.menu.items.forEach(updateCheckedInLinux);
        break;
      case 'update-menu-and-item':
        action.menu = await resolveIcon(action.menu) as Menu;
        action.menu.items.forEach(updateCheckedInLinux);
        updateCheckedInLinux(action.item);
        if (action.seq_id == null) {
          action.seq_id = -1;
        }
        break;
    }
    if (this._conf.debug) {
      log('%s %o', 'sendAction', action);
    }
    this.writeLine(JSON.stringify(actionTrimer(action)));
    return this;
  }

  /**
   * Kill the systray process
   * @param exitNode Exit current node process after systray process is killed, default is true
   */
  kill(exitNode = true) {
    this.once('exit', () => {
      if (exitNode) {
        Deno.exit();
      }
    });

    this.sendAction({
      type: 'exit',
    });
  }

  get binPath() {
    return this._binPath;
  }
}
