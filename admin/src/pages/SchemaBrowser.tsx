import { useEffect, useState } from 'react';
import { ModelInfo, ModelField } from '../types';

export default function SchemaBrowser() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchema = async () => {
      try {
        const res = await fetch('/api/schema');
        const data = await res.json();
        const modelsData: ModelInfo[] = data.models.map((model: any) => ({
          name: model.name,
          fields: model.fields.map((field: any) => ({
            name: field.name,
            type: field.type,
            isList: field.isList,
            isRequired: field.isRequired,
            description: field.relationName ? `关系: ${field.relationName}` : '',
          })),
        }));
        setModels(modelsData);
        if (modelsData.length > 0) {
          setSelectedModel(modelsData[0]);
        }
      } catch (error) {
        console.error('Failed to fetch schema:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchema();
  }, []);

  const getTypeColor = (type: string) => {
    const scalarTypes = ['String', 'Int', 'Float', 'Boolean', 'DateTime', 'JSON'];
    if (scalarTypes.includes(type)) return 'text-green-600';
    return 'text-blue-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Schema 浏览器</h1>
        <p className="text-gray-500 mt-1">查看数据库模型和字段定义</p>
      </div>

      <div className="flex gap-6 h-[calc(100vh-200px)]">
        <div className="w-64 flex-shrink-0">
          <div className="card p-4 h-full overflow-auto">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              模型列表
            </h3>
            <div className="space-y-1">
              {models.map((model) => (
                <button
                  key={model.name}
                  onClick={() => setSelectedModel(model)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedModel?.name === model.name
                      ? 'bg-primary-50 text-primary-700'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium">{model.name}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {model.fields.length} 字段
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {selectedModel && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <span className="text-primary-700 font-bold">
                    {selectedModel.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedModel.name}</h2>
                  <p className="text-sm text-gray-500">数据库模型定义</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">字段名</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">类型</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">必填</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">列表</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedModel.fields.map((field: ModelField) => (
                      <tr key={field.name} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <code className="text-gray-900">{field.name}</code>
                        </td>
                        <td className="py-3 px-4">
                          <code className={`font-medium ${getTypeColor(field.type)}`}>
                            {field.isList ? `[${field.type}]` : field.type}
                            {field.isRequired && !field.isList ? '!' : ''}
                          </code>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {field.isRequired ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              是
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              否
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {field.isList ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              是
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              否
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {field.description || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
