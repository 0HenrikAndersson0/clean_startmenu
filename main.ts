import * as mod from "node:child_process";
import { parseArgs } from "jsr:@std/cli/parse-args";

const flags = parseArgs(Deno.args, {
  string: ["path"],
  default: { path: 'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs' }
});

const rootPath = flags.path;

console.log("Reading from:", rootPath)

const r = Deno.readDirSync(rootPath);

const checkFile = (
  path: string,
  folder: string | undefined,
): Promise<boolean> => {
  return new Promise((res, _) => {
    if (folder) {
      path = `${rootPath}\\${folder}\\${path}`;
    }
    if (!path.includes(".lnk") && !path.includes("-url")) {
      try {
        const _data = Deno.readFileSync(path);
        console.log("File exist:", path);
        return res(true);
      } catch (r: any) {
        if (r.name === "NotFound") {
          console.error("The file does not exist: ", path);
          Deno.removeSync(`${rootPath}\\${path}`);
          return res(false);
        }
      }
    } else {
      mod.exec(
        `powershell -Command "(New-Object -ComObject WScript.Shell).CreateShortcut('${`${path}`}').TargetPath"`,
        (err, stdout, stderr) => {
          if (err) {
            console.error("Error:", stderr || err);
          } else {
            const t = stdout.trim();
            try {
              const _data = Deno.readFileSync(t);
              console.log("File exist:", t);
              return res(true);
            // deno-lint-ignore no-explicit-any
            } catch (r: any) {
              if (r.name === "NotFound") {
                console.error("The file does not exist: ", t);
                Deno.removeSync(`${path}`);
                return res(false);
              }
              return res(true);
            }
          }
        },
      );
    }
  });
};

for await (const c of r) {
  if (c.isFile) {
    checkFile(c.name, undefined);
  }
  if (c.isDirectory) {
    let temp = 0;
    let total = 0;
    for await (const f of Deno.readDir(`${rootPath}\\${c.name}`)) {
      if (f.isFile) {
        total++;
        const fileExist = await checkFile(f.name, c.name);
        if (!fileExist) {
          temp++;
        }
      }
    }
    if (temp === total) {
      console.log("All shurtcuts are dead. Removing dir:", c.name);
      Deno.removeSync(`${rootPath}\\${c.name}`, { recursive: true });
    }
  }
}
