import { assetStatusEnum, assetTypeEnum } from "@/lib/db/schema";
import type { SearchAssetsParams } from "@/lib/db/search";

function values(params: URLSearchParams, key: string): string[] | undefined {
  const result = params
    .getAll(key)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  return result.length > 0 ? result : undefined;
}

function integer(params: URLSearchParams, key: string): number | undefined {
  const value = params.get(key);
  if (value === null || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

export function parseSearchParams(params: URLSearchParams): SearchAssetsParams {
  const assetTypes = values(params, "type");
  const statuses = values(params, "status");
  const validTypes = assetTypes?.filter((value) =>
    assetTypeEnum.enumValues.includes(
      value as (typeof assetTypeEnum.enumValues)[number],
    ),
  ) as SearchAssetsParams["assetTypes"];
  const validStatuses = statuses?.filter((value) =>
    assetStatusEnum.enumValues.includes(
      value as (typeof assetStatusEnum.enumValues)[number],
    ),
  ) as SearchAssetsParams["statuses"];

  return {
    text: params.get("q") || undefined,
    tags: values(params, "tag"),
    assetTypes: validTypes?.length ? validTypes : undefined,
    statuses: validStatuses?.length ? validStatuses : undefined,
    limit: integer(params, "limit"),
    offset: integer(params, "offset"),
  };
}
