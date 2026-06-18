import { useState, useEffect, useCallback } from 'react';
import { GraphiQLProvider, useEditorContext, UseQueryEditorArgs } from '@graphiql/react';
import { createGraphiQLFetcher } from '@graphiql/toolkit';
import { SavedQuery } from '../types';
import { gql, useQuery, useMutation } from '@apollo/client';
import '@graphiql/react/dist/style.css';

const LIST_SAVED_QUERIES = gql`
  query ListSavedQueries {
    listSavedQueries {
      id
      name
      description
      query
      variables
    }
  }
`;

const SAVE_QUERY_MUTATION = gql`
  mutation SaveQuery($name: String!, $description: String, $query: String!, $variables: JSON) {
    saveQuery(name: $name, description: $description, query: $query, variables: $variables) {
      id
      name
    }
  }
`;

const fetcher = createGraphiQLFetcher({
  url: '/graphql',
  wsUrl: `ws://${window.location.host}/graphql`,
  headers: () => {
    const token = localStorage.getItem('token');
    return token ? { authorization: `Bearer ${token}` } : {};
  },
});

function QueryEditor(props: UseQueryEditorArgs) {
  const { ref } = useEditorContext({
    nonNull: true,
    caller: QueryEditor,
  }, props);
  return (
    <div
      ref={ref as any}
      className="h-full bg-white border border-gray-200 rounded-lg"
    />
  );
}

export default function Playground() {
  const [query, setQuery] = useState(`# 欢迎使用 GraphQL Playground！
# 这里是一些示例查询，您可以直接运行或修改它们

# 查询用户列表
query GetUsers {
  listUsers(page: 1, pageSize: 10) {
    nodes {
      id
      username
      role
      createdAt
    }
    total
  }
}

# 查询文章及其评论
# query GetPostsWithComments {
#   listPosts(page: 1, pageSize: 5) {
#     nodes {
#       id
#       title
#       content
#       author {
#         username
#       }
#       comments {
#         content
#         author {
#           username
#         }
#       }
#     }
#   }
# }

# 订阅新文章（实时）
# subscription OnPostCreated {
#   postCreated {
#     id
#     title
#     author {
#       username
#     }
#   }
# }
`);
  const [variables, setVariables] = useState('{}');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);

  const { data, refetch } = useQuery(LIST_SAVED_QUERIES, {
    skip: false,
  });

  const [saveQuery] = useMutation(SAVE_QUERY_MUTATION);

  useEffect(() => {
    if (data?.listSavedQueries) {
      setSavedQueries(data.listSavedQueries);
    }
  }, [data]);

  const handleSave = async () => {
    if (!saveName.trim()) return;
    
    try {
      await saveQuery({
        variables: {
          name: saveName,
          description: saveDescription,
          query,
          variables: JSON.parse(variables),
        },
      });
      setShowSaveModal(false);
      setSaveName('');
      setSaveDescription('');
      refetch();
    } catch (error) {
      console.error('Failed to save query:', error);
    }
  };

  const loadQuery = (sq: SavedQuery) => {
    setQuery(sq.query);
    setVariables(sq.variables ? JSON.stringify(sq.variables, null, 2) : '{}');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GraphQL Playground</h1>
          <p className="text-gray-500 mt-1">交互式查询编辑器，支持实时订阅</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSaveModal(true)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <span>💾</span>
            保存查询
          </button>
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-200px)]">
        <div className="w-56 flex-shrink-0">
          <div className="card p-4 h-full overflow-auto">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              已保存查询
            </h3>
            {savedQueries.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">暂无保存的查询</p>
            ) : (
              <div className="space-y-2">
                {savedQueries.map((sq) => (
                  <button
                    key={sq.id}
                    onClick={() => loadQuery(sq)}
                    className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <p className="font-medium text-gray-900 text-sm truncate">{sq.name}</p>
                    {sq.description && (
                      <p className="text-xs text-gray-500 truncate">{sq.description}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1">
          <GraphiQLProvider
            fetcher={fetcher}
            defaultQuery={query}
            defaultVariables={variables}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
              <div className="card p-4 flex flex-col h-full">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">查询 (Query)</h3>
                  <span className="text-xs text-gray-400 font-mono">query.graphql</span>
                </div>
                <div className="flex-1 min-h-[300px]">
                  <QueryEditor
                    editorId="query-editor"
                    initialValue={query}
                    onChange={(value: string) => setQuery(value || '')}
                  />
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">变量 (Variables)</h3>
                  <QueryEditor
                    editorId="variable-editor"
                    initialValue={variables}
                    onChange={(value: string) => setVariables(value || '{}')}
                  />
                </div>
              </div>

              <div className="card p-4 flex flex-col h-full">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">响应 (Response)</h3>
                  <span className="text-xs text-gray-400 font-mono">response.json</span>
                </div>
                <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-auto font-mono text-sm">
                  <p className="text-gray-500">
                    点击播放按钮运行查询，或切换到订阅标签页查看实时更新
                  </p>
                  <div className="mt-4 p-4 bg-white rounded border border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">💡 提示：</p>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li>• 使用 Ctrl+Enter 运行查询</li>
                      <li>• 订阅会通过 WebSocket 实时接收更新</li>
                      <li>• 所有请求都会被记录到请求日志</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </GraphiQLProvider>
        </div>
      </div>

      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">保存查询</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名称
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="input"
                  placeholder="输入查询名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述 (可选)
                </label>
                <textarea
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  className="input"
                  rows={3}
                  placeholder="输入查询描述"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowSaveModal(false)}
                className="btn btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="btn btn-primary flex-1"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
