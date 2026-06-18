import {
  GraphQLError,
  DocumentNode,
  OperationDefinitionNode,
  FieldNode,
  SelectionSetNode,
  FragmentDefinitionNode,
  ValidationContext as GQLValidationContext,
} from 'graphql';
import { getOperationAST } from 'graphql';

const LIST_ROOT_FIELDS = new Set([
  'listUsers',
  'listPosts',
  'listComments',
  'listProfiles',
  'listSavedQueries',
  'listRequestLogs',
]);

const PAGINATION_ARGS = new Set(['pageSize', 'first', 'last', 'limit']);

const DEFAULT_PAGE_SIZE = 10;

type VCtx = GQLValidationContext;

function buildFragmentMap(
  doc: DocumentNode
): Map<string, FragmentDefinitionNode> {
  const map = new Map<string, FragmentDefinitionNode>();
  for (const d of doc.definitions) {
    if (d.kind === 'FragmentDefinition') map.set(d.name.value, d);
  }
  return map;
}

function expandFragments(
  selections: readonly any[],
  fragmentMap: Map<string, FragmentDefinitionNode>,
  visited: Set<string> = new Set()
): any[] {
  const out: any[] = [];
  for (const sel of selections) {
    if (sel.kind === 'FragmentSpread') {
      if (visited.has(sel.name.value)) continue;
      const frag = fragmentMap.get(sel.name.value);
      if (!frag) continue;
      visited.add(sel.name.value);
      out.push(
        ...expandFragments(
          frag.selectionSet.selections,
          fragmentMap,
          visited
        )
      );
    } else if (sel.kind === 'InlineFragment' && sel.selectionSet) {
      out.push(
        ...expandFragments(
          sel.selectionSet.selections,
          fragmentMap,
          visited
        )
      );
    } else {
      out.push(sel);
    }
  }
  return out;
}

function getPageSize(
  field: FieldNode,
  variables?: Record<string, any>
): number | null {
  if (!field.arguments) return null;
  for (const arg of field.arguments) {
    if (PAGINATION_ARGS.has(arg.name.value)) {
      const v = resolveArgValue(arg.value, variables);
      if (typeof v === 'number' && v > 0) return v;
    }
  }
  return null;
}

function resolveArgValue(val: any, variables?: Record<string, any>): any {
  if (val.kind === 'Variable') return variables?.[val.name.value];
  if (val.kind === 'IntValue') return parseInt(val.value, 10);
  if (val.kind === 'StringValue') return val.value;
  if (val.kind === 'BooleanValue') return val.value;
  return null;
}

function calcComplexity(
  selectionSet: SelectionSetNode | undefined,
  fragmentMap: Map<string, FragmentDefinitionNode>,
  variables: Record<string, any> | undefined
): number {
  if (!selectionSet) return 0;

  let total = 0;
  const expanded = expandFragments(selectionSet.selections, fragmentMap);

  for (const sel of expanded) {
    if (sel.kind !== 'Field') continue;

    const isListRoot = LIST_ROOT_FIELDS.has(sel.name.value);
    const rawPageSize = getPageSize(sel, variables);
    const pageSize = rawPageSize ?? (isListRoot ? DEFAULT_PAGE_SIZE : 0);

    if (isListRoot && pageSize > 0) {
      const childCost = calcComplexity(
        sel.selectionSet,
        fragmentMap,
        variables
      );
      total += 1 + pageSize * childCost;
    } else {
      total += 1;
      if (sel.selectionSet) {
        total += calcComplexity(
          sel.selectionSet,
          fragmentMap,
          variables
        );
      }
    }
  }

  return total;
}

function calcDepth(
  selectionSet: SelectionSetNode | undefined,
  fragmentMap: Map<string, FragmentDefinitionNode>,
  current: number
): number {
  if (!selectionSet) return current;
  let max = current;
  const expanded = expandFragments(selectionSet.selections, fragmentMap);
  for (const sel of expanded) {
    if (sel.kind === 'Field' && sel.selectionSet) {
      max = Math.max(
        max,
        calcDepth(sel.selectionSet, fragmentMap, current + 1)
      );
    }
  }
  return max;
}

export const createQueryDepthLimitRule = (maxDepth: number) => {
  return (context: VCtx) => ({
    OperationDefinition(node: OperationDefinitionNode) {
      const fragmentMap = buildFragmentMap(context.getDocument());
      const depth = calcDepth(node.selectionSet, fragmentMap, 0);
      if (depth > maxDepth) {
        context.reportError(
          new GraphQLError(
            `Query depth ${depth} exceeds maximum ${maxDepth}. ` +
              `Reduce nesting or use smaller fragments.`
          )
        );
      }
    },
  });
};

export const calculateQueryComplexity = (
  document: DocumentNode,
  variables?: Record<string, any>
): number => {
  const operation = getOperationAST(document);
  if (!operation) return 0;
  const fragmentMap = buildFragmentMap(document);
  return calcComplexity(operation.selectionSet, fragmentMap, variables);
};

export const assertQueryComplexity = (
  document: DocumentNode,
  variables: Record<string, any> | undefined,
  maxComplexity: number
): void => {
  const operation = getOperationAST(document);
  if (!operation) return;
  const fragmentMap = buildFragmentMap(document);
  const complexity = calcComplexity(
    operation.selectionSet,
    fragmentMap,
    variables
  );
  const rounded = Math.round(complexity);

  if (rounded > maxComplexity) {
    throw new GraphQLError(
      `Query too complex: estimated cost ${rounded} exceeds limit ${maxComplexity}. ` +
        `Reduce pageSize, request fewer fields, or split into multiple queries.`
    );
  }
};
