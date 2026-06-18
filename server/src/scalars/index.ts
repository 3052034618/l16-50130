import { GraphQLScalarType, Kind } from 'graphql';

export const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  serialize(value: any) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      return new Date(value).toISOString();
    }
    return value;
  },
  parseValue(value: any) {
    if (typeof value === 'string') {
      return new Date(value);
    }
    if (value instanceof Date) {
      return value;
    }
    return new Date(value);
  },
  parseLiteral(ast: any) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    if (ast.kind === Kind.INT) {
      return new Date(parseInt(ast.value, 10));
    }
    return null;
  },
});

export const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  serialize(value: any) {
    return value;
  },
  parseValue(value: any) {
    return value;
  },
  parseLiteral(ast: any) {
    switch (ast.kind) {
      case Kind.STRING:
        return JSON.parse(ast.value);
      case Kind.OBJECT:
        const obj: any = {};
        ast.fields.forEach((field: any) => {
          obj[field.name.value] = parseLiteral(field.value);
        });
        return obj;
      case Kind.LIST:
        return ast.values.map((item: any) => parseLiteral(item));
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
        return parseInt(ast.value, 10);
      case Kind.FLOAT:
        return parseFloat(ast.value);
      case Kind.NULL:
        return null;
      default:
        return null;
    }
  },
});

function parseLiteral(ast: any): any {
  switch (ast.kind) {
    case Kind.STRING:
      return ast.value;
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
      return parseInt(ast.value, 10);
    case Kind.FLOAT:
      return parseFloat(ast.value);
    case Kind.NULL:
      return null;
    case Kind.OBJECT:
      const obj: any = {};
      ast.fields?.forEach((field: any) => {
        obj[field.name.value] = parseLiteral(field.value);
      });
      return obj;
    case Kind.LIST:
      return ast.values?.map((item: any) => parseLiteral(item));
    default:
      return null;
  }
}

export const scalarResolvers = {
  DateTime: DateTimeScalar,
  JSON: JSONScalar,
};
