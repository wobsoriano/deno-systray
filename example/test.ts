import * as path from 'https://deno.land/std@0.134.0/path/mod.ts';
// import makeloc from 'https://x.nest.land/dirname@1.1.2/mod.ts'
// console.log(Deno.mainModule)
// console.log(import.meta.main)
// console.log(import.meta.url)

// const x = 'https://raw.githubusercontent.com/wobsoriano/deno-systray/99f3e75e0da420b3dd0f53e250a206820e30f30f/example/test.ts'
// const filePath = path.join(path.dirname(x), './icon.png');
// console.log(filePath)

// console.log(Deno.execPath())

function makeloc(meta: any) {
  const 
    iURL = typeof meta === 'string' ? meta : meta.url,
    fileStartRegex = /(^(file:)((\/\/)?))/,
    __dirname = path.join(iURL, '../')
                  .replace(fileStartRegex, '')
                  .replace(/(\/$)/, ''),
    __filename = iURL.replace(fileStartRegex, '')

  return { __dirname, __filename }
}

const x = 'https://raw.githubusercontent.com/wobsoriano/deno-systray/26a9e7f8e43928c3104066243007507a423af5e4/example/index.ts'
const { __dirname,  __filename } = makeloc(x)
// const __filename = path.fromFileUrl('');

console.log(__dirname)
