import * as queryStringModule from 'query-string';

import type { TNullable } from '../types/nullable';

const queryString = queryStringModule.default || queryStringModule;

export const parseQuery = <
  T extends Record<string, string | number | boolean | TNullable<unknown> | undefined>,
>(
  queryStringParam: string
): T => {
  const parsed = queryString.parse(queryStringParam, { parseNumbers: true, parseBooleans: true });
  return parsed as T;
};

export const stringifyQuery = (
  params: Record<string, string | number | boolean | TNullable<unknown> | undefined>
): string => {
  return queryString.stringify(params, {
    skipNull: true,
    skipEmptyString: true,
  });
};
