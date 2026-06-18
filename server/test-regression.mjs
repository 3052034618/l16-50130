const BASE = 'http://localhost:4000/graphql';

const gql = (query, variables, token) =>
  fetch(BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  }).then(r => r.json());

const login = (username, password) =>
  gql(`mutation { login(username: "${username}", password: "${password}") { token user { id username role } } }`)
    .then(r => r.data?.login);

let passed = 0;
let failed = 0;

const assert = (name, condition, detail) => {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

async function run() {
  console.log('🚀 GraphQL 回归测试\n');

  const adminLogin = await login('admin', 'admin123');
  const adminToken = adminLogin.token;
  const userLogin = await login('user1', 'user123');
  const userToken = userLogin.token;

  // ── 1. 普通字段查询 + 权限裁剪 ──
  console.log('\n=== 1. 普通字段查询 + 权限裁剪 ===');

  const r1 = await gql(`query { getUser(id: 1) { id username email role createdAt } }`, null, userToken);
  assert('getUser.id 存在', r1.data?.getUser?.id !== undefined);
  assert('getUser.username 存在', r1.data?.getUser?.username !== undefined);
  assert('getUser.email 已裁剪', r1.data?.getUser?.email === undefined, `got: ${r1.data?.getUser?.email}`);
  assert('getUser.role 已裁剪', r1.data?.getUser?.role === undefined, `got: ${r1.data?.getUser?.role}`);
  assert('getUser.createdAt 存在', r1.data?.getUser?.createdAt !== undefined);

  const r1b = await gql(`query { getUser(id: 1) { id username email role } }`, null, adminToken);
  assert('管理员 getUser.email 可见', r1b.data?.getUser?.email !== undefined);
  assert('管理员 getUser.role 可见', r1b.data?.getUser?.role !== undefined);

  // ── 2. 管理员 me 查询 ──
  console.log('\n=== 2. 管理员 me 查询 ===');

  const r2 = await gql(`query { me { id username email role } }`, null, adminToken);
  assert('me.id 存在', r2.data?.me?.id !== undefined);
  assert('me.username = admin', r2.data?.me?.username === 'admin');
  assert('me.email 管理员可见', r2.data?.me?.email !== undefined);
  assert('me.role = ADMIN', r2.data?.me?.role === 'ADMIN');

  const r2b = await gql(`query { me { id username email role } }`, null, userToken);
  assert('普通用户 me.email 已裁剪', r2b.data?.me?.email === undefined, `got: ${r2b.data?.me?.email}`);
  assert('普通用户 me.role 已裁剪', r2b.data?.me?.role === undefined, `got: ${r2b.data?.me?.role}`);

  // ── 3. 命名 Fragment 计入复杂度 ──
  console.log('\n=== 3. 命名 Fragment 计入复杂度 ===');

  const normalNoFrag = `query {
    getUser(id: 1) { id username email role createdAt }
    me { id username }
  }`;
  const r3a = await gql(normalNoFrag, null, adminToken);
  assert('无 fragment 普通查询正常执行', !r3a.errors, r3a.errors?.[0]?.message);

  const bigFragment = `fragment HeavyUser on User {
    id username email role createdAt
    posts { id title content createdAt updatedAt viewCount published tags }
    comments { id content createdAt updatedAt approved }
    profile { id bio avatar location website phone }
  }
  query {
    getUser(id: 1) { ...HeavyUser }
    me { id username }
  }`;
  const r3b = await gql(bigFragment, null, adminToken);
  assert('包含 fragment 的 getUser 查询正常执行', !r3b.errors, r3b.errors?.[0]?.message);

  const abusiveFragment = `fragment AllFields on User {
    id username email role createdAt updatedAt
    posts { id title content createdAt updatedAt viewCount published tags author { id username } comments { id content } }
    comments { id content createdAt updatedAt approved author { id username } post { id title } }
    profile { id bio avatar location website phone }
  }
  query {
    listUsers(pageSize: 50) { nodes { ...AllFields } }
    listPosts(pageSize: 50) { nodes { id title content author { id username email role } comments { id content } } }
  }`;
  const r3c = await gql(abusiveFragment, null, adminToken);
  const blocked3 = r3c.errors?.some(e => e.message.includes('too complex') || e.message.includes('complexity'));
  assert('大型 fragment + 大 pageSize 被拦截', blocked3, JSON.stringify(r3c.errors?.[0]?.message));

  // ── 4. pageSize 变量按实际值加权 ──
  console.log('\n=== 4. pageSize 变量按实际值加权 ===');

  const listQuery = `query ListUsers($size: Int) {
    listUsers(pageSize: $size) { nodes { id username } }
  }`;

  const r4a = await gql(listQuery, { size: 10 }, adminToken);
  assert('pageSize=10 正常执行', !r4a.errors, r4a.errors?.[0]?.message);
  assert('pageSize=10 返回数据', r4a.data?.listUsers?.nodes?.length > 0);

  const r4b = await gql(listQuery, { size: 20 }, adminToken);
  assert('pageSize=20 正常执行', !r4b.errors, r4b.errors?.[0]?.message);

  const bigPageQuery = `query BigPage($size: Int) {
    listUsers(pageSize: $size) { nodes { id username email role createdAt posts { id title content } comments { id content } profile { id bio } } }
  }`;
  const r4c = await gql(bigPageQuery, { size: 200 }, adminToken);
  const blocked4 = r4c.errors?.some(e => e.message.includes('too complex') || e.message.includes('complexity'));
  assert('pageSize=200 + 多字段被拦截', blocked4, JSON.stringify(r4c.errors?.[0]?.message));

  // ── 5. 无变量 pageSize 的分页查询 ──
  console.log('\n=== 5. 无变量 pageSize 的分页查询 ===');

  const noVarQuery = `query {
    listUsers(pageSize: 5) { nodes { id username } }
  }`;
  const r5 = await gql(noVarQuery, null, adminToken);
  assert('字面量 pageSize=5 正常执行', !r5.errors, r5.errors?.[0]?.message);

  const literalBigQuery = `query {
    listUsers(pageSize: 100) { nodes { id username email role posts { id title content createdAt } comments { id content } profile { id bio } } }
  }`;
  const r5b = await gql(literalBigQuery, null, adminToken);
  const blocked5 = r5b.errors?.some(e => e.message.includes('too complex') || e.message.includes('complexity'));
  assert('字面量 pageSize=100 + 多字段被拦截', blocked5, JSON.stringify(r5b.errors?.[0]?.message));

  // ── 6. 错误信息可读性 ──
  console.log('\n=== 6. 错误信息可读性 ===');

  const errorQuery = `query {
    listUsers(pageSize: 500) { nodes { id username email role createdAt updatedAt posts { id title content viewCount published tags } } }
  }`;
  const r6 = await gql(errorQuery, null, adminToken);
  const errMsg = r6.errors?.[0]?.message || '';
  assert('错误包含 estimated cost', errMsg.includes('estimated cost'), errMsg);
  assert('错误包含 limit', errMsg.includes('limit'), errMsg);
  assert('错误包含建议', errMsg.includes('Reduce') || errMsg.includes('split'), errMsg);

  // ── 7. 查询深度限制 ──
  console.log('\n=== 7. 查询深度限制 ===');

  const deepQuery = `query {
    getUser(id: 1) { id posts { id author { id posts { id author { id posts { id author { id posts { id author { id posts { id author { id } } } } } } } } } } }
  }`;
  const r7 = await gql(deepQuery, null, adminToken);
  const blocked7 = r7.errors?.some(e => e.message.includes('depth') || e.message.includes('Depth'));
  assert('过深嵌套查询被拦截', blocked7, JSON.stringify(r7.errors?.[0]?.message));

  // ── 8. 合法查询不被误伤 ──
  console.log('\n=== 8. 合法查询不被误伤 ===');

  const legitQueries = [
    { name: 'me', q: `query { me { id username } }` },
    { name: 'getUser', q: `query { getUser(id: 1) { id username createdAt } }` },
    { name: 'listUsers 小页', q: `query { listUsers(pageSize: 10) { nodes { id username } } }` },
    { name: 'listPosts 小页', q: `query { listPosts(pageSize: 5) { nodes { id title } } }` },
    { name: 'countUsers', q: `query { countUsers }` },
  ];

  for (const { name, q } of legitQueries) {
    const r = await gql(q, null, adminToken);
    assert(`${name} 正常执行`, !r.errors, r.errors?.[0]?.message);
  }

  // ── 汇总 ──
  console.log('\n' + '='.repeat(50));
  console.log(`📊 通过 ${passed}  /  失败 ${failed}`);
  console.log('='.repeat(50));
  if (failed === 0) console.log('🎉 全部回归测试通过!');
  else console.log('⚠️  存在失败，请检查!');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
