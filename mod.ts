import { getTrayPath, _debug  } from "./utils.ts";
import { readLines, EventEmitter, base64Encode, getSignals } from './deps.ts'

export interface MenuItem {
  title: string
  tooltip: string
  checked?: boolean
  enabled?: boolean
  hidden?: boolean
  items?: MenuItem[]
  icon?: string
  isTemplateIcon?: boolean
}

interface MenuItemEx extends MenuItem {
  __id: number
  items?: MenuItemEx[]
}

export interface Menu {
  icon: string
  title: string
  tooltip: string
  items: MenuItem[]
  isTemplateIcon?: boolean
}

export interface ClickEvent {
  type: 'clicked'
  item: MenuItem
  seq_id: number
  __id: number
}

export interface ReadyEvent {
  type: 'ready'
}

export type Event = ClickEvent | ReadyEvent

export interface UpdateItemAction {
  type: 'update-item'
  item: MenuItem
  seq_id?: number
}

export interface UpdateMenuAction {
  type: 'update-menu'
  menu: Menu
}

export interface UpdateMenuAndItemAction {
  type: 'update-menu-and-item'
  menu: Menu
  item: MenuItem
  seq_id?: number
}

export interface ExitAction {
  type: 'exit'
}

export type Action = UpdateItemAction | UpdateMenuAction | UpdateMenuAndItemAction | ExitAction

export interface Conf {
  menu: Menu
  debug?: boolean
  copyDir?: boolean | string
}

const CHECK_STR = " (√)";
function updateCheckedInLinux(item: MenuItem) {
  if (Deno.build.os !== 'linux') {
    return
  }
  if (item.checked) {
    item.title += CHECK_STR
  } else {
    item.title = (item.title || '').replace(RegExp(CHECK_STR + '$'), '')
  }
  if (item.items != null) {
    item.items.forEach(updateCheckedInLinux)
  }
}

async function loadIcon(fileName: string) {
  const bytes = await Deno.readFile(fileName)
  return base64Encode(bytes)
}

async function resolveIcon(item: MenuItem | Menu) {
  const icon = item.icon
  if (icon) {
    try {
      item.icon = await loadIcon(icon)
    } catch (_e) {
      // Image not found
    }
  }
  if (item.items) {
    await Promise.all(item.items.map(_ => resolveIcon(_)))
  }
  return item
}

function addInternalId(internalIdMap: Map<number, MenuItem>, item: MenuItemEx, counter = {id: 1}) {
  const id = counter.id++
  internalIdMap.set(id, item)
  if (item.items != null) {
    item.items.forEach(_ => addInternalId(internalIdMap, _, counter))
  }
  item.__id = id
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
    __id: (item as MenuItemEx).__id
  }
}

function menuTrimmer(menu: Menu) {
  return {
    icon: menu.icon,
    title: menu.title,
    tooltip: menu.tooltip,
    items: menu.items.map(itemTrimmer),
    isTemplateIcon: menu.isTemplateIcon
  }
}

function actionTrimer(action: Action) {
  if (action.type === 'update-item') {
    return {
      type: action.type,
      item: itemTrimmer(action.item),
      seq_id: action.seq_id
    }
  } else if (action.type === 'update-menu') {
    return {
      type: action.type,
      menu: menuTrimmer(action.menu)
    }
  } else if (action.type === 'update-menu-and-item') {
    return {
      type: action.type,
      item: itemTrimmer(action.item),
      menu: menuTrimmer(action.menu),
      seq_id: action.seq_id
    }
  } else {
    return {
      type: action.type
    }
  }
}

export default class SysTray extends EventEmitter<Record<never, never>> {
  static separator: MenuItem = {
    title: '<SEPARATOR>',
    tooltip: '',
    enabled: true
  }
  protected _conf: Conf;
  protected _process: Deno.Process;
  public get process(): Deno.Process {
    return this._process
  }
  protected _binPath: string
  private _ready: Promise<void>
  private internalIdMap = new Map<number, MenuItem>()

  constructor(conf: Conf) {
    super();
    this._conf = conf;
    this._process = null!
    this._binPath = null!
    this._ready = this.init()
  }

  private async init() {
    const conf = this._conf
    try {
      this._binPath = await getTrayPath()
      await Deno.chmod(this._binPath, 755)
    } catch (_e) {
      // This API currently throws on Windows
    }

    try {
      this._process = Deno.run({
        cmd: [this._binPath],
        stdin: "piped",
        stdout: "piped",
        stderr: "piped",
      });

      conf.menu.items.forEach(updateCheckedInLinux)
      const counter = {id: 1}
      conf.menu.items.forEach(_ => addInternalId(this.internalIdMap, _ as MenuItemEx, counter))
      await resolveIcon(conf.menu)
      this.onReady(() => {
        this.writeLine(JSON.stringify(menuTrimmer(conf.menu)))
        Promise.resolve()
      })
    } catch (error) {
      Promise.reject(error)
    }
  }

  ready() {
    return this._ready
  }

  async onReady(listener: () => void) {
    for await (const line of readLines(this._process.stdout as Deno.Reader)) {
      const action: Event = JSON.parse(line);
      if (action.type === "ready") {
        listener();
        if (this._conf.debug) {
          _debug('onReady', action)
        }
      }
    }

    return this;
  }

  async onClick(listener: (action: ClickEvent) => void) {
    await this.ready()
    for await (const line of readLines(this._process.stdout!)) {
      const action: ClickEvent = JSON.parse(line);
      if (action.type === "clicked") {
        const item = this.internalIdMap.get(action.__id)!
        action.item = Object.assign(item, action.item)
        if (this._conf.debug) {
          _debug('onClick', action)
        }
        listener(action);
      }
    }
    return this;
  }

  private writeLine(line: string) {
    if (line) {
      if (this._conf.debug) {
        _debug('writeLine', line + '\n', '=====')
      }
      const encoded = new TextEncoder().encode(`${line.trim()}\n`);
      this._process.stdin?.write(encoded);
    }
    return this;
  }

  async sendAction(action: Action) {
    switch (action.type) {
      case 'update-item':
        updateCheckedInLinux(action.item)
        if (action.seq_id == null) {
          action.seq_id = -1
        }
        break
      case 'update-menu':
        action.menu = await resolveIcon(action.menu) as Menu
        action.menu.items.forEach(updateCheckedInLinux)
        break
      case 'update-menu-and-item':
        action.menu = await resolveIcon(action.menu) as Menu
        action.menu.items.forEach(updateCheckedInLinux)
        updateCheckedInLinux(action.item)
        if (action.seq_id == null) {
          action.seq_id = -1
        }
        break
    }
    if (this._conf.debug) {
      _debug('sendAction', action)
    }
    this.writeLine(JSON.stringify(actionTrimer(action)))
    return this;
  }

  /**
   * Kill the systray process
   * @param exitNode Exit current node process after systray process is killed, default is true
   */
  async kill(exitNode = true) {
    try {
      this.onExit(() => {
        Promise.resolve()
        if (exitNode) {
          Deno.exit()
        }
      })
  
      await this.sendAction({
        type: 'exit'
      })
    } catch (error) {
      Promise.reject(error)
    }
  }

  async onExit(listener: (code: number | null, signal: string | null) => void) {
    for await (const line of readLines(this._process.stdout!)) {
      console.log('exit', line)
      if (line === "exit") {
        const status = await this._process.status()
        const signal = getSignals().find(i => i.number === status.signal)
        listener(status.code, signal!.name);
      }
    }
  }

  async onError(listener: (err: Error) => void) {
    for await (const line of readLines(this._process.stdout!)) {
      if (line === "error") {
        const stderr = await this._process.stderrOutput();
        const decoded = new TextDecoder().decode(stderr);
        if (this._conf.debug) {
          _debug("onError", decoded, "binPath", this.binPath);
        }
        listener(new Error(decoded));
      }
    }
  }

  get binPath() {
    return this._binPath;
  }
}
