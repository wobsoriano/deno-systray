import { assertEquals } from 'https://deno.land/std@0.134.0/testing/asserts.ts';
import * as path from 'https://deno.land/std@0.134.0/path/mod.ts';
import SysTray from '../mod.ts';
import menu from './menu.ts';

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
menu.icon = path.join(__dirname, '../icon.png');

Deno.test('systray release is ok', async () => {
    const systray = new SysTray({ menu, debug: false })
    systray.onClick(async action => {
      if (action.seq_id === 0) {
        await systray.sendAction({
          type: 'update-item',
          item: {
            ...(action.item),
            checked: !action.item.checked
          }
        })
      } else if (action.seq_id === 2) {
        await systray.kill()
      }
      console.log('action', action)
    })
    await systray.ready()
    console.log('here')
    // systray.process.stderr?.on('data', (chunk) => {
    //   console.log(chunk.toString())
    // })
    console.log('Exit the tray in 1000ms...')
    const exitInfo = new Promise<{ code: number | null; signal: string | null }>(resolve => systray.onExit((code, signal) => resolve({ code, signal })))
    await new Promise<void>((resolve) => {
      setTimeout(async () => {
        await systray.kill(false)
        resolve()
      }, 1000)
    })
    const { code, signal } = await exitInfo
    console.log('code', code, 'signal', signal)
    assertEquals(code, 0)
    assertEquals(signal, null)
})
