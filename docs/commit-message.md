# Git 提交规范（Commit Convention）

本项目采用基于 Conventional Commits 的提交规范，用于统一仓库历史、自动生成更新日志（Changelog）、提高协作与 AI Agent 分析能力。

---

# 提交格式

```bash
<type>(<scope>): <subject>
```

示例：

```bash
feat(balance): 添加轮腿组姿态控制代码
fix(camera): 修复图像二值化阈值异常
docs(ai): 更新 AI 视觉组资料索引
refactor(groups): 重构组别文档目录结构
```

```bash
feat(repo): 优化站点界面并新增资源录入系统

- feat(ui): 首页和资源页默认隐藏文件树，文档页支持隐藏文件树和文章目录
- feat(search): 搜索弹窗支持选择知识库、资源或全部范围
- feat(resources): 资源页新增资源添加表单，支持本地暂存、即时展示和 JSON 导出
- feat(scripts): 新增资源草稿导入脚本，按年份和组别合并资源分片
- docs(readme): 补充资源草稿导入和校验说明
- fix(resources): 补充 open-hardware 主题枚举，修复资源校验失败
- fix(sw): 更新缓存版本，确保新样式和脚本生效
```

---

# Commit Type（提交类型）

## feat

新增功能、新增资料、新增模块。

```bash
feat(balance): 添加双环 PID 控制
feat(ai): 新增 YOLO 巡线方案
feat(repo): 增加自动资料索引脚本
```

---

## fix

修复 Bug、错误链接、配置问题等。

```bash
fix(camera): 修复边界丢线问题
fix(docs): 修复 README 死链
fix(crawler): 修复 B站链接解析失败
```

---

## docs

文档修改、注释更新、README 更新。

```bash
docs(readme): 更新项目介绍
docs(balance): 添加轮腿组调试说明
docs(groups): 更新分组导航
```

---

## refactor

重构代码或目录结构，不新增功能、不修复 Bug。

```bash
refactor(groups): 重构组别目录结构
refactor(core): 拆分路径规划模块
refactor(repo): 调整资源分类方式
```

---

## perf

性能优化。

```bash
perf(control): 优化 EKF 更新速度
perf(path): 提升轨迹生成效率
```

---

## style

仅代码格式修改，不影响逻辑。

```bash
style(control): 统一代码缩进
style(repo): 格式化 JSON 文件
```

---

## test

测试相关。

```bash
test(balance): 添加轮腿控制测试
test(camera): 增加图像识别测试数据
```

---

## chore

杂项维护、依赖更新、脚本修改等。

```bash
chore(deps): 更新 Python 依赖
chore(gitignore): 增加缓存忽略规则
chore(ci): 更新 GitHub Actions
```

---

# Scope（作用域）

建议使用以下 Scope：

| Scope           | 含义     |
| --------------- | ------ |
| balance         | 平衡轮腿组  |
| camera          | 摄像头组   |
| electromagnetic | 电磁组    |
| ai              | AI 视觉组 |
| control         | 控制算法   |
| path            | 路径规划   |
| nav             | 导航定位   |
| docs            | 文档系统   |
| repo            | 仓库整体   |
| crawler         | 资料爬虫   |
| groups          | 分组目录   |
| readme          | README |
| ci              | CI/CD  |

---

# Subject 编写规范

## 推荐

* 使用简洁中文描述
* 使用动词开头
* 不加句号
* 一句话概括本次修改

推荐示例：

```bash
feat(balance): 添加速度前馈控制
fix(camera): 修复图像噪声误判
docs(ai): 更新部署教程
```

---

## 不推荐

```bash
update
修改
fix bug
123
test
```

---

# 多行 Commit Message（推荐）

复杂提交建议补充详细说明：

```bash
feat(balance): 添加轮腿组速度规划

- 新增 Pure Pursuit 速度规划
- 支持曲率动态限速
- 添加轨迹平滑处理
```

---

# Pull Request 规范

PR 标题建议与 Commit 格式一致：

```bash
feat(ai): 添加 OpenCV 巡线方案
```

PR 描述建议包含：

* 修改内容
* 测试结果
* 截图 / 视频
* 相关 Issue

---

# 自动化工具（推荐）

推荐配合以下工具使用：

* commitlint
* cz-git
* semantic-release
* husky
* lint-staged

---

# 推荐工作流

```bash
git checkout -b feat/balance-speed-planning

git add .
git commit -m "feat(balance): 添加速度规划模块"

git push origin feat/balance-speed-planning
```

---

# 为什么使用该规范

统一 Commit 规范可以带来：

* 更清晰的 Git 历史
* 自动生成 CHANGELOG
* 更方便 AI Agent 分析仓库
* 更适合多人协作
* 更规范的开源项目结构

---

# 参考

* Conventional Commits
* Angular Commit Convention
* Semantic Versioning
