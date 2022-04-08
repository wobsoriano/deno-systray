import * as path from 'https://deno.land/std@0.134.0/path/mod.ts';
import SysTray, { MenuItem } from '../mod.ts';
import menu from '../test/menu.ts';

interface MenuItemClickable extends MenuItem {
  click?: () => void;
  items?: MenuItemClickable[];
}

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

const systray = new SysTray({
  menu: {
    ...menu,
    icon: path.join(__dirname, '../icon.png'),
    isTemplateIcon: true,
    title: 'Hello',
    tooltip: 'Tips',
  },
  debug: true,
});

systray.on('click', (action) => {
  console.log('action', action);
  if (action.seq_id === 5) {
    systray.kill();
  }
});

systray.on('exit', (d) => {
  console.log(d)
})

systray.on('error', () => {
  console.log('error')
})
