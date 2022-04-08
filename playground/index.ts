import * as path from 'https://deno.land/std@0.134.0/path/mod.ts';
import { open } from 'https://deno.land/x/open@v0.0.5/index.ts';
import SysTray, { Menu, MenuItem } from '../mod.ts';

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
const icon = Deno.build.os === 'windows' ? path.join(__dirname, './icon.ico') :  path.join(__dirname, './icon.png');

interface MenuItemClickable extends MenuItem {
	click?: () => void;
	items?: MenuItemClickable[];
}

interface CustomMenu extends Menu {
  items: MenuItemClickable[];
}

const menu: CustomMenu = {
  icon,
  isTemplateIcon: Deno.build.os === 'darwin',
  title: 'Title',
  tooltip: 'Tooltip',
  items: [{
    title: 'Item 1',
    tooltip: 'the first item',
    checked: true,
    enabled: true,
    click() {
      menu.items[0].checked = !menu.items[0].checked
      menu.items[1].checked = !menu.items[0].checked
      systray.sendAction({
        type: 'update-item',
        item: menu.items[0],
        seq_id: 0
      })
      systray.sendAction({
        type: 'update-item',
        item: menu.items[1],
        seq_id: 1
      })
    }
  }, {
    'title': 'Item 2',
    'tooltip': 'the second item',
    'checked': false,
    'enabled': true,
    click() {
      menu.items[1].checked = !menu.items[1].checked
      menu.items[0].checked = !menu.items[1].checked
      systray.sendAction({
        type: 'update-item',
        item: menu.items[0],
        seq_id: 0
      })
      systray.sendAction({
        type: 'update-item',
        item: menu.items[1],
        seq_id: 1
      })
    }
  }, {
    'title': '<SEPARATOR>',
    'tooltip': '',
    'enabled': true,
  }, {
    title: 'GitHub',
    tooltip: 'Go to repository',
    checked: false,
    click() {
      open('https://github.com/wobsoriano/deno-systray')
    }
  }, {
    'title': 'Item with submenu',
    'tooltip': 'submenu',
    'checked': false,
    'enabled': true,
    'items': [{
      'title': 'submenu 1',
      'tooltip': 'this is submenu 1',
      'checked': true,
      'enabled': true,
    }, {
      'title': 'submenu 2',
      'tooltip': 'this is submenu 2',
      'checked': true,
      'enabled': true,
    }],
  }, {
    title: 'Exit',
    tooltip: 'Exit the tray menu',
    checked: false,
    enabled: true,
    click() {
      systray.kill()
    }
  }],
};

const systray = new SysTray({
  menu,
  debug: true,
});

systray.on('click', (action) => {
  if ((action.item as MenuItemClickable).click) {
    (action.item as MenuItemClickable).click!()
  }
});

systray.on('exit', (d) => {
  console.log(d);
});

systray.on('error', () => {
  console.log();
});
