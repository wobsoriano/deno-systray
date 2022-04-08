import { downloadAndCache } from "./deps.ts";

const version = 'v0.1.1'
const url = Deno.env.get("TRAY_URL") ??
`https://github.com/wobsoriano/systray-portable/releases/download/${version}`;

export const getTrayPath = async () => {
  const binName = ({
    windows: `${url}/tray_windows.exe`,
    darwin: `${url}/tray_darwin`,
    linux: `${url}/tray_linux`,
  })[Deno.build.os]

  const file = await downloadAndCache(binName)

  return file.path
}

export function _debug(msgType: string, ...msg: any[]) {
  console.log(msgType + ':' + msg.map(m => {
    let t = typeof (m) === 'string' ? m : JSON.stringify(m)
    const p = t.indexOf('"icon":')
    if (p >= 0) {
      const e = t.indexOf('"', p + 8)
      t = t.substring(0, p + 8) + '<ICON>' + t.substring(e)
    }
    const limit = 500
    if (t.length > limit) {
      t = t.substring(0, limit / 2) + '...' + t.substring(t.length - limit / 2)
    }
    return t
  }).join(' '))
  return
}
