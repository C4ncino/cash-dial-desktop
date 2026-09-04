export const isTransferIcon = (icon?: string) =>
  icon?.replace(/^iconoir:/, "") === "data-transfer-up";
