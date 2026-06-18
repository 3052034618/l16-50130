const BASE_URL = 'http://localhost:4000/graphql';

async function login(username, password) {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `mutation Login($username: String!, $password: String!) {
        login(username: $username, password: $password) {
          token
          user {
            id
            username
            email
            role
          }
        }
      }`,
      variables: { username, password },
    }),
  });
  const data = await response.json();
  return data.data?.login?.token;
}

async function testFieldPermissionCrop() {
  console.log('\n=== 测试1: 字段权限裁剪 ===');
  
  const userToken = await login('user1', 'user123');
  console.log('普通用户登录成功');
  
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'authorization': `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      query: `query TestUserFields {
        getUser(id: 1) {
          id
          username
          email
          role
          createdAt
        }
        getCurrentUser: me {
          id
          username
          email
          role
        }
      }`,
    }),
  });
  
  const data = await response.json();
  console.log('查询结果:', JSON.stringify(data, null, 2));
  
  const user1 = data.data?.getUser;
  const currentUser = data.data?.getCurrentUser;
  
  let passed = true;
  
  if (user1) {
    console.log('\ngetUser(1) 字段检查:');
    console.log('  id:', user1.id, user1.id ? '✅' : '❌');
    console.log('  username:', user1.username, user1.username ? '✅' : '❌');
    console.log('  email:', user1.email, user1.email === undefined ? '✅ (已裁剪)' : '❌ (不该存在)');
    console.log('  role:', user1.role, user1.role === undefined ? '✅ (已裁剪)' : '❌ (不该存在)');
    console.log('  createdAt:', user1.createdAt, user1.createdAt ? '✅' : '❌');
    
    if (user1.email !== undefined || user1.role !== undefined) {
      passed = false;
    }
  }
  
  if (currentUser) {
    console.log('\nme 查询字段检查:');
    console.log('  id:', currentUser.id, currentUser.id ? '✅' : '❌');
    console.log('  username:', currentUser.username, currentUser.username ? '✅' : '❌');
    console.log('  email:', currentUser.email, currentUser.email === undefined ? '✅ (已裁剪)' : '❌ (不该存在)');
    console.log('  role:', currentUser.role, currentUser.role === undefined ? '✅ (已裁剪)' : '❌ (不该存在)');
    
    if (currentUser.email !== undefined || currentUser.role !== undefined) {
      passed = false;
    }
  }
  
  console.log('\n测试1结果:', passed ? '✅ 通过' : '❌ 失败');
  return passed;
}

async function testAdminCanSeeAllFields() {
  console.log('\n=== 测试1.5: 管理员可以看到所有字段 ===');
  
  const adminToken = await login('admin', 'admin123');
  console.log('管理员登录成功');
  
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      query: `query TestAdminFields {
        getUser(id: 1) {
          id
          username
          email
          role
          createdAt
        }
      }`,
    }),
  });
  
  const data = await response.json();
  const user1 = data.data?.getUser;
  
  let passed = true;
  
  if (user1) {
    console.log('管理员查询 getUser(1) 字段检查:');
    console.log('  id:', user1.id, user1.id ? '✅' : '❌');
    console.log('  username:', user1.username, user1.username ? '✅' : '❌');
    console.log('  email:', user1.email, user1.email ? '✅' : '❌ (不该被裁剪)');
    console.log('  role:', user1.role, user1.role ? '✅' : '❌ (不该被裁剪)');
    
    if (user1.email === undefined || user1.role === undefined) {
      passed = false;
    }
  }
  
  console.log('\n测试1.5结果:', passed ? '✅ 通过' : '❌ 失败');
  return passed;
}

async function testComplexityLimit() {
  console.log('\n=== 测试2: 查询复杂度限制 ===');
  
  const adminToken = await login('admin', 'admin123');
  
  const manyFieldsQuery = `query TooManyFields {
    listUsers(pageSize: 100) {
      nodes {
        id username createdAt updatedAt
        posts { id title content createdAt updatedAt viewCount published tags }
        comments { id content createdAt updatedAt approved }
        profile { id bio avatar location website phone }
      }
    }
    listPosts(pageSize: 100) {
      nodes {
        id title content createdAt updatedAt viewCount published tags
        author { id username createdAt }
        comments { id content createdAt author { id username } }
      }
    }
    listComments(pageSize: 100) {
      nodes {
        id content createdAt updatedAt approved
        author { id username }
        post { id title }
      }
    }
  }`;
  
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ query: manyFieldsQuery }),
  });
  
  const data = await response.json();
  console.log('复杂度限制查询结果:', JSON.stringify(data, null, 2));
  
  const hasComplexityError = data.errors?.some((e) => 
    e.message.includes('complexity') || e.message.includes('复杂度')
  );
  
  console.log('\n测试2结果:', hasComplexityError ? '✅ 通过 (复杂度限制生效)' : '❌ 失败 (复杂度限制未生效)');
  return hasComplexityError;
}

async function testAuthTokenPassing() {
  console.log('\n=== 测试3: 登录态传递 ===');
  
  const userToken = await login('user1', 'user123');
  console.log('获取token成功');
  
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'authorization': `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      query: `query Me {
        me {
          id
          username
        }
      }`,
    }),
  });
  
  const data = await response.json();
  console.log('me查询结果:', JSON.stringify(data, null, 2));
  
  const passed = data.data?.me && data.data.me.username === 'user1';
  console.log('\n测试3结果:', passed ? '✅ 通过 (登录态传递正常)' : '❌ 失败 (登录态传递失败)');
  return passed;
}

async function runAllTests() {
  console.log('🚀 开始运行所有测试...\n');
  
  const results = [];
  
  results.push(await testFieldPermissionCrop());
  results.push(await testAdminCanSeeAllFields());
  results.push(await testComplexityLimit());
  results.push(await testAuthTokenPassing());
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果汇总:');
  console.log('  字段权限裁剪:', results[0] ? '✅' : '❌');
  console.log('  管理员全字段:', results[1] ? '✅' : '❌');
  console.log('  复杂度限制:', results[2] ? '✅' : '❌');
  console.log('  登录态传递:', results[3] ? '✅' : '❌');
  console.log('='.repeat(50));
  
  const allPassed = results.every(r => r);
  console.log(allPassed ? '\n🎉 所有测试通过!' : '\n⚠️  部分测试失败,请检查!');
  
  return allPassed;
}

runAllTests().catch(console.error);
