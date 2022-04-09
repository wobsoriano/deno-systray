import * as path from 'https://deno.land/std@0.134.0/path/mod.ts';
// console.log(Deno.mainModule)
// console.log(import.meta.main)
// console.log(import.meta.url)

const x = 'https://raw.githubusercontent.com/wobsoriano/deno-systray/99f3e75e0da420b3dd0f53e250a206820e30f30f/example/test.ts'
const filePath = path.join(path.dirname(x), './icon.png');
console.log(filePath)

// console.log(Deno.execPath())
