import { readFile } from "fs/promises";
import { whatTheDep } from "../src";

export const buildAndTransform = async (
  entrypoints: string[],
  outdir: string,
  fileName: string
) => {
  try {
    await Bun.build({
      entrypoints: entrypoints,
      outdir: outdir,
      target: "bun",
      plugins: [
        whatTheDep({
          debug: true,
        }),
      ],
    });
    return readFile(`${outdir}/${fileName}`, "utf8");
  } catch (error) {
    console.error(error);
  }
};
