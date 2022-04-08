import * as path from 'https://deno.land/std@0.134.0/path/mod.ts';
import SysTray from '../mod.ts';
import menu from './menu.ts';

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
const icon = Deno.build.os === 'windows' ? path.join(__dirname, './icon.ico') :  path.join(__dirname, './icon.png');

const systray = new SysTray({
  menu: {
    ...menu,
    icon,
    isTemplateIcon: Deno.build.os === 'darwin',
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
  console.log(d);
});

systray.on('error', () => {
  console.log();
});
