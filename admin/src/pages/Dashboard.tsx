import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useQuery, gql } from '@apollo/client';

const STATS_QUERY = gql`
  query Stats {
    listUsers(page: 1, pageSize: 1) { total }
    listPosts(page: 1, pageSize: 1) { total }
    listComments(page: 1, pageSize: 1) { total }
  }
`;

interface HealthData {
  status: string;
  activeConnections: number;
  totalSubscriptions: number;
}

export default function Dashboard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const { data, loading } = useQuery(STATS_QUERY);

  useEffect(() => {
    const fetchHealth = async () => {
      const res = await fetch('/health');
      const data = await res.json();
      setHealth(data);
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const mockRequestData = [
    { time: '00:00', requests: 45, errors: 2 },
    { time: '04:00', requests: 30, errors: 0 },
    { time: '08:00', requests: 120, errors: 5 },
    { time: '12:00', requests: 200, errors: 3 },
    { time: '16:00', requests: 180, errors: 1 },
    { time: '20:00', requests: 150, errors: 4 },
  ];

  const mockDurationData = [
    { operation: 'listPosts', avgDuration: 45 },
    { operation: 'getUser', avgDuration: 12 },
    { operation: 'createPost', avgDuration: 89 },
    { operation: 'listComments', avgDuration: 34 },
    { operation: 'updateUser', avgDuration: 56 },
  ];

  const stats = [
    {
      label: '用户总数',
      value: data?.listUsers?.total || 0,
      icon: '👥',
      change: '+12%',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: '文章总数',
      value: data?.listPosts?.total || 0,
      icon: '📄',
      change: '+8%',
      color: 'bg-green-50 text-green-600',
    },
    {
      label: '评论总数',
      value: data?.listComments?.total || 0,
      icon: '💬',
      change: '+23%',
      color: 'bg-yellow-50 text-yellow-600',
    },
    {
      label: '活跃连接',
      value: health?.activeConnections || 0,
      icon: '🔌',
      change: '实时',
      color: 'bg-purple-50 text-purple-600',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>
        <p className="text-gray-500 mt-1">监控系统运行状态和关键指标</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {loading ? '...' : stat.value}
                </p>
                <p className="text-sm text-green-600 mt-2">{stat.change}</p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-2xl`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">请求趋势</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockRequestData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="requests" stroke="#0ea5e9" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">平均响应时间 (ms)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockDurationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="operation" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip />
              <Bar dataKey="avgDuration" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {health && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">服务状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${health.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <div>
                <p className="text-sm text-gray-500">服务状态</p>
                <p className="font-medium text-gray-900">{health.status.toUpperCase()}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <div>
                <p className="text-sm text-gray-500">WebSocket 连接</p>
                <p className="font-medium text-gray-900">{health.activeConnections}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <div>
                <p className="text-sm text-gray-500">活跃订阅</p>
                <p className="font-medium text-gray-900">{health.totalSubscriptions}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
