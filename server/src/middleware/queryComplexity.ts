import { GraphQLError, DocumentNode, OperationDefinitionNode, FieldNode, SelectionSetNode } from 'graphql';
import { getOperationAST } from 'graphql';

interface ValidationContext {
  reportError(error: GraphQLError): void;
  getDocument(): DocumentNode;
}

export const createQueryDepthLimitRule = (maxDepth: number) => {
  return (context: ValidationContext) => {
    return {
      OperationDefinition(node: OperationDefinitionNode) {
        const depth = calculateDepth(node.selectionSet, 0);
        if (depth > maxDepth) {
          context.reportError(
            new GraphQLError(
              `Query depth ${depth} exceeds maximum allowed depth of ${maxDepth}`
            )
          );
        }
      },
    };
  };
};

const calculateDepth = (selectionSet: SelectionSetNode | undefined, currentDepth: number): number => {
  if (!selectionSet) return currentDepth;
  
  let maxChildDepth = currentDepth;
  selectionSet.selections.forEach(selection => {
    if (selection.kind === 'Field') {
      if (selection.selectionSet) {
        const childDepth = calculateDepth(selection.selectionSet, currentDepth + 1);
        maxChildDepth = Math.max(maxChildDepth, childDepth);
      }
    } else if (selection.kind === 'InlineFragment' || selection.kind === 'FragmentSpread') {
      if (selection.selectionSet) {
        const childDepth = calculateDepth(selection.selectionSet, currentDepth);
        maxChildDepth = Math.max(maxChildDepth, childDepth);
      }
    }
  });
  
  return maxChildDepth;
};

export const calculateQueryComplexity = (
  document: DocumentNode,
  variables?: Record<string, any>
): number => {
  const operation = getOperationAST(document);
  if (!operation) return 0;
  
  return calculateSelectionComplexity(operation.selectionSet, variables);
};

const calculateSelectionComplexity = (
  selectionSet: SelectionSetNode | undefined,
  variables?: Record<string, any>
): number => {
  if (!selectionSet) return 0;
  
  let complexity = 0;
  selectionSet.selections.forEach(selection => {
    if (selection.kind === 'Field') {
      complexity += 1;
      
      if (selection.arguments) {
        selection.arguments.forEach(arg => {
          if (arg.name.value === 'pageSize') {
            const value = getArgumentValue(arg.value, variables);
            if (typeof value === 'number') {
              complexity += value * 0.1;
            }
          }
        });
      }
      
      if (selection.selectionSet) {
        complexity += calculateSelectionComplexity(selection.selectionSet, variables);
      }
    } else if (selection.kind === 'InlineFragment' && selection.selectionSet) {
      complexity += calculateSelectionComplexity(selection.selectionSet, variables);
    }
  });
  
  return complexity;
};

const getArgumentValue = (value: any, variables?: Record<string, any>): any => {
  if (value.kind === 'Variable') {
    return variables?.[value.name.value];
  }
  if (value.kind === 'IntValue') {
    return parseInt(value.value, 10);
  }
  if (value.kind === 'StringValue') {
    return value.value;
  }
  if (value.kind === 'BooleanValue') {
    return value.value;
  }
  return null;
};

export const createComplexityValidationRule = (maxComplexity: number) => {
  return (context: ValidationContext) => {
    return {
      OperationDefinition(node: OperationDefinitionNode) {
        const complexity = calculateSelectionComplexity(node.selectionSet, context.getVariableValues?.() || {});
        if (complexity > maxComplexity) {
          context.reportError(
            new GraphQLError(
              `Query complexity ${Math.round(complexity)} exceeds maximum allowed complexity of ${maxComplexity}`
            )
          );
        }
      },
    };
  };
};
