# 规范驱动多智能体协同开发平台 - 实现计划

> 基于 `autonomous-agent-optimize-init.md` 架构理念，复用 `openhands-v1-code-generation-flow.md` 现有组件

> **版本**: v1.1 (更新多模型可选、前端集成)

---

## 一、项目架构概览

### 1.1 代码组织关系

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         OpenHands 主项目                                │
│                         (openhands/ 目录)                              │
│                                                                         │
│   - 调用 openhands-sdk 作为核心依赖                                     │
│   - 提供 Web UI、API 服务、运行时环境                                   │
│   - 前端入口: frontend/ 目录                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓ 依赖
┌─────────────────────────────────────────────────────────────────────────┐
│                      software-agent-sdk 项目                            │
│                    (software-agent-sdk/ 目录)                          │
│                                                                         │
│   openhands-sdk/    - 核心 SDK (Agent, LLM, Tool, Event)              │
│   openhands-tools/  - 内置工具集                                        │
│   openhands-agent-server/ - Agent 服务器                               │
│   openhands-workspace/   - 工作空间实现                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓ 独立发布
                            PyPI: openhands-sdk
```

### 1.2 新增功能模块位置

| 模块 | 位置 | 说明 |
|------|------|------|
| 规范数据模型 | `openhands-sdk/openhands/sdk/spec/` | TLA+/Z 规范数据结构 |
| 任务图系统 | `openhands-sdk/openhands/sdk/task/` | DAG 任务图结构 |
| 战略层 Agent | `openhands-sdk/openhands/sdk/agent/supervisor.py` | SupervisorAgent, SpecAgent |
| 战术层 Agent | `openhands-sdk/openhands/sdk/agent/planner.py` | PlannerAgent, DynamicRoleAllocator |
| 微观层 Agent | `openhands-sdk/openhands/sdk/agent/codegen_pool.py` | CodeGenAgentPool, EvaluatorAgent, RepairAgent |
| 形式化验证工具 | `openhands-tools/openhands/tools/formal_verify/` | 形式化验证工具 |

---

## 二、实施计划 (12 周)

### Phase 1: 基础设施搭建 (Week 1-2)

#### 1.1 规范数据模型 (`sdk/spec/`)

**目标**: 定义形式化规范和任务图的数据结构

| 任务 | 文件 | 依赖 | 状态 |
|------|------|------|------|
| 创建 spec 模块目录 | `sdk/spec/__init__.py` | - | ⬜ |
| 定义 FormalSpec 模型 | `sdk/spec/models.py` | Pydantic | ⬜ |
| 定义 TaskGraph DAG 模型 | `sdk/spec/task_graph.py` | NetworkX | ⬜ |
| 定义 TaskNode 任务节点 | `sdk/spec/task_node.py` | - | ⬜ |
| 定义 AgentProfile 能力画像 | `sdk/spec/agent_profile.py` | - | ⬜ |

**关键代码结构**:
```python
# sdk/spec/models.py
from pydantic import BaseModel
from enum import Enum

class SpecType(str, Enum):
    TLA_PLUS = "tla+"
    Z_NOTATION = "z"

class FormalSpec(BaseModel):
    """形式化规范"""
    spec_type: SpecType
    content: str
    invariants: list[str]
    safety_properties: list[str]
    liveness_properties: list[str]
    version: str

# sdk/spec/task_graph.py
from typing import TypedDict
from networkx import DiGraph

class TaskGraph(DiGraph):
    """DAG 任务图"""

    def add_task(self, node: 'TaskNode') -> None: ...
    def get_ready_tasks(self) -> list[str]: ...
    def get_executable_tasks(self, completed: set[str]) -> list[str]: ...
```

#### 1.2 扩展 AgentRegistry 能力画像

**目标**: 扩展现有 Subagent Registry 支持动态能力匹配

| 任务 | 文件 | 依赖 | 状态 |
|------|------|------|------|
| 扩展 AgentDefinition | `sdk/subagent/schema.py` | 现有 schema | ⬜ |
| 添加能力画像存储 | `sdk/subagent/registry.py` | 现有 registry | ⬜ |
| 添加向量相似度匹配 | `sdk/subagent/matcher.py` | NumPy | ⬜ |

---

### Phase 2: L1 战略层实现 (Week 3-4)

#### 2.1 SupervisorAgent

**目标**: 实现需求解析、全局状态机管理、异常决策

| 任务 | 文件 | 依赖 | 状态 |
|------|------|------|------|
| 创建 SupervisorAgent 类 | `sdk/agent/supervisor.py` | Agent 基类 | ⬜ |
| 实现需求解析器 | `sdk/agent/supervisor/parser.py` | LLM | ⬜ |
| 实现状态机管理 | `sdk/agent/supervisor/state_machine.py` | - | ⬜ |
| 实现决策引擎 | `sdk/agent/supervisor/decision_engine.py` | Rule Engine | ⬜ |

**关键代码结构**:
```python
# sdk/agent/supervisor.py
from openhands.sdk import Agent
from openhands.sdk.spec import FormalSpec

class SupervisorAgent(Agent):
    """战略层 Agent - 需求解析与全局协调"""

    async def run(self, conversation, user_message: str):
        # 1. 解析用户需求
        requirements = await self._parse_requirements(user_message)

        # 2. 生成形式化规范
        spec = await self._generate_spec(requirements)

        # 3. 协调下层执行
        result = await self._coordinate(spec)

        return result
```

#### 2.2 SpecAgent

**目标**: 实现形式化规范生成

| 任务 | 文件 | 依赖 | 状态 |
|------|------|------|------|
| 创建 SpecAgent 类 | `sdk/agent/spec_gen.py` | Agent 基类 | ⬜ |
| 实现 TLA+ 模板 | `sdk/agent/spec_gen/templates/tla_plus.j2` | Jinja2 | ⬜ |
| 实现规范验证器 | `sdk/agent/spec_gen/validator.py` | - | ⬜ |

---

### Phase 3: L2 战术层实现 (Week 5-6)

#### 3.1 PlannerAgent

**目标**: 基于规范生成 DAG 任务流

| 任务 | 文件 | 依赖 | 状态 |
|------|------|------|------|
| 创建 PlannerAgent 类 | `sdk/agent/planner.py` | Planning preset | ⬜ |
| 实现任务分解逻辑 | `sdk/agent/planner/decomposer.py` | - | ⬜ |
| 实现 DAG 生成器 | `sdk/agent/planner/dag_builder.py` | NetworkX | ⬜ |
| 实现依赖分析器 | `sdk/agent/planner/dependency_analyzer.py` | - | ⬜ |

#### 3.2 DynamicRoleAllocator

**目标**: 动态分配 Agent 角色

| 任务 | 文件 | 依赖 | 状态 |
|------|------|------|------|
| 创建 Allocator 类 | `sdk/agent/allocator.py` | AgentRegistry | ⬜ |
| 实现向量匹配算法 | `sdk/agent/allocator/matcher.py` | NumPy | ⬜ |
| 实现负载均衡器 | `sdk/agent/allocator/load_balancer.py` | - | ⬜ |

**关键代码结构**:
```python
# sdk/agent/allocator.py
from openhands.sdk.subagent import AgentRegistry
from openhands.sdk.spec import TaskGraph, AgentProfile

class DynamicRoleAllocator:
    """动态角色分配器"""

    def __init__(self, registry: AgentRegistry):
        self.registry = registry

    async def allocate(
        self,
        task: 'TaskNode',
        profiles: list[AgentProfile]
    ) -> AgentProfile:
        """根据任务特征匹配最佳 Agent"""

        # 1. 向量化任务描述
        task_embedding = await self._embed_task(task)

        # 2. 计算相似度
        scores = self._compute_similarity(task_embedding, profiles)

        # 3. 选择最优 Agent
        return self._select_best(scores, profiles)
```

---

### Phase 4: L3 微观层实现 (Week 7-9)

> **注意**: 多模型并行代码生成改为**可选功能**，默认使用单模型

#### 4.1 CodeGenAgentPool (单模型默认，可选多模型)

**目标**: 代码生成 - 默认单模型，可选多模型并行

| 任务 | 文件 | 依赖 | 状态 |
|------|------|------|------|
| 创建 CodeGenAgentPool 类 | `sdk/agent/codegen_pool.py` | Agent | ⬜ |
| 实现单模型生成器 (默认) | `sdk/agent/codegen_pool/generator.py` | LLM | ⬜ |
| 实现多模型路由器 (可选) | `sdk/agent/codegen_pool/router.py` | LiteLLM | ⬜ |
| 实现并行执行器 (可选) | `sdk/agent/codegen_pool/executor.py` | asyncio | ⬜ |
| 添加配置项 enable_multi_model | `sdk/agent/codegen_pool/config.py` | - | ⬜ |

**配置选项**:
```python
# 默认配置 - 单模型
class CodeGenConfig:
    enable_multi_model: bool = False  # 默认单模型
    model_candidates: list[str] = ["claude-sonnet-4-20250514"]  # 默认模型

# 可选配置 - 多模型
class CodeGenConfig:
    enable_multi_model: bool = True  # 启用多模型
    model_candidates: list[str] = [
        "gpt-4o",
        "claude-sonnet-4-20250514",
        "gemini-2.5-pro"
    ]
```

#### 4.2 FormalVerifier

**目标**: 形式化验证工具

| 任务 | 文件 | 依赖 | 状态 |
|------|------|------|------|
| 创建验证工具定义 | `tools/formal_verify/definition.py` | ToolDefinition | ⬜ |
| 实现 TLC 集成 | `tools/formal_verify/tlc_adapter.py` | subprocess | ⬜ |
| 实现 Apalache 集成 | `tools/formal_verify/apalache_adapter.py` | subprocess | ⬜ |
| 实现反例解析器 | `tools/formal_verify/counter_example.py` | - | ⬜ |

#### 4.3 EvaluatorAgent

**目标**: 多维评分与排序

| 任务 | 文件 | 依赖 | 状态 |
|------|------|------|------|
| 创建 EvaluatorAgent 类 | `sdk/agent/evaluator.py` | CriticMixin | ⬜ |
| 实现评分维度定义 | `sdk/agent/evaluator/metrics.py` | - | ⬜ |
| 实现加权排序算法 | `sdk/agent/evaluator/ranker.py` | - | ⬜ |

#### 4.4 RepairAgent

**目标**: 基于反馈的迭代修复

| 任务 | 文件 | 依赖 | 状态 |
|------|------|------|------|
| 创建 RepairAgent 类 | `sdk/agent/repair.py` | Agent | ⬜ |
| 实现反馈解析器 | `sdk/agent/repair/feedback_parser.py` | - | ⬜ |
| 实现修复策略 | `sdk/agent/repair/strategy.py` | - | ⬜ |

---

### Phase 5: 集成与测试 (Week 10-12)

#### 5.1 端到端集成

| 任务 | 文件 | 依赖 | 状态 |
|------|------|------|------|
| 创建主工作流编排器 | `sdk/workflow/orchestrator.py` | 所有 Agent | ⬜ |
| 集成 OpenHands 主项目 | `openhands/app_server/` | openhands-sdk | ⬜ |
| 添加配置项 | `openhands/server/config/` | - | ⬜ |

#### 5.2 测试

| 任务 | 文件 | 依赖 | 状态 |
|------|------|------|------|
| 单元测试 - Agent | `tests/sdk/agent/` | pytest | ⬜ |
| 单元测试 - Tools | `tests/tools/formal_verify/` | pytest | ⬜ |
| 集成测试 - Workflow | `tests/integration/workflow/` | pytest | ⬜ |
| E2E 测试 | `tests/e2e/spec_driven/` | - | ⬜ |

#### 5.3 文档

| 任务 | 文件 | 状态 |
|------|------|------|
| API 文档 | `docs/api/` | ⬜ |
| 使用示例 | `examples/spec_driven/` | ⬜ |
| 部署指南 | `docs/deployment.md` | ⬜ |

---

## 三、文件清单

### 3.1 新增文件 (software-agent-sdk/)

```
openhands-sdk/openhands/sdk/
├── spec/
│   ├── __init__.py
│   ├── models.py              # FormalSpec
│   ├── task_graph.py         # TaskGraph DAG
│   ├── task_node.py          # TaskNode
│   └── agent_profile.py      # AgentProfile
│
├── agent/
│   ├── supervisor.py         # SupervisorAgent
│   ├── spec_gen.py           # SpecAgent
│   ├── planner.py           # PlannerAgent
│   ├── allocator.py         # DynamicRoleAllocator
│   ├── codegen_pool.py      # CodeGenAgentPool
│   ├── evaluator.py         # EvaluatorAgent
│   └── repair.py            # RepairAgent
│
└── workflow/
    ├── __init__.py
    └── orchestrator.py       # 主工作流编排器

openhands-tools/openhands/tools/
└── formal_verify/
    ├── __init__.py
    ├── definition.py         # 工具定义
    ├── impl.py              # 执行实现
    ├── tlc_adapter.py       # TLC 集成
    ├── apalache_adapter.py # Apalache 集成
    └── templates/           # 规范模板
```

### 3.2 修改文件 (software-agent-sdk/)

| 文件 | 修改内容 |
|------|----------|
| `sdk/subagent/schema.py` | 扩展 AgentDefinition |
| `sdk/subagent/registry.py` | 添加能力画像存储 |
| `sdk/__init__.py` | 导出新 Agent 类 |
| `tools/__init__.py` | 注册 FormalVerify 工具 |
| `pyproject.toml` | 添加依赖 (networkx, etc.) |

### 3.3 集成文件 (openhands/)

| 文件 | 修改内容 |
|------|----------|
| `app_server/app_conversation/app_conversation_service_base.py` | 集成新 Agent |
| `server/config/settings.py` | 添加新配置项 |
| `pyproject.toml` | 更新 openhands-sdk 依赖 |

---

## 四、依赖关系

```
核心依赖:
├── pydantic >= 2.0
├── networkx >= 3.0          # DAG 支持
├── litellm >= 1.0           # 多模型路由
└── jinja2 >= 3.0            # 模板渲染

可选依赖:
├── tlaplus-tools            # TLC 模型检查器
├── apalache                # Apalache 验证器
└── numpy                   # 向量计算
```

---

## 五、数据流设计

```
User Request
    │
    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ L1: SupervisorAgent                                                  │
│  1. _parse_requirements() → Requirements                            │
│  2. _generate_spec() → FormalSpec (TLA+)                            │
│  3. _coordinate() → 执行任务                                         │
└──────────────────────────────────────────────────────────────────────┘
    │ FormalSpec
    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ L2: PlannerAgent                                                     │
│  1. decompose_spec() → 子任务列表                                    │
│  2. build_dag() → TaskGraph                                          │
│  3. → DynamicRoleAllocator                                          │
└──────────────────────────────────────────────────────────────────────┘
    │ TaskGraph + AgentProfiles
    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ L2: DynamicRoleAllocator                                            │
│  1. match_agents() → 最优 Agent 分配                                  │
│  → 发送到 L3                                                          │
└──────────────────────────────────────────────────────────────────────┘
    │ Task + Agent
    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ L3: CodeGenAgentPool (并行 N 个模型)                                 │
│  1. generate() → [Candidate1, Candidate2, ..., CandidateN]            │
└──────────────────────────────────────────────────────────────────────┘
    │ Candidates
    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ L3: FormalVerifier                                                   │
│  1. verify(candidate) → Pass/Fail + 轨迹                            │
│  2. filter() → 合规候选列表                                          │
└──────────────────────────────────────────────────────────────────────┘
    │ Validated Candidates
    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ L3: EvaluatorAgent                                                   │
│  1. score(candidates) → 评分                                        │
│  2. rank() → 最优候选                                                │
└──────────────────────────────────────────────────────────────────────┘
    │ Best Candidate
    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ L3: RepairAgent (可选 - 如果验证失败)                                 │
│  1. parse_feedback() → 修复指令                                      │
│  2. fix() → 修复代码                                                  │
│  3. → 返回 FormalVerifier (循环)                                    │
└──────────────────────────────────────────────────────────────────────┘
    │
    ▼
Result → SupervisorAgent → User
```

---

## 六、前端集成方案 (Frontend Integration)

### 6.1 设计原则

- **不影响现有流程**: 新增 "spec" 模式作为第三个选项，不修改现有 "code" 和 "plan" 逻辑
- **渐进式启用**: 通过 feature flag 控制，用户需显式启用
- **独立入口**: 新建专用 UI 组件，与现有 chat 组件解耦

### 6.2 新增 Agent Type

| 前端值 | 后端值 | 说明 |
|--------|--------|------|
| `"code"` | `AgentType.DEFAULT` | 默认执行模式 (现有) |
| `"plan"` | `AgentType.PLAN` | 计划模式 (现有) |
| **`"spec"`** | **`AgentType.SPEC_DRIVEN`** | **规范驱动多智能体模式 (新增)** |

### 6.3 前端修改清单

#### 6.3.1 类型定义 (`frontend/src/`)

| 文件 | 修改内容 |
|------|----------|
| `stores/conversation-store.ts` | 添加 `"spec"` 到 `ConversationMode` 类型 |
| `types/agent-type.ts` (新建) | 统一 Agent 类型定义 |
| `api/conversation-service/v1-conversation-service.types.ts` | 添加 `agent_type: "spec"` |

#### 6.3.2 状态管理 (`stores/conversation-store.ts`)

```typescript
// 修改前
export type ConversationMode = "code" | "plan";

// 修改后
export type ConversationMode = "code" | "plan" | "spec";
```

#### 6.3.3 API 层 (`api/`)

| 文件 | 修改内容 |
|------|----------|
| `conversation-service/v1-conversation-service.api.ts` | 添加 `agent_type: "spec"` |
| `conversation-service/v1-conversation-service.types.ts` | 添加 `V1AgentType.SPEC_DRIVEN` |

#### 6.3.4 组件层 (`components/features/chat/`)

| 文件 | 说明 |
|------|------|
| `change-agent-button.tsx` | 添加 "spec" 模式按钮 |
| `change-agent-context-menu.tsx` | 添加 "spec" 模式菜单项 |
| `spec-agent-panel.tsx` (新建) | 规范驱动模式专用面板 |

#### 6.3.5 Hooks 层 (`hooks/`)

| 文件 | 修改内容 |
|------|----------|
| `use-handle-spec-click.ts` (新建) | 处理 spec 模式点击 |
| `use-create-conversation.ts` | 支持 `agentType: "spec"` |

#### 6.3.6 国际化 (`i18n/`)

| 文件 | 修改内容 |
|------|----------|
| `translation.json` | 添加 spec 模式相关文案 |

### 6.4 后端修改清单

#### 6.4.1 Agent Type 枚举 (`openhands/app_server/`)

```python
# app_server/app_conversation/app_conversation_models.py

class AgentType(Enum):
    """Agent type for conversation."""

    DEFAULT = 'default'
    PLAN = 'plan'
    SPEC_DRIVEN = 'spec'  # 新增
```

#### 6.4.2 Agent 创建逻辑 (`app_conversation_service_base.py`)

```python
# 添加 SPEC_DRIVEN 处理逻辑
if agent_type == AgentType.SPEC_DRIVEN:
    # 使用规范驱动多智能体 Agent
    agent = create_spec_driven_agent(...)
```

### 6.5 Feature Flag 控制

```typescript
// frontend/src/utils/feature-flags.ts
export const USE_SPEC_DRIVEN_AGENT = createFeatureFlag({
  name: 'USE_SPEC_DRIVEN_AGENT',
  defaultValue: false,
  description: 'Enable spec-driven multi-agent workflow',
});
```

### 6.6 UI 交互流程

```
用户点击 ChangeAgentButton
    │
    ├── 选择 "Code" → conversationMode = "code" → 现有流程
    │
    ├── 选择 "Plan" → conversationMode = "plan" → 现有流程
    │
    └── 选择 "Spec-Driven" → conversationMode = "spec" → 新流程
                                                      │
                                                      ▼
                                              显示 SpecAgentPanel
                                              (规范生成进度)
                                                      │
                                                      ▼
                                              显示 PlannerPanel
                                              (任务分解进度)
                                                      │
                                                      ▼
                                              显示 ExecutionPanel
                                              (执行进度)
```

### 6.7 组件隔离

为确保不影响现有流程:

1. **独立组件**: `SpecAgentPanel` 等新组件独立渲染，不修改现有 `Chat` 组件
2. **条件渲染**: 通过 `conversationMode === "spec"` 控制显示
3. **样式隔离**: 使用独立 CSS 类名，避免样式污染
4. **状态隔离**: 使用独立的 store slice 管理 spec 模式状态

### 6.8 集成文件清单

#### 前端新增文件
```
frontend/src/
├── types/
│   └── agent-type.ts              # Agent 类型定义
├── hooks/
│   └── use-handle-spec-click.ts  # Spec 模式处理
├── components/features/chat/
│   └── spec-agent-panel.tsx      # Spec 模式面板
```

#### 前端修改文件
```
frontend/src/
├── stores/conversation-store.ts                # 添加 "spec"
├── api/conversation-service/v1-conversation-service.api.ts
├── api/conversation-service/v1-conversation-service.types.ts
├── components/features/chat/change-agent-button.tsx
├── components/features/chat/change-agent-context-menu.tsx
├── hooks/use-create-conversation.ts
├── i18n/translation.json
└── utils/feature-flags.ts
```

#### 后端修改文件
```
openhands/
├── app_server/app_conversation/
│   ├── app_conversation_models.py    # 添加 AgentType.SPEC_DRIVEN
│   └── app_conversation_service_base.py  # 添加 SPEC_DRIVEN 处理
```

---

## 七、里程碑检查点

| 周次 | 里程碑 | 交付物 |
|------|--------|--------|
| Week 2 | Phase 1 完成 | `sdk/spec/` 模块可导入 |
| Week 4 | Phase 2 完成 | SupervisorAgent + SpecAgent 可运行 |
| Week 6 | Phase 3 完成 | PlannerAgent + Allocator 可运行 |
| Week 9 | Phase 4 完成 | 完整 L3 组件可运行 |
| Week 12 | Phase 5 完成 | E2E 测试通过 |

---

## 八、技术风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 形式化验证复杂度 | 高 | Phase 4 预留 3 周，先实现简化版 |
| 多模型并行成本 | 中 | 实现智能路由，按需调用 |
| 动态调度性能 | 中 | 使用缓存 + 异步处理 |
| 规范生成质量 | 中 | 使用 LLM 迭代优化 |

---

## 九、发布计划

| 版本 | 时间 | 内容 |
|------|------|------|
| vs-0.1.0 | Week 4 | 基础 Agent 框架 (L1+L2) |
| vs-0.2.0 | Week 9 | 完整功能 (L1+L2+L3) |
| vs-0.3.0 | Week 12 | 稳定版 + 文档 |
| vs-1.0.0 | TBD | 生产就绪 |

---

## 十、相关文档

- 架构设计: `docs/architecture/autonomous-agent-optimize-init.md`
- V1 代码生成流程: `docs/architecture/openhands-v1-code-generation-flow.md`
- SDK 文档: `https://docs.openhands.ai/sdk`
