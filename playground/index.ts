import * as path from "https://deno.land/std@0.134.0/path/mod.ts";
import SysTray, { MenuItem } from "../mod.ts";

interface MenuItemClickable extends MenuItem {
	click?: () => void;
	items?: MenuItemClickable[];
}

const itemExit: MenuItemClickable = {
  title: 'Exit',
  tooltip: 'bb',
  checked: false,
  enabled: true,
  click: () => {
    systray.kill(false)
  }
}

const item1 = {
  title: 'aa',
  tooltip: 'bb',
  // checked is implemented by plain text in linux
  checked: false,
  enabled: true,
  // click is not a standard property but a custom value
  click: () => {
    item1.checked = !item1.checked
    systray.sendAction({
      type: 'update-item',
      item: item1,
    })
    // toggle Exit
    itemExit.hidden = !itemExit.hidden
    systray.sendAction({
      type: 'update-item',
      item: itemExit,
    })
  }
}

const item2 = {
  title: 'aa2',
  tooltip: 'bb',
  checked: false,
  enabled: true,
  hidden: false,
  // add a submenu item
  items: [{
    title: 'Submenu',
    tooltip: 'this is a submenu item',
    checked: false,
    enabled: true,
    click: () => {
      // open the url
      console.log('open the url')
    }
  }]
}

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

const systray = new SysTray({
  menu: {
    icon: path.join(__dirname, './icon.png'),
    isTemplateIcon: true,
    title: 'Hello',
    tooltip: 'Tips',
    items: [
      item1,
      SysTray.separator, // SysTray.separator is equivalent to a MenuItem with "title" equals "<SEPARATOR>"
      item2,
      itemExit
    ]
  },
  debug: true
});

systray.onClick(action => {
  if ((action.item as MenuItemClickable).click) {
    const item = action.item as MenuItemClickable;
    item.click?.()
  }
})

try {
  await systray.ready()

  systray.onExit((code, signal) => {
    console.log(code, signal)
  })
console.log('started')
} catch (e) {
  console.log(e)
}
