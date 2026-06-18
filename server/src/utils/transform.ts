export const transformPost = (post: any): any => {
  if (!post) return post;
  
  const result = { ...post };
  
  if (typeof result.tags === 'string') {
    try {
      result.tags = JSON.parse(result.tags);
    } catch {
      result.tags = result.tags ? [result.tags] : [];
    }
  }
  
  return result;
};

export const transformPostCreateInput = (data: any): any => {
  const result = { ...data };
  
  if (Array.isArray(result.tags)) {
    result.tags = JSON.stringify(result.tags);
  }
  
  return result;
};

export const transformSavedQuery = (sq: any): any => {
  if (!sq) return sq;
  
  const result = { ...sq };
  
  if (typeof result.variables === 'string') {
    try {
      result.variables = JSON.parse(result.variables);
    } catch {
      result.variables = null;
    }
  }
  
  return result;
};

export const transformSavedQueryCreateInput = (data: any): any => {
  const result = { ...data };
  
  if (result.variables !== undefined && result.variables !== null) {
    result.variables = JSON.stringify(result.variables);
  }
  
  return result;
};

export const transformRequestLog = (log: any): any => {
  if (!log) return log;
  
  const result = { ...log };
  
  ['variables', 'result', 'errors'].forEach(field => {
    if (typeof result[field] === 'string') {
      try {
        result[field] = JSON.parse(result[field]);
      } catch {
        result[field] = null;
      }
    }
  });
  
  return result;
};

export const transformRequestLogCreateInput = (data: any): any => {
  const result = { ...data };
  
  ['variables', 'result', 'errors'].forEach(field => {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = JSON.stringify(result[field]);
    }
  });
  
  return result;
};

export const transformList = <T>(items: T[], transformer: (item: T) => T): T[] => {
  if (!Array.isArray(items)) return items;
  return items.map(transformer);
};

export const transformConnection = (connection: any, transformer: (item: any) => any): any => {
  if (!connection) return connection;
  
  return {
    ...connection,
    nodes: transformList(connection.nodes, transformer),
  };
};
