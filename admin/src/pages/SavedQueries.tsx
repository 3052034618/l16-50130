import { useState } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import { SavedQuery } from '../types';
import { useNavigate } from 'react-router-dom';

const LIST_SAVED_QUERIES = gql`
  query ListSavedQueries {
    listSavedQueries {
      id
      name
      description
      query
      variables
      createdAt
      updatedAt
    }
  }
`;

const DELETE_SAVED_QUERY = gql`
  mutation DeleteSavedQuery($id: Int!) {
    deleteSavedQuery(id: $id) {
      id
    }
  }
`;

export default function SavedQueries() {
  const [selectedQuery, setSelectedQuery] = useState<SavedQuery | null>(null);
  const navigate = useNavigate();

  const { data, loading, refetch } = useQuery(LIST_SAVED_QUERIES);
  const [deleteQuery] = useMutation(DELETE_SAVED_QUERY);

  const savedQueries: SavedQuery[] = data?.listSavedQueries || [];

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个查询吗？')) return;
    try {
      await deleteQuery({ variables: { id } });
      refetch();
      if (selectedQuery?.id === id) {
        setSelectedQuery(null);
      }
    } catch (error) {
      console.error('Failed to delete query:', error);
    }
  };

  const loadToPlayground = (query: SavedQuery) => {
    localStorage.setItem('savedQuery', JSON.stringify(query));
    navigate('/playground');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">已保存查询</h1>
        <p className="text-gray-500 mt-1">管理您保存的 GraphQL 查询片段</p>
      </div>

      <div className="flex gap-6 h-[calc(100vh-200px)]">
        <div className="w-80 flex-shrink-0">
          <div className="card p-4 h-full overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                查询列表
              </h3>
              <span className="text-xs text-gray-400">
                {savedQueries.length} 个查询
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            ) : savedQueries.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">暂无保存的查询</p>
                <button
                  onClick={() => navigate('/playground')}
                  className="mt-4 text-primary-600 hover:text-primary-800 text-sm font-medium"
                >
                  去 Playground 创建 →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {savedQueries.map((sq) => (
                  <div
                    key={sq.id}
                    onClick={() => setSelectedQuery(sq)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedQuery?.id === sq.id
                        ? 'bg-primary-50 border border-primary-200'
                        : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {sq.name}
                        </p>
                        {sq.description && (
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {sq.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          {formatDate(sq.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {selectedQuery ? (
            <div className="card p-6 h-full flex flex-col">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedQuery.name}
                  </h2>
                  {selectedQuery.description && (
                    <p className="text-gray-500 mt-1">
                      {selectedQuery.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>创建于 {formatDate(selectedQuery.createdAt)}</span>
                    <span>更新于 {formatDate(selectedQuery.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadToPlayground(selectedQuery)}
                    className="btn btn-primary text-sm"
                  >
                    加载到 Playground
                  </button>
                  <button
                    onClick={() => handleDelete(selectedQuery.id)}
                    className="btn btn-danger text-sm"
                  >
                    删除
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-auto">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">
                      查询语句
                    </h3>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedQuery.query);
                      }}
                      className="text-xs text-primary-600 hover:text-primary-800"
                    >
                      复制
                    </button>
                  </div>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-64">
                    {selectedQuery.query}
                  </pre>
                </div>

                {selectedQuery.variables &&
                  Object.keys(selectedQuery.variables).length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-700">
                          变量
                        </h3>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              JSON.stringify(selectedQuery.variables, null, 2)
                            );
                          }}
                          className="text-xs text-primary-600 hover:text-primary-800"
                        >
                          复制
                        </button>
                      </div>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-48">
                        {JSON.stringify(selectedQuery.variables, null, 2)}
                      </pre>
                    </div>
                  )}
              </div>
            </div>
          ) : (
            <div className="card p-8 h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-400 text-lg">选择一个查询查看详情</p>
                <p className="text-gray-400 text-sm mt-2">
                  或前往 Playground 创建新的查询
                </p>
                <button
                  onClick={() => navigate('/playground')}
                  className="mt-4 btn btn-primary"
                >
                  打开 Playground
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
