import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth';

const Role = {
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  USER: 'USER',
  VIEWER: 'VIEWER',
};

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  await prisma.requestLog.deleteMany({});
  await prisma.savedQuery.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.profile.deleteMany({});
  await prisma.user.deleteMany({});

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@example.com',
      password: hashPassword('admin123'),
      role: Role.ADMIN,
    },
  });

  const editor = await prisma.user.create({
    data: {
      username: 'editor',
      email: 'editor@example.com',
      password: hashPassword('editor123'),
      role: Role.EDITOR,
    },
  });

  const user1 = await prisma.user.create({
    data: {
      username: 'user1',
      email: 'user1@example.com',
      password: hashPassword('user123'),
      role: Role.USER,
    },
  });

  const viewer = await prisma.user.create({
    data: {
      username: 'viewer',
      email: 'viewer@example.com',
      password: hashPassword('viewer123'),
      role: Role.VIEWER,
    },
  });

  await prisma.profile.createMany({
    data: [
      {
        bio: '系统管理员，负责平台运维',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
        location: '北京',
        website: 'https://admin.example.com',
        phone: '13800138000',
        userId: admin.id,
      },
      {
        bio: '内容编辑，专注优质内容创作',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=editor',
        location: '上海',
        website: 'https://editor.example.com',
        phone: '13800138001',
        userId: editor.id,
      },
      {
        bio: '普通用户，热爱分享',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
        location: '广州',
        website: null,
        phone: null,
        userId: user1.id,
      },
    ],
  });

  const post1 = await prisma.post.create({
    data: {
      title: 'GraphQL 入门指南',
      content: 'GraphQL 是一种用于 API 的查询语言，也是一个满足你数据查询的运行时。GraphQL 对你的 API 中的数据提供了一套易于理解的完整描述，使得客户端能够准确地获得它需要的数据，而且没有任何冗余。',
      published: true,
      viewCount: 1256,
      authorId: admin.id,
      tags: JSON.stringify(['GraphQL', 'API', '教程']),
    },
  });

  const post2 = await prisma.post.create({
    data: {
      title: 'Prisma ORM 最佳实践',
      content: 'Prisma 是一个开源的数据库工具链项目，它包含以下组件：Prisma Client - 自动生成的类型安全的查询构建器，Prisma Migrate - 声明式数据建模和自动生成的迁移，Prisma Studio - 查看和编辑数据库数据的图形用户界面。',
      published: true,
      viewCount: 892,
      authorId: editor.id,
      tags: JSON.stringify(['Prisma', 'ORM', '数据库']),
    },
  });

  const post3 = await prisma.post.create({
    data: {
      title: 'DataLoader 解决 N+1 问题',
      content: 'N+1 查询问题是 GraphQL 开发中常见的性能问题。当查询多个对象及其关联数据时，会产生大量的数据库查询。DataLoader 通过批处理和缓存来解决这个问题，将多个查询合并为一个批量查询。',
      published: false,
      viewCount: 342,
      authorId: editor.id,
      tags: JSON.stringify(['DataLoader', '性能优化', 'GraphQL']),
    },
  });

  await prisma.post.create({
    data: {
      title: 'TypeScript 高级技巧',
      content: 'TypeScript 是 JavaScript 的超集，添加了类型系统和编译时检查。掌握 TypeScript 的高级特性可以大大提高代码质量和开发效率。',
      published: true,
      viewCount: 2341,
      authorId: user1.id,
      tags: JSON.stringify(['TypeScript', 'JavaScript', '技巧']),
    },
  });

  await prisma.comment.createMany({
    data: [
      {
        content: '非常好的入门教程，学到了很多！',
        approved: true,
        postId: post1.id,
        authorId: user1.id,
      },
      {
        content: '请问如何处理分页查询？',
        approved: true,
        postId: post1.id,
        authorId: viewer.id,
      },
      {
        content: 'Prisma 真的很好用，类型安全太重要了。',
        approved: true,
        postId: post2.id,
        authorId: admin.id,
      },
      {
        content: '期待后续的高级教程。',
        approved: false,
        postId: post2.id,
        authorId: user1.id,
      },
      {
        content: 'N+1 问题确实很头疼，DataLoader 是必备工具。',
        approved: true,
        postId: post3.id,
        authorId: editor.id,
      },
    ],
  });

  console.log('\n✅ Database seeded successfully!');
  console.log('\nTest accounts:');
  console.log('  ADMIN:  admin / admin123');
  console.log('  EDITOR: editor / editor123');
  console.log('  USER:   user1 / user123');
  console.log('  VIEWER: viewer / viewer123');
  console.log('\nPosts created: 4');
  console.log('Comments created: 5');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
