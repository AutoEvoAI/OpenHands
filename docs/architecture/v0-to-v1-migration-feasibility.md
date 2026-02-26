# V0 到 V1 迁移可行性评估报告

## 一、概述

本文档评估将 OpenHands 从 V0 架构完全迁移到 V1 (Software Agent SDK) 的可行性。

---

## 二、迁移任务跟踪列表

### 2.1 高优先级任务 (必须完成)

| # | 任务 | V0 实现 | V1 目标 | 状态 | 负责人 |
|---|------|---------|---------|------|--------|
| 1 | Jupyter 工具实现 | `runtime/plugins/jupyter/` | `software-agent-sdk/openhands-tools/` | ⬜ 待开始 |
| 2 | Skills 加载系统 | `runtime/plugins/agent_skills/` | `sdk/context/skills/` | ⬜ 待开始 |
| 3 | 安全分析器迁移 | `security/` | `sdk/security/` | ⬜ 待开始 |
| 4 | 后端 V1 SDK 集成 | `agenthub/`, `llm/`, `events/` | `software-agent-sdk/` | ⬜ 待开始 |
| 5 | API 路由适配 | `server/routes/` | `app_server/` | ⬜ 待开始 |

### 2.2 中优先级任务

| # | 任务 | V0 实现 | V1 目标 | 状态 | 负责人 |
|---|------|---------|---------|------|--------|
| 6 | Settings API 适配 | `server/routes/settings/` | `app_server/user/` | ⬜ 待开始 |
| 7 | Secrets API 适配 | `server/routes/secrets/` | `sdk/secret/` | ⬜ 待开始 |
| 8 | Git 操作 API | `server/routes/git/` | `agent_server/git_router/` | ⬜ 待开始 |
| 9 | 前端 Settings 适配 | `frontend/src/api/settings/` | V1 API | ⬜ 待开始 |
| 10 | 前端 Secrets 适配 | `frontend/src/api/secrets/` | V1 API | ⬜ 待开始 |

### 2.3 低优先级任务 (可选)

| # | 任务 | V0 实现 | V1 目标 | 状态 | 负责人 |
|---|------|---------|---------|------|--------|
| 11 | VSCode 集成 | `runtime/plugins/vscode/` | TBD | ⬜ 待开始 |
| 12 | Kubernetes Runtime | `runtime/impl/kubernetes/` | Roadmap | ⬜ 待开始 |
| 13 | LocAgent | `agenthub/loc_agent/` | TBD | ⬜ 待开始 |

### 2.4 清理任务 (V0 移除)

| # | 任务 | 状态 | 负责人 |
|---|------|------|--------|
| 14 | 移除 `server/` 目录 V0 代码 | ⬜ 待开始 | |
| 15 | 移除 `agenthub/` 目录 | ⬜ 待开始 | |
| 16 | 移除 `runtime/` 目录 | ⬜ 待开始 | |
| 17 | 移除 `controller/` 目录 | ⬜ 待开始 | |
| 18 | 移除 `llm/` 目录 | ⬜ 待开始 | |
| 19 | 移除 `events/` 目录 | ⬜ 待开始 | |
| 20 | 移除 `memory/` 目录 | ⬜ 待开始 | |
| 21 | 清理前端 V0 相关代码 | ⬜ 待开始 | |

---

## 三、V0 与 V1 功能对比

### 2.1 核心模块对比

| 功能模块 | V0 实现 | V1 实现 | 状态 |
|----------|---------|---------|------|
| **Agent 核心** | | | |
| Agent 基类 | `controller/agent.py` | `sdk/agent/base.py` | ✅ 等价 |
| CodeActAgent | `agenthub/codeact_agent/` | `sdk/agent/agent.py` | ✅ 等价 |
| BrowsingAgent | `agenthub/browsing_agent/` | `tools/browser_use/` | ✅ 等价 |
| ReadOnlyAgent | `agenthub/readonly_agent/` | N/A (功能合并) | ✅ |
| LocAgent | `agenthub/loc_agent/` | N/A | ⚠️ 需新增 |
| **LLM 调用** | | | |
| LLM 封装 | `llm/llm.py` | `sdk/llm/llm.py` | ✅ 更完善 |
| 模型注册 | `llm/llm_registry.py` | `sdk/llm/llm_registry.py` | ✅ 等价 |
| **事件系统** | | | |
| EventStream | `events/stream.py` | `sdk/event/` | ✅ 更完善 |
| Action/Observation | `events/action/`, `events/observation/` | `sdk/event/` | ✅ 更完善 |
| **工具系统** | | | |
| Terminal | `runtime/utils/bash.py` | `tools/terminal/` | ✅ 更完善 |
| File Editor | `runtime/plugins/file_editor/` | `tools/file_editor/` | ✅ 更完善 |
| Browser | `runtime/browser/` | `tools/browser_use/` | ✅ 更完善 |
| Jupyter | `runtime/plugins/jupyter/` | N/A | ⚠️ 需新增 |
| **运行时** | | | |
| Docker Runtime | `runtime/impl/docker/` | `workspace/` | ✅ 等价 |
| Local Runtime | `runtime/impl/local/` | `workspace/local/` | ✅ 等价 |
| Remote Runtime | `runtime/impl/remote/` | `workspace/remote/` | ✅ 等价 |
| **记忆系统** | | | |
| ConversationMemory | `memory/conversation_memory.py` | `sdk/conversation/` | ✅ 更完善 |
| Condenser | `memory/condenser/` | `sdk/event/condenser.py` | ✅ 等价 |

### 2.2 V1 独有功能 (V0 没有)

| 功能 | V1 位置 | 说明 |
|------|---------|------|
| Subagent 支持 | `sdk/subagent/` | 子 Agent 系统 |
| MCP 客户端 | `sdk/mcp/` | Model Context Protocol |
| 插件系统 | `sdk/plugin/` | 动态插件加载 |
| Skills 加载 | `sdk/context/skills/` | 技能动态加载 |
| Webhook | `sdk/hooks/` | 事件钩子 |
| Critic 评估 | `sdk/critic/` | Agent 输出评估 |
| 事件溯源 | `sdk/event/` | 完整持久化 |
| Cloud Workspace | `workspace/cloud/` | 云端存储 |

### 2.3 V0 独有功能 (V1 可能缺失)

| 功能 | V0 位置 | 优先级 | 迁移方案 |
|------|---------|--------|----------|
| VSCode 集成 | `runtime/plugins/vscode/` | 中 | 可选功能 |
| Jupyter 插件 | `runtime/plugins/jupyter/` | 高 | 需实现 |
| Kubernetes Runtime | `runtime/impl/kubernetes/` | 中 | 已在 V1 Roadmap |
| 安全分析器 | `security/` | 高 | 需迁移 |
| AgentSkills | `runtime/plugins/agent_skills/` | 高 | 核心功能，需支持动态扩展 |

---

## 三、API 对比

### 3.1 V0 API 端点

```
V0:
/api/conversations                    # CRUD
/api/conversations/{id}/start        # 启动
/api/conversations/{id}/stop         # 停止
/api/conversations/{id}/pause        # 暂停
/api/conversations/{id}/resume       # 恢复
/api/conversations/{id}/send         # 发送消息
/api/conversations/{id}/events       # 事件
/api/conversations/{id}/trajectory   # 轨迹
/api/conversations/{id}/files        # 文件
/api/settings                        # 设置
/api/secrets                         # 密钥
```

### 3.2 V1 API 端点

```
V1:
/api/v1/app-conversations            # CRUD
/api/v1/app-conversations/{id}/start-tasks  # 启动任务
/api/v1/app-conversations/{id}/pause        # 暂停
/api/v1/app-conversations/{id}/resume       # 恢复
/api/v1/events                       # 事件
/api/v1/sandbox                     # 沙箱
/api/v1/sandbox-spec               # 沙箱规格
```

### 3.3 API 差异分析

| 功能 | V0 | V1 | 迁移难度 |
|------|----|----|----------|
| 会话 CRUD | ✅ | ✅ | 低 |
| 启动/停止/暂停 | ✅ | ✅ | 低 |
| WebSocket 事件 | ✅ | ✅ | 低 |
| 文件上传/下载 | ✅ | ✅ | 低 |
| 设置管理 | ✅ | ⚠️ | 需适配 |
| 密钥管理 | ✅ | ⚠️ | 需适配 |
| VSCode 集成 | ✅ | ❌ | 可选 |

---

## 四、前端适配状态

### 4.1 前端 V1 适配文件

| 文件 | 功能 | 状态 |
|------|------|------|
| `hooks/use-create-conversation.ts` | 创建会话 | ✅ 已适配 |
| `hooks/use-start-conversation.ts` | 启动会话 | ✅ 已适配 |
| `hooks/use-v1-pause-conversation.ts` | 暂停 | ✅ 已适配 |
| `hooks/use-v1-resume-conversation.ts` | 恢复 | ✅ 已适配 |
| `hooks/use-v1-upload-files.ts` | 文件上传 | ✅ 已适配 |
| `hooks/use-stop-conversation.ts` | 停止 | ⚠️ 部分 |
| `contexts/conversation-websocket-context.tsx` | WebSocket | ✅ 已适配 |
| `stores/v1-conversation-state-store.ts` | 状态管理 | ✅ 已适配 |
| `types/v1/` | V1 类型定义 | ✅ 已完成 |

### 4.2 仍需适配的功能

| 功能 | 文件 | 优先级 |
|------|------|--------|
| Settings API | `api/settings/` | 中 |
| Secrets API | `api/secrets/` | 中 |
| VSCode URL | `api/vscode/` | 低 |
| Git 操作 | `api/git/` | 中 |

---

## 五、迁移工作量评估

### 5.1 后端迁移

| 模块 | 工作量 | 复杂度 |
|------|--------|--------|
| 移除 V0 代码 | 低 | 简单 |
| 集成 V1 SDK | 中 | 中等 |
| 适配 API 路由 | 中 | 中等 |
| 迁移 Settings | 低 | 简单 |
| 迁移 Secrets | 低 | 简单 |
| 实现 Jupyter 工具 | 中 | 中等 |
| 实现 VSCode (可选) | 高 | 复杂 |

### 5.2 前端迁移

| 模块 | 工作量 | 复杂度 |
|------|--------|--------|
| 移除 V0 API 调用 | 中 | 中等 |
| 完成 Settings 适配 | 低 | 简单 |
| 完成 Secrets 适配 | 低 | 简单 |
| 完成 Git 操作适配 | 中 | 中等 |
| 移除 V0 状态管理 | 中 | 中等 |

### 5.3 总工作量估算

| 阶段 | 时间估算 | 说明 |
|------|----------|------|
| 后端核心集成 | 1-2 周 | SDK 集成、API 适配 |
| 前端适配 | 1 周 | 完整 V1 支持 |
| 测试 | 1 周 | 集成测试 |
| Bug 修复 | 1-2 周 | 迁移问题 |

**总计: 4-6 周**

---

## 六、风险评估

### 6.1 高风险项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 功能缺失 | 可能影响用户 | 完整功能测试 |
| 性能问题 | 用户体验 | 性能基准测试 |
| 兼容性问题 | 历史会话 | 数据迁移方案 |

### 6.2 中风险项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Jupyter 工具缺失 | 部分用户 | 优先实现 |
| VSCode 集成 | 少数用户 | 后期实现或替代方案 |

---

## 七、迁移方案

### 7.1 渐进式迁移 (推荐)

```
Phase 1: 后端双轨运行 (2周)
├── 保持 V0 API 同时运行
├── 完成 V1 SDK 集成
└── 添加功能开关

Phase 2: 前端切换 (1周)
├── 默认启用 V1
├── 保留 V0 回退
└── 完整功能测试

Phase 3: 移除 V0 (1周)
├── 移除 V0 代码
├── 移除功能开关
└── 清理旧文件
```

### 7.2 直接迁移

```
├── 一次性替换 V0 为 V1
├── 完整测试
└── 部署
```

**风险较高，建议使用渐进式迁移**

---

## 八、结论

### 8.1 可行性评估

**总体评估: ✅ 可行**

| 维度 | 评估 |
|------|------|
| 功能完整性 | 95% (V1 超额完成) |
| API 兼容性 | 90% |
| 前端适配 | 85% |
| 迁移风险 | 中等 |
| 工作量 | 4-6 周 |

### 8.2 建议

1. **采用渐进式迁移**: 先双轨运行，再逐步切换
2. **优先实现 Jupyter 和 Skills**: 补充 V1 缺失的核心功能
3. **保留可选功能**: VSCode 等可选功能可后期实现
4. **完整测试**: 迁移前进行全面的功能测试

### 8.3 下一步行动

1. 创建详细的迁移计划
2. 实现 V1 缺失的 Jupyter 工具和 Skills 加载系统
3. 完成后端 V1 集成
4. 完成前端适配
5. 进行测试
6. 部署上线

---

## 附录: V1 完整功能列表

### V1 SDK (`openhands-sdk`)
- Agent (含 Critic 支持)
- LLM (含 Fallback、Streaming)
- Event (事件溯源)
- Tool (工具基类)
- Conversation (对话管理)
- MCP Client
- Plugin System
- Hooks System

### V1 Tools (`openhands-tools`)
- Terminal (终端)
- FileEditor (文件编辑)
- Browser (浏览器自动化)
- TaskTracker (任务跟踪)
- Glob (文件搜索)
- Grep (内容搜索)
- Delegate (Agent 委托)
- ApplyPatch (补丁应用)

### V1 Agent Server
- Conversation Service
- Event Router
- Tool Router
- Skills Service
- Git Service
- Desktop Service

### V1 Workspace
- LocalWorkspace
- RemoteWorkspace
- CloudWorkspace
