import { useState, useEffect } from 'react';
import { RequestLog } from '../types';
import { useAuthStore } from '../store/useAuthStore';

export default function RequestLogs() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [operationFilter, setOperationFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const fetchLogs = async () => {
    if (!user || user.role !== 'ADMIN') return;
    
    setLoading(true);
    try {
      const query = `
        query ListRequestLogs($page: Int!, $pageSize: Int!, $operation: String) {
          listRequestLogs(page: $page, pageSize: $pageSize, operation: $operation) {
            nodes {
              id
              operation
              query
              variables
              result
              errors
              duration
              userId
              ipAddress
              createdAt
            }
            total
          }
        }
      `;
      
      const token = localStorage.getItem('token');
      const response = await fetch('/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query,
          variables: { page, pageSize, operation: operationFilter || undefined },
        }),
      });
      
      const data = await response.json();
      if (data.data?.listRequestLogs) {
        setLogs(data.data.listRequestLogs.nodes);
        setTotal(data.data.listRequestLogs.total);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, pageSize, operationFilter, user]);

  useEffect(() => {
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [page, pageSize, operationFilter, user]);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const getDurationColor = (duration: number) => {
    if (duration < 100) return 'text-green-600';
    if (duration < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-500">只有管理员可以查看请求日志</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">请求日志</h1>
          <p className="text-gray-500 mt-1">查看所有 GraphQL 请求记录（每 10 秒自动刷新）</p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="按操作名称筛选..."
            value={operationFilter}
            onChange={(e) => setOperationFilter(e.target.value)}
            className="input w-64"
          />
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="input w-32"
          >
            <option value={10}>10 条/页</option>
            <option value={20}>20 条/页</option>
            <option value={50}>50 条/页</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">ID</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">操作</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">用户 ID</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">耗时</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">错误</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">时间</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                    <span className="ml-2">加载中...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    暂无请求记录
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-600">{log.id}</td>
                    <td className="py-3 px-4">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded text-primary-700">
                        {log.operation}
                      </code>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{log.userId || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`text-sm font-medium ${getDurationColor(log.duration)}`}>
                        {log.duration}ms
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {log.errors ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          错误
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          成功
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {formatTime(log.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            共 {total} 条记录，第 {page} / {Math.ceil(total / pageSize)} 页
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-secondary disabled:opacity-50"
            >
              上一页
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * pageSize >= total}
              className="btn btn-secondary disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
          <div className="card p-6 w-full max-w-4xl max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                请求详情 #{selectedLog.id}
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">操作</p>
                <p className="font-medium">{selectedLog.operation}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">耗时</p>
                <p className="font-medium">{selectedLog.duration}ms</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">用户 ID</p>
                <p className="font-medium">{selectedLog.userId || '未登录'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">IP 地址</p>
                <p className="font-medium">{selectedLog.ipAddress || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">时间</p>
                <p className="font-medium">{formatTime(selectedLog.createdAt)}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">查询语句</p>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-48">
                  {selectedLog.query}
                </pre>
              </div>

              {selectedLog.variables && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">变量</p>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-32">
                    {JSON.stringify(selectedLog.variables, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.result && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">响应结果</p>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-48">
                    {JSON.stringify(selectedLog.result, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.errors && (
                <div>
                  <p className="text-sm font-medium text-red-700 mb-2">错误信息</p>
                  <pre className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-xs overflow-auto max-h-32">
                    {JSON.stringify(selectedLog.errors, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
