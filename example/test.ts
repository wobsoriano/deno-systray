import * as path from 'https://deno.land/std@0.134.0/path/mod.ts';
// console.log(Deno.mainModule)
// console.log(import.meta.main)
// console.log(import.meta.url)
const __dirname = path.fromFileUrl(new URL('../example/icon.png', import.meta.url));

console.log(__dirname)

// const filePath = path.fromFileUrl(new URL("icon.png", Deno.cwd()));
// console.log(filePath)

// console.log(Deno.execPath())
