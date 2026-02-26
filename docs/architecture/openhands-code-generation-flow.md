# OpenHands V0 代码生成执行流程详细分析报告

> **注意**: 本文档描述的是 **V0 (Legacy)** 架构。V1 架构文档见 `openhands-v1-code-generation-flow.md`。

## 一、整体架构概述

OpenHands V0 是一个**多Agent协同的AI软件工程师系统**,采用前后端分离架构:
- **前端**: React + TypeScript,负责UI交互和事件展示
- **后端**: Python (FastAPI),负责Agent控制、LLM调用、Action执行

---

## 二、前端架构

### 2.1 前端核心组件

| 组件 | 文件路径 | 作用 |
|------|----------|------|
| AgentStore | `frontend/src/stores/agent-store.ts` | 管理Agent状态 |
| AgentState | `frontend/src/types/agent-state.tsx` | Agent状态枚举 |
| ConversationWebSocketContext | `frontend/src/contexts/conversation-websocket-context.tsx` | WebSocket连接管理 |
| ConversationService | `frontend/src/api/conversation-service/conversation-service.api.ts` | HTTP API调用 |

### 2.2 Agent状态机

```typescript
enum AgentState {
  LOADING,    // 加载中
  INIT,       // 初始化
  RUNNING,    // 运行中
  AWAITING_USER_INPUT,  // 等待用户输入
  PAUSED,     // 暂停
  STOPPED,    // 停止
  FINISHED,   // 完成
  REJECTED,   // 拒绝
  ERROR,      // 错误
  RATE_LIMITED,      // 限速
  AWAITING_USER_CONFIRMATION,  // 等待用户确认
}
```

### 2.3 前端通信流程

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端 (React)                            │
├─────────────────────────────────────────────────────────────────┤
│  1. useStartConversation → POST /api/conversations/:id/start  │
│                              ↓                                  │
│  2. ConversationWebSocketProvider 建立 WebSocket 连接           │
│                              ↓                                  │
│  3. 接收后端事件 (Action/Observation)                           │
│                              ↓                                  │
│  4. 更新 EventStore → 触发 UI 渲染                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、后端架构

### 3.1 Agent类型 (agenthub/)

| Agent类 | 文件路径 | 职责 |
|---------|----------|------|
| **CodeActAgent** | `agenthub/codeact_agent/codeact_agent.py` | 主代码生成Agent |
| BrowsingAgent | `agenthub/browsing_agent/browsing_agent.py` | 网页浏览 |
| ReadOnlyAgent | `agenthub/readonly_agent/readonly_agent.py` | 只读操作 |
| LocAgent | `agenthub/loc_agent/loc_agent.py` | 代码定位 |
| VisualBrowsingAgent | `agenthub/visualbrowsing_agent/` | 视觉浏览 |
| DummyAgent | `agenthub/dummy_agent/` | 测试用 |

### 3.2 CodeActAgent 工具集

CodeActAgent 将所有操作统一为**代码执行**:

| 工具 | Action类 | 功能 |
|------|----------|------|
| Bash | `CmdRunAction` | 执行Linux命令 |
| Jupyter | `IPythonRunCellAction` | 执行Python代码 |
| Editor | `FileEditAction` / `FileReadAction` | 文件编辑/读取 |
| Browser | `BrowseInteractiveAction` | 浏览器交互 |
| Finish | `AgentFinishAction` | 完成任务 |
| Think | `AgentThinkAction` | 思考推理 |
| Delegate | `AgentDelegateAction` | 委托子Agent |
| TaskTracker | `TaskTrackingAction` | 任务跟踪 |

---

## 四、核心执行流程

### 4.1 完整调用链

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户请求                                        │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                     ConversationService.create/start                        │
│         (openhands/server/services/conversation_service.py)                │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                     ConversationManager.maybe_start_agent_loop             │
│         (openhands/server/conversation_manager/)                            │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                         AgentSession 初始化                                 │
│            (openhands/server/session/agent_session.py)                     │
│  - 创建 Runtime (Docker/Local/K8s)                                         │
│  - 创建 AgentController                                                     │
│  - 创建 EventStream                                                         │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                    WebSocket 连接建立 (前端↔后端)                           │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                     AgentController._step() 循环                            │
│         (openhands/controller/agent_controller.py)                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 1. agent.step(state) → 调用 CodeActAgent.step()                    │    │
│  │ 2. Agent 通过 LLM 获取响应                                          │    │
│  │ 3. response_to_actions() 转换为 Action 列表                        │    │
│  │ 4. Action 通过 EventStream 发送到 Runtime                           │    │
│  │ 5. Runtime 执行 Action                                             │    │
│  │ 6. 返回 Observation → 更新 State                                   │    │
│  │ 7. 循环直到完成                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                         Action 执行 (Runtime)                              │
│          (openhands/runtime/action_execution_server.py)                    │
│  - ActionExecutor 执行具体操作                                              │
│  - 返回 Observation (结果/错误)                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 AgentController 核心逻辑

```python
# openhands/controller/agent_controller.py

class AgentController:
    async def _step(self) -> None:
        # 1. 检查状态
        if self.get_agent_state() != AgentState.RUNNING:
            return
            
        # 2. 调用 Agent.step() 获取 Action
        action = self.agent.step(self.state)
        
        # 3. 安全分析 (可选)
        await self._handle_security_analyzer(action)
        
        # 4. 确认模式检查
        if self.confirmation_mode and action.runnable:
            action.confirmation_state = ActionConfirmationStatus.AWAITING_CONFIRMATION
            
        # 5. 通过 EventStream 发送 Action
        self.event_stream.add_event(action, action._source)
        
        # Runtime 执行后会返回 Observation
```

### 4.3 CodeActAgent.step() 核心逻辑

```python
# openhands/agenthub/codeact_agent/codeact_agent.py

class CodeActAgent(Agent):
    def step(self, state: State) -> 'Action':
        # 1. 压缩历史 (Condenser)
        condensed_history, forgotten_ids = self.condenser.condensed_history(state)
        
        # 2. 构建消息
        messages = self._get_messages(condensed_history, initial_user_message, forgotten_ids)
        
        # 3. 调用 LLM
        response = self.llm.completion(messages=messages, tools=self.tools)
        
        # 4. 解析为 Actions
        actions = self.response_to_actions(response)
        
        return actions[0]
```

### 4.4 Function Calling 映射

```python
# openhands/agenthub/codeact_agent/function_calling.py

def response_to_actions(response: ModelResponse) -> list[Action]:
    # LLM响应中的 tool_call → Action
    if tool_call.function.name == 'bash':
        action = CmdRunAction(command=arguments['command'])
    elif tool_call.function.name == 'ipython':
        action = IPythonRunCellAction(code=arguments['code'])
    elif tool_call.function.name == 'str_replace_editor':
        if command == 'view':
            action = FileReadAction(path=path)
        else:
            action = FileEditAction(path=path, command=command, ...)
    elif tool_call.function.name == 'finish':
        action = AgentFinishAction(...)
    # ... 更多映射
```

---

## 五、事件流系统 (EventStream)

### 5.1 事件类型

| 事件类型 | 基类 | 说明 |
|----------|------|------|
| Action | `openhands/events/action/action.py` | Agent执行的操作 |
| Observation | `openhands/events/observation/observation.py` | 操作结果 |
| MessageAction | `Action` | 用户/Agent消息 |

### 5.2 EventStream 订阅者

```python
# openhands/events/stream.py

class EventStreamSubscriber(Enum):
    AGENT_CONTROLLER = "AGENT_CONTROLLER"  # Agent控制器
    RUNTIME = "RUNTIME"                       # 运行时
    SERVER = "SERVER"                         # 服务器
    MEMORY = "MEMORY"                        # 记忆系统
```

### 5.3 数据流

```
Action (Agent生成)
    ↓ EventStream.add_event()
Runtime (执行Action)
    ↓
Observation (执行结果)
    ↓ EventStream.add_event()
AgentController (处理Observation)
    ↓
State (更新状态)
    ↓
LLM (下一轮对话)
```

---

## 六、记忆系统 (Memory)

### 6.1 组件

| 组件 | 文件 | 作用 |
|------|------|------|
| ConversationMemory | `memory/conversation_memory.py` | 对话历史管理 |
| Condenser | `memory/condenser/` | 历史压缩 |
| Memory | `memory/memory.py` | 记忆接口 |

### 6.2 压缩策略

当对话过长超出LLM上下文限制时:
1. **Condenser** 分析历史事件
2. 选择性遗忘不重要的事件
3. 可选: 生成摘要

---

## 七、Runtime 执行环境

### 7.1 Runtime 类型

| 类型 | 文件 | 特点 |
|------|------|------|
| DockerRuntime | `runtime/impl/docker/` | 容器隔离 |
| LocalRuntime | `runtime/impl/local/` | 本地执行 |
| KubernetesRuntime | `runtime/impl/kubernetes/` | K8s集群 |
| CLIRuntime | `runtime/impl/cli/` | 命令行 |

### 7.2 Action 执行流程

```
Action (from EventStream)
    ↓
ActionExecutor (action_execution_server.py)
    ↓
根据 Action 类型分发:
  - CmdRunAction → BashSession.execute()
  - IPythonRunCellAction → Jupyter 执行
  - FileEditAction → OHEditor
  - BrowseInteractiveAction → BrowserEnv
    ↓
返回 Observation
```

---

## 八、关键文件索引

### 后端核心

| 文件 | 类/函数 | 作用 |
|------|---------|------|
| `server/services/conversation_service.py` | `start_conversation()` | 启动会话 |
| `server/session/agent_session.py` | `AgentSession` | Agent会话管理 |
| `controller/agent_controller.py` | `AgentController` | 主控制器 |
| `controller/agent.py` | `Agent` (ABC) | Agent基类 |
| `agenthub/codeact_agent/codeact_agent.py` | `CodeActAgent` | 主代码Agent |
| `agenthub/codeact_agent/function_calling.py` | `response_to_actions()` | LLM响应→Action |
| `runtime/base.py` | `Runtime` | 运行时基类 |
| `runtime/action_execution_server.py` | `ActionExecutor` | Action执行器 |
| `events/stream.py` | `EventStream` | 事件流 |
| `llm/llm.py` | `LLM` | LLM调用封装 |

### 前端核心

| 文件 | 作用 |
|------|------|
| `stores/agent-store.ts` | Agent状态管理 |
| `contexts/conversation-websocket-context.tsx` | WebSocket连接 |
| `api/conversation-service/conversation-service.api.ts` | API调用 |
| `hooks/mutation/use-start-conversation.ts` | 启动会话 |
| `types/agent-state.tsx` | Agent状态定义 |

---

## 九、架构流程图

```
┌──────────────┐     HTTP POST      ┌──────────────────────────┐
│   前端       │ ─────────────────→ │   后端 ConversationAPI   │
│  (React)     │                    └───────────┬──────────────┘
└──────────────┘                                │
                                                ↓
┌──────────────┐     WebSocket      ┌──────────────────────────┐
│   前端       │ ←──────────────→ │   AgentController        │
│  (React)     │   事件流          │   ┌──────────────────┐    │
└──────────────┘                  │   │  CodeActAgent    │    │
                                   │   └────────┬────────┘    │
                    ┌───────────────┘            ↓             │
                    ↓                   ┌──────────────────┐  │
            ┌───────────────┐           │  LLM (GPT/...)   │  │
            │    Runtime    │           └────────┬─────────┘  │
            │ (Docker/Local)│                    ↓             │
            └───────┬───────┘           ┌──────────────────┐  │
                    ↓                   │ response_to_     │
            ┌───────────────┐           │ actions()        │
            │ActionExecutor │           └────────┬─────────┘  │
            │ - bash        │                    ↓             │
            │ - jupyter     │           ┌──────────────────┐  │
            │ - editor      │           │     Action       │──┼──┐
            │ - browser     │           └──────────────────┘  │  │
            └───────┬───────┘                               │  │
                    ↓                                       │  │
            ┌───────────────┐    EventStream                │  │
            │ Observation   │ ─────────────────────────────┘  │
            └───────────────┘                                  │
                                                              ↓
                                                        ┌──────────────┐
                                                        │  前端更新UI  │
                                                        └──────────────┘
```

---

## 十、总结

OpenHands 代码生成系统的核心是:

1. **AgentController**: 负责整体流程控制和事件循环
2. **CodeActAgent**: 主要执行Agent,统一动作空间为代码执行
3. **EventStream**: 连接Agent、Runtime、Memory的事件中枢
4. **Runtime**: 提供隔离的执行环境(Docker/Local)
5. **前端**: 通过WebSocket实时接收事件,展示Agent执行过程

系统采用**LLM驱动**的模式: Agent根据LLM响应生成Action,Runtime执行后返回Observation,形成闭环直到任务完成。

---

## 附录: V0 vs V1 说明

> **注意**: 当前代码库中存在大量标注为 `LEGACY V0 CODE` 的文件,这些是V0版本的实现,计划于2026年4月1日移除。V1版本将迁移到 Software Agent SDK。
>
> - V1 agentic core (SDK): https://github.com/OpenHands/software-agent-sdk
> - V1 application server: `openhands/app_server/`
