import ts from "typescript";
import crypto from "crypto";

import { WTD_METHOD } from "./constants";

export const hashSymbol = (symbol: ts.Symbol) => {
  const symbolName =
    symbol
      .getDeclarations()
      ?.map((d) => d.getText())
      .join("") ?? symbol.getName();
  const hash = crypto
    .createHash("md5")
    .update(symbolName)
    .digest("hex")
    .substring(0, 8);
  return hash;
};

export const isWhatTheDepMethod = (node: ts.Node) => {
  return WTD_METHOD.includes(node.getText());
};
