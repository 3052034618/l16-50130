import { DMMF } from '@prisma/client/runtime/library';
import { gql } from 'graphql-tag';
import pluralize from 'pluralize';

const PRISMA_TO_GQL_TYPE: Record<string, string> = {
  String: 'String',
  Int: 'Int',
  Float: 'Float',
  Boolean: 'Boolean',
  DateTime: 'DateTime',
  Json: 'JSON',
  JsonValue: 'JSON',
};

const FIELD_TYPE_OVERRIDES: Record<string, Record<string, { type: string; isList: boolean }>> = {
  Post: {
    tags: { type: 'String', isList: true },
  },
  SavedQuery: {
    variables: { type: 'JSON', isList: false },
  },
  RequestLog: {
    variables: { type: 'JSON', isList: false },
    result: { type: 'JSON', isList: false },
    errors: { type: 'JSON', isList: false },
  },
};

const getFieldTypeOverride = (modelName: string, fieldName: string) => {
  return FIELD_TYPE_OVERRIDES[modelName]?.[fieldName];
};

export const generateGraphQLSchema = (dmmf: DMMF.Document) => {
  const models = dmmf.datamodel.models;
  const enums = dmmf.datamodel.enums;

  let typeDefs = `
    scalar JSON
    scalar DateTime
  `;

  enums.forEach((enumDef: any) => {
    typeDefs += `
      enum ${enumDef.name} {
        ${enumDef.values.map((v: any) => v.name).join('\n        ')}
      }
    `;
  });

  models.forEach((model: any) => {
    typeDefs += `
      type ${model.name} {
        ${model.fields.map((field: any) => {
          const override = getFieldTypeOverride(model.name, field.name);
          let type: string;
          let isList: boolean;
          
          if (override) {
            type = override.type;
            isList = override.isList;
          } else if (field.kind === 'object') {
            type = field.type;
            isList = field.isList;
          } else {
            type = PRISMA_TO_GQL_TYPE[field.type] || field.type;
            isList = field.isList;
          }
          
          const isListOpen = isList ? '[' : '';
          const isListClose = isList ? ']' : '';
          const isRequired = field.isRequired && !isList ? '!' : '';
          return `${field.name}: ${isListOpen}${type}${isListClose}${isRequired}`;
        }).join('\n        ')}
      }
    `;

    const inputFields = model.fields.filter(
      (f: any) => !f.relationName && f.kind !== 'object' && !f.isId && f.type !== 'DateTime'
    );

    typeDefs += `
      input ${model.name}CreateInput {
        ${inputFields.map((field: any) => {
          const override = getFieldTypeOverride(model.name, field.name);
          let type: string;
          let isList: boolean;
          
          if (override) {
            type = override.type;
            isList = override.isList;
          } else {
            type = PRISMA_TO_GQL_TYPE[field.type] || field.type;
            isList = field.isList;
          }
          
          const isListOpen = isList ? '[' : '';
          const isListClose = isList ? ']' : '';
          const isRequired = field.isRequired && !field.hasDefaultValue && !isList ? '!' : '';
          return `${field.name}: ${isListOpen}${type}${isListClose}${isRequired}`;
        }).join('\n        ')}
      }

      input ${model.name}UpdateInput {
        ${inputFields.map((field: any) => {
          const override = getFieldTypeOverride(model.name, field.name);
          let type: string;
          let isList: boolean;
          
          if (override) {
            type = override.type;
            isList = override.isList;
          } else {
            type = PRISMA_TO_GQL_TYPE[field.type] || field.type;
            isList = field.isList;
          }
          
          const isListOpen = isList ? '[' : '';
          const isListClose = isList ? ']' : '';
          return `${field.name}: ${isListOpen}${type}${isListClose}`;
        }).join('\n        ')}
      }

      input ${model.name}WhereInput {
        id: Int
        ${inputFields.map((field: any) => {
          const type = PRISMA_TO_GQL_TYPE[field.type] || field.type;
          return `${field.name}: ${type}`;
        }).join('\n        ')}
      }

      input ${model.name}OrderByInput {
        field: String!
        direction: SortDirection!
      }

      type ${model.name}Connection {
        nodes: [${model.name}!]!
        total: Int!
        page: Int!
        pageSize: Int!
      }
    `;
  });

  typeDefs += `
    enum SortDirection {
      asc
      desc
    }

    type Query {
      ${models.map((model: any) => {
        const camelName = model.name.charAt(0).toLowerCase() + model.name.slice(1);
        const pluralName = pluralize(camelName);
        return `
        get${model.name}(id: Int!): ${model.name}
        list${model.name}s(
          where: ${model.name}WhereInput
          orderBy: ${model.name}OrderByInput
          page: Int = 1
          pageSize: Int = 10
        ): ${model.name}Connection!
        count${model.name}s(where: ${model.name}WhereInput): Int!
        `;
      }).join('\n      ')}
    }

    type Mutation {
      ${models.map((model: any) => {
        return `
        create${model.name}(data: ${model.name}CreateInput!): ${model.name}!
        update${model.name}(id: Int!, data: ${model.name}UpdateInput!): ${model.name}!
        delete${model.name}(id: Int!): ${model.name}!
        `;
      }).join('\n      ')}
    }

    type Subscription {
      ${models.map((model: any) => {
        const camelName = model.name.charAt(0).toLowerCase() + model.name.slice(1);
        return `
        ${camelName}Created: ${model.name}!
        ${camelName}Updated(id: Int): ${model.name}!
        ${camelName}Deleted(id: Int): Int!
        `;
      }).join('\n      ')}
    }
  `;

  return gql(typeDefs);
};
